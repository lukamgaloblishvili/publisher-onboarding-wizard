from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape

import httpx

from app.core.config import settings
from app.core.status_mapping import JIRA_STATUS_MAP, map_external_status


@dataclass
class JiraTicket:
    key: str
    url: str | None
    status: str
    description: str


@dataclass
class JiraComment:
    id: str
    body: str
    body_html: str | None
    created_at: datetime
    is_public: bool = True


class JiraAdapter:
    def _client(self) -> httpx.Client:
        auth = (settings.jira_email or "", settings.jira_api_token or "")
        return httpx.Client(base_url=settings.jira_base_url, auth=auth, timeout=20.0)

    def _extract_text(self, raw_value) -> str:
        if raw_value is None:
            return ""
        if isinstance(raw_value, str):
            return raw_value
        if isinstance(raw_value, list):
            return "\n".join(filter(None, (self._extract_text(item) for item in raw_value)))
        if isinstance(raw_value, dict):
            parts = []
            text = raw_value.get("text")
            if isinstance(text, str):
                parts.append(text)
            for item in raw_value.get("content", []) or []:
                extracted = self._extract_text(item)
                if extracted:
                    parts.append(extracted)
            return "\n".join(parts).strip()
        return ""

    def _adf_to_html(self, raw_value) -> str:
        if raw_value is None:
            return ""
        if isinstance(raw_value, str):
            return f"<p>{escape(raw_value)}</p>"
        if isinstance(raw_value, list):
            return "".join(self._adf_to_html(item) for item in raw_value)
        if not isinstance(raw_value, dict):
            return ""

        node_type = raw_value.get("type")
        content = raw_value.get("content", []) or []
        inner = "".join(self._adf_to_html(item) for item in content)

        if node_type == "doc":
            return inner
        if node_type == "paragraph":
            return f"<p>{inner or '<br />'}</p>"
        if node_type == "text":
            text = escape(raw_value.get("text", ""))
            for mark in raw_value.get("marks", []) or []:
                mark_type = mark.get("type")
                if mark_type == "strong":
                    text = f"<strong>{text}</strong>"
                elif mark_type == "em":
                    text = f"<em>{text}</em>"
                elif mark_type == "code":
                    text = f"<code>{text}</code>"
                elif mark_type == "link":
                    href = escape((mark.get("attrs") or {}).get("href", ""), quote=True)
                    text = f'<a href="{href}" target="_blank" rel="noreferrer">{text}</a>'
            return text
        if node_type == "hardBreak":
            return "<br />"
        if node_type == "bulletList":
            return f"<ul>{inner}</ul>"
        if node_type == "orderedList":
            return f"<ol>{inner}</ol>"
        if node_type == "listItem":
            return f"<li>{inner}</li>"
        if node_type == "heading":
            level = min(max(int((raw_value.get('attrs') or {}).get('level', 3)), 1), 6)
            return f"<h{level}>{inner}</h{level}>"
        if node_type == "blockquote":
            return f"<blockquote>{inner}</blockquote>"
        return inner

    def _is_public_comment(self, comment: dict) -> bool:
        if "jsdPublic" in comment:
            return bool(comment["jsdPublic"])
        for prop in comment.get("properties", []) or []:
            key = prop.get("key", "")
            if key == "sd.public.comment":
                value = prop.get("value") or {}
                if isinstance(value, dict):
                    return bool(value.get("internal") is False or value.get("public") is True)
        return not bool(comment.get("visibility"))

    def fetch_ticket(self, ticket_key: str, ticket_url: str | None = None) -> JiraTicket:
        if settings.use_mock_integrations:
            return JiraTicket(
                key=ticket_key,
                url=ticket_url or f"https://jira.example.com/browse/{ticket_key}",
                status="In Progress",
                description="Publisher integration checklist and implementation notes.",
            )

        with self._client() as client:
            response = client.get(f"/rest/api/3/issue/{ticket_key}")
            response.raise_for_status()
            payload = response.json()
        fields = payload["fields"]
        description = self._extract_text(fields.get("description"))
        return JiraTicket(
            key=ticket_key,
            url=ticket_url or f"{settings.jira_base_url}/browse/{ticket_key}",
            status=fields["status"]["name"],
            description=description,
        )

    def fetch_public_comments(self, ticket_key: str) -> list[JiraComment]:
        if settings.use_mock_integrations:
            now = datetime.now(timezone.utc)
            return [
                JiraComment(
                    id=f"{ticket_key}-1",
                    body="PX has created the initial integration shell.",
                    body_html="<p>PX has created the initial integration shell.</p>",
                    created_at=now,
                ),
                JiraComment(
                    id=f"{ticket_key}-2",
                    body="Please confirm the endpoint whitelist from your engineering team.",
                    body_html="<p>Please confirm the endpoint whitelist from your engineering team.</p>",
                    created_at=now,
                ),
            ]

        with self._client() as client:
            response = client.get(f"/rest/api/3/issue/{ticket_key}/comment", params={"expand": "properties"})
            response.raise_for_status()
            payload = response.json()
        comments: list[JiraComment] = []
        for item in payload.get("comments", []):
            if not self._is_public_comment(item):
                continue
            body = self._extract_text(item.get("body"))
            body_html = self._adf_to_html(item.get("body"))
            if not body:
                continue
            comments.append(
                JiraComment(
                    id=str(item["id"]),
                    body=body,
                    body_html=body_html,
                    created_at=datetime.fromisoformat(item["created"].replace("Z", "+00:00")),
                )
            )
        comments.sort(key=lambda comment: comment.created_at)
        return comments

    def push_comment(self, ticket_key: str, body: str) -> str:
        if settings.use_mock_integrations:
            return f"{ticket_key}-portal"

        payload = {"body": body, "public": True}
        with self._client() as client:
            response = client.post(f"/rest/servicedeskapi/request/{ticket_key}/comment", json=payload)
            if response.status_code == 404:
                fallback = {
                    "body": {
                        "type": "doc",
                        "version": 1,
                        "content": [{"type": "paragraph", "content": [{"type": "text", "text": body}]}],
                    }
                }
                response = client.post(f"/rest/api/3/issue/{ticket_key}/comment", json=fallback)
            response.raise_for_status()
            payload = response.json()
            return str(payload.get("id") or payload.get("comment", {}).get("id") or f"{ticket_key}-portal")

    def map_status(self, status: str | None) -> str:
        return map_external_status(status, JIRA_STATUS_MAP)
