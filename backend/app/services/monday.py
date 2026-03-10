from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.core.status_mapping import MONDAY_STATUS_MAP, map_external_status


@dataclass
class MondayItem:
    item_id: str
    url: str | None
    status: str
    description: str


@dataclass
class MondayUpdate:
    id: str
    body: str
    created_at: datetime


class MondayAdapter:
    def fetch_item(self, item_id: str, item_url: str | None = None) -> MondayItem:
        if settings.use_mock_integrations:
            return MondayItem(
                item_id=item_id,
                url=item_url or f"https://monday.example.com/boards/mock/pulses/{item_id}",
                status="Working on it",
                description="Compliance package request, approvals, and outstanding files.",
            )

        query = {
            "query": """
            query ($itemId: [ID!]) {
              items(ids: $itemId) {
                id
                url
                updates(limit: 1) { body }
                column_values { id text }
              }
            }
            """,
            "variables": {"itemId": [item_id]},
        }
        headers = {"Authorization": settings.monday_api_token or ""}
        with httpx.Client(base_url="https://api.monday.com/v2", headers=headers, timeout=20.0) as client:
            response = client.post("", json=query)
            response.raise_for_status()
            payload = response.json()["data"]["items"][0]
        status_text = next((col["text"] for col in payload["column_values"] if col["id"] == "status"), "Not Started")
        description = payload.get("updates", [{}])[0].get("body", "")
        return MondayItem(item_id=item_id, url=item_url or payload.get("url"), status=status_text, description=description)

    def fetch_updates(self, item_id: str) -> list[MondayUpdate]:
        if settings.use_mock_integrations:
            now = datetime.now(timezone.utc)
            return [
                MondayUpdate(
                    id=f"{item_id}-1",
                    body="Compliance team requested the latest business registration document.",
                    created_at=now,
                ),
                MondayUpdate(
                    id=f"{item_id}-2",
                    body="Publisher uploaded an updated W-8BEN file.",
                    created_at=now,
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
                }
              }
            }
            """,
            "variables": {"itemId": [item_id]},
        }
        headers = {"Authorization": settings.monday_api_token or ""}
        with httpx.Client(base_url="https://api.monday.com/v2", headers=headers, timeout=20.0) as client:
            response = client.post("", json=query)
            response.raise_for_status()
            payload = response.json()["data"]["items"][0]["updates"]
        return [
            MondayUpdate(
                id=str(update["id"]),
                body=update["body"],
                created_at=datetime.fromisoformat(update["created_at"].replace("Z", "+00:00")),
            )
            for update in payload
        ]

    def push_update(self, item_id: str, body: str) -> str:
        if settings.use_mock_integrations:
            return f"{item_id}-portal"

        mutation = {
            "query": """
            mutation ($itemId: ID!, $body: String!) {
              create_update(item_id: $itemId, body: $body) { id }
            }
            """,
            "variables": {"itemId": item_id, "body": body},
        }
        headers = {"Authorization": settings.monday_api_token or ""}
        with httpx.Client(base_url="https://api.monday.com/v2", headers=headers, timeout=20.0) as client:
            response = client.post("", json=mutation)
            response.raise_for_status()
            return str(response.json()["data"]["create_update"]["id"])

    def upload_file(self, item_id: str, file_name: str) -> str:
        if settings.use_mock_integrations:
            return f"{item_id}-{file_name}"
        return file_name

    def map_status(self, status: str | None) -> str:
        return map_external_status(status, MONDAY_STATUS_MAP)
