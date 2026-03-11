from dataclasses import dataclass
from datetime import datetime, timezone
from html import unescape
import json
from pathlib import Path
import re

import httpx

from app.core.config import settings
from app.core.status_mapping import MONDAY_STATUS_MAP, map_external_status


@dataclass
class MondayItem:
    item_id: str
    url: str | None
    status: str
    description: str
    description_html: str | None


@dataclass
class MondayAsset:
    id: str
    name: str
    url: str | None
    thumbnail_url: str | None
    is_image: bool


@dataclass
class MondayUpdate:
    id: str
    body: str
    body_html: str | None
    created_at: datetime
    assets: list[MondayAsset]


class MondayAdapter:
    item_url_pattern = re.compile(r"/pulses/(?P<item_id>\d+)")
    portal_update_prefix = "[Portal]"

    def _headers(self) -> dict[str, str]:
        return {"Authorization": settings.monday_api_token or ""}

    def parse_item_reference(self, item_id: str | None = None, item_url: str | None = None) -> tuple[str, str | None]:
        normalized_id = (item_id or "").strip()
        normalized_url = (item_url or "").strip() or None
        if normalized_id and normalized_id.isdigit():
            return normalized_id, normalized_url
        source = normalized_url or normalized_id
        match = self.item_url_pattern.search(source or "")
        if match:
            return match.group("item_id"), normalized_url or source
        raise ValueError("A valid Monday item ID or item URL is required")

    def _text_from_html(self, value: str | None) -> str:
        if not value:
            return ""
        stripped = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
        stripped = re.sub(r"</p\s*>", "\n", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"<[^>]+>", "", stripped)
        return unescape(stripped).strip()

    def _description_from_columns(self, item_name: str, columns: list[dict]) -> tuple[str, str]:
        lines = [f"Item: {item_name}"]
        html_lines = [f"<p><strong>Item:</strong> {item_name}</p>"]
        allowed_titles = {
            "Traffic Type",
            "Traffic Mix",
            "Ad Creative Types",
            "Verification Tools",
            "Date",
            "Additional Notes",
        }
        for column in columns:
            title = ((column.get("column") or {}).get("title") or "").strip()
            text = (column.get("text") or "").strip()
            if not title or not text:
                continue
            if title not in allowed_titles:
                continue
            lines.append(f"{title}: {text}")
            html_lines.append(f"<p><strong>{title}:</strong> {text}</p>")
        return "\n".join(lines), "".join(html_lines)

    def _format_update_html(self, body_html: str | None, assets: list[MondayAsset]) -> str | None:
        parts: list[str] = []
        if body_html and body_html.strip():
            parts.append(body_html)
        elif assets:
            parts.append("<p></p>")
        for asset in assets:
            asset_url = asset.url or asset.thumbnail_url
            if not asset_url:
                continue
            if asset.is_image:
                parts.append(f'<p><img src="{asset_url}" alt="{asset.name}" style="max-width: 100%; border-radius: 12px;" /></p>')
            parts.append(f'<p><a href="{asset_url}" target="_blank" rel="noreferrer">{asset.name}</a></p>')
        return "".join(parts) or None

    def _first_asset(self, assets: list[MondayAsset]) -> MondayAsset | None:
        return next((asset for asset in assets if asset.url or asset.thumbnail_url), None)

    def fetch_item(self, item_id: str, item_url: str | None = None) -> MondayItem:
        if settings.use_mock_integrations:
            return MondayItem(
                item_id=item_id,
                url=item_url or f"https://monday.example.com/boards/mock/pulses/{item_id}",
                status="Working on it",
                description="Compliance package request, approvals, and outstanding files.",
                description_html="<p>Compliance package request, approvals, and outstanding files.</p>",
            )

        query = {
            "query": """
            query ($itemId: [ID!]) {
              items(ids: $itemId) {
                id
                name
                url
                column_values {
                  id
                  text
                  type
                  column { title }
                }
              }
            }
            """,
            "variables": {"itemId": [item_id]},
        }
        with httpx.Client(base_url="https://api.monday.com/v2", headers=self._headers(), timeout=20.0) as client:
            response = client.post("", json=query)
            response.raise_for_status()
            payload = response.json()["data"]["items"][0]
        status_column = next(
            (col for col in payload["column_values"] if ((col.get("column") or {}).get("title") or "").strip().lower() == "status"),
            None,
        )
        status_text = (status_column or {}).get("text") or "Not Started"
        description, description_html = self._description_from_columns(payload.get("name") or item_id, payload["column_values"])
        return MondayItem(
            item_id=item_id,
            url=item_url or payload.get("url"),
            status=status_text,
            description=description,
            description_html=description_html,
        )

    def fetch_updates(self, item_id: str) -> list[MondayUpdate]:
        if settings.use_mock_integrations:
            now = datetime.now(timezone.utc)
            return [
                MondayUpdate(
                    id=f"{item_id}-1",
                    body="Compliance team requested the latest business registration document.",
                    body_html="<p>Compliance team requested the latest business registration document.</p>",
                    created_at=now,
                    assets=[],
                ),
                MondayUpdate(
                    id=f"{item_id}-2",
                    body="Publisher uploaded an updated W-8BEN file.",
                    body_html="<p>Publisher uploaded an updated W-8BEN file.</p>",
                    created_at=now,
                    assets=[],
                ),
            ]

        query = {
            "query": """
            query ($itemId: [ID!]) {
              items(ids: $itemId) {
                updates {
                  id
                  body
                  created_at
                  assets {
                    id
                    name
                    public_url
                    url
                    url_thumbnail
                    file_extension
                  }
                }
              }
            }
            """,
            "variables": {"itemId": [item_id]},
        }
        with httpx.Client(base_url="https://api.monday.com/v2", headers=self._headers(), timeout=20.0) as client:
            response = client.post("", json=query)
            response.raise_for_status()
            payload = response.json()["data"]["items"][0]["updates"]
        updates: list[MondayUpdate] = []
        for update in payload:
            assets = [
                MondayAsset(
                    id=str(asset["id"]),
                    name=asset["name"],
                    url=asset.get("public_url") or asset.get("url"),
                    thumbnail_url=asset.get("url_thumbnail"),
                    is_image=(asset.get("file_extension") or "").lower() in {"png", "jpg", "jpeg", "gif", "webp", "svg"},
                )
                for asset in (update.get("assets") or [])
            ]
            body_html = update.get("body")
            updates.append(
                MondayUpdate(
                    id=str(update["id"]),
                    body=self._text_from_html(body_html),
                    body_html=self._format_update_html(body_html, assets),
                    created_at=datetime.fromisoformat(update["created_at"].replace("Z", "+00:00")),
                    assets=assets,
                )
            )
        updates.sort(key=lambda update: update.created_at)
        return updates

    def push_update(self, item_id: str, body: str) -> str:
        monday_body = f"{self.portal_update_prefix} {body}"
        if settings.use_mock_integrations:
            return f"{item_id}-portal"

        mutation = {
            "query": """
            mutation ($itemId: ID!, $body: String!) {
              create_update(item_id: $itemId, body: $body) { id }
            }
            """,
            "variables": {"itemId": item_id, "body": monday_body},
        }
        with httpx.Client(base_url="https://api.monday.com/v2", headers=self._headers(), timeout=20.0) as client:
            response = client.post("", json=mutation)
            response.raise_for_status()
            return str(response.json()["data"]["create_update"]["id"])

    def upload_file(self, item_id: str, file_path: str, note: str) -> str:
        if settings.use_mock_integrations:
            return f"{item_id}-{Path(file_path).name}"

        update_id = self.push_update(item_id, note)
        query = """
        mutation ($updateId: ID!, $file: File!) {
          add_file_to_update(update_id: $updateId, file: $file) { id }
        }
        """
        variables = {"updateId": update_id, "file": None}
        with open(file_path, "rb") as upload_handle:
            files = {
                "query": (None, query),
                "variables": (None, json.dumps(variables), "application/json"),
                "map": (None, '{"file":"variables.file"}', "application/json"),
                "file": (Path(file_path).name, upload_handle, "application/octet-stream"),
            }
            with httpx.Client(
                base_url="https://api.monday.com/v2/file",
                headers=self._headers(),
                timeout=60.0,
            ) as client:
                response = client.post("", files=files)
                response.raise_for_status()
        return update_id

    def map_status(self, status: str | None) -> str:
        return map_external_status(status, MONDAY_STATUS_MAP)
