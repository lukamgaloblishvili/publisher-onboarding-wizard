from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.models import CampaignCompliance, Message
from app.services.integration_sync import plain_text_to_html
from app.services.monday import MondayAdapter


def sync_compliance_record(session: Session, compliance: CampaignCompliance, monday: MondayAdapter) -> CampaignCompliance:
    if not compliance.external_item_id:
        return compliance

    item = monday.fetch_item(compliance.external_item_id, compliance.external_ticket_url)
    updates = monday.fetch_updates(compliance.external_item_id)
    compliance.external_ticket_url = item.url
    compliance.external_status = item.status
    compliance.portal_status = monday.map_status(item.status)
    compliance.last_synced_at = datetime.now(timezone.utc)
    if not compliance.frozen_description:
        compliance.frozen_description = item.description
    if not compliance.frozen_description_html:
        compliance.frozen_description_html = item.description_html or plain_text_to_html(item.description)
    session.add(compliance)

    existing_ids = {
        message.external_message_id
        for message in session.exec(select(Message).where(Message.entity_type == "compliance", Message.entity_id == compliance.id)).all()
    }
    for update in updates:
        if update.id in existing_ids:
            continue
        session.add(
            Message(
                entity_type="compliance",
                entity_id=compliance.id,
                direction="inbound",
                body=update.body,
                formatted_body=update.body_html,
                source="monday",
                attachment_url=(update.assets[0].url or update.assets[0].thumbnail_url) if update.assets else None,
                attachment_name=update.assets[0].name if update.assets else None,
                external_message_id=update.id,
                created_at=update.created_at,
            )
        )
    session.commit()
    session.refresh(compliance)
    return compliance
