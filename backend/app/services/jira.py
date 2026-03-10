from dataclasses import dataclass
from datetime import datetime, timezone

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
    created_at: datetime
    is_public: bool = True


class JiraAdapter:
    def fetch_ticket(self, ticket_key: str, ticket_url: str | None = None) -> JiraTicket:
        if settings.use_mock_integrations:
            return JiraTicket(
                key=ticket_key,
                url=ticket_url or f"https://jira.example.com/browse/{ticket_key}",
                status="In Progress",
                description="Publisher integration checklist and implementation notes.",
            )

        auth = (settings.jira_email or "", settings.jira_api_token or "")
        with httpx.Client(base_url=settings.jira_base_url, auth=auth, timeout=20.0) as client:
            response = client.get(f"/rest/api/3/issue/{ticket_key}")
            response.raise_for_status()
            payload = response.json()
        fields = payload["fields"]
        description = ""
        raw_description = fields.get("description")
        if isinstance(raw_description, dict):
            try:
                description = raw_description["content"][0]["content"][0]["text"]
            except (KeyError, IndexError, TypeError):
                description = ""
        elif isinstance(raw_description, str):
            description = raw_description
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
                    created_at=now,
                ),
                JiraComment(
                    id=f"{ticket_key}-2",
                    body="Please confirm the endpoint whitelist from your engineering team.",
                    created_at=now,
                ),
            ]

        auth = (settings.jira_email or "", settings.jira_api_token or "")
        with httpx.Client(base_url=settings.jira_base_url, auth=auth, timeout=20.0) as client:
            response = client.get(f"/rest/api/3/issue/{ticket_key}/comment")
            response.raise_for_status()
            payload = response.json()
        comments: list[JiraComment] = []
        for item in payload.get("comments", []):
            if item.get("visibility"):
                continue
            raw_body = item.get("body")
            if isinstance(raw_body, dict):
                try:
                    body = raw_body["content"][0]["content"][0]["text"]
                except (KeyError, IndexError, TypeError):
                    body = ""
            else:
                body = raw_body or ""
            comments.append(
                JiraComment(
                    id=str(item["id"]),
                    body=body,
                    created_at=datetime.fromisoformat(item["created"].replace("Z", "+00:00")),
                )
            )
        return comments

    def push_comment(self, ticket_key: str, body: str) -> str:
        if settings.use_mock_integrations:
            return f"{ticket_key}-portal"

        auth = (settings.jira_email or "", settings.jira_api_token or "")
        payload = {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": body}]}],
            }
        }
        with httpx.Client(base_url=settings.jira_base_url, auth=auth, timeout=20.0) as client:
            response = client.post(f"/rest/api/3/issue/{ticket_key}/comment", json=payload)
            response.raise_for_status()
            return str(response.json()["id"])

    def map_status(self, status: str | None) -> str:
        return map_external_status(status, JIRA_STATUS_MAP)
