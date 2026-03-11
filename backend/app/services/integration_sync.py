from datetime import datetime, timezone
from html import escape

from sqlmodel import Session, delete, select

from app.models.models import CampaignIntegration, Message
from app.services.jira import JiraAdapter


def reset_integration_snapshot(session: Session, integration: CampaignIntegration) -> None:
    integration.portal_status = "not_started"
    integration.external_status = None
    integration.frozen_description = None
    integration.frozen_description_html = None
    integration.last_synced_at = None
    session.add(integration)
    session.exec(delete(Message).where(Message.entity_type == "integration", Message.entity_id == integration.id))


def sync_integration_record(session: Session, integration: CampaignIntegration, jira: JiraAdapter) -> CampaignIntegration:
    if not integration.external_ticket_key:
        return integration
    ticket = jira.fetch_ticket(integration.external_ticket_key, integration.external_ticket_url)
    comments = jira.fetch_public_comments(integration.external_ticket_key)
    integration.external_ticket_url = ticket.url
    integration.external_status = ticket.status
    integration.portal_status = jira.map_status(ticket.status)
    integration.last_synced_at = datetime.now(timezone.utc)
    if not integration.frozen_description:
        integration.frozen_description = ticket.description
    if not integration.frozen_description_html:
        integration.frozen_description_html = ticket.description_html or plain_text_to_html(
            integration.frozen_description or ticket.description
        )
    session.add(integration)

    existing_ids = {
        message.external_message_id
        for message in session.exec(
            select(Message).where(Message.entity_type == "integration", Message.entity_id == integration.id)
        ).all()
    }
    for comment in comments:
        if comment.id in existing_ids or not comment.is_public:
            continue
        session.add(
            Message(
                entity_type="integration",
                entity_id=integration.id,
                direction="inbound",
                body=comment.body,
                formatted_body=comment.body_html,
                source="jira",
                external_message_id=comment.id,
                created_at=comment.created_at,
            )
        )
    session.commit()
    session.refresh(integration)
    return integration


def plain_text_to_html(text: str) -> str:
    lines = [escape(line) for line in text.splitlines()]
    if not lines:
        return "<p></p>"
    return "<p>" + "<br />".join(lines) + "</p>"
