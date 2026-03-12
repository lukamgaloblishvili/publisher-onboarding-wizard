import json

from sqlmodel import Session, select

from app.models.models import Campaign, CampaignCompliance, CampaignIntegration, Message, Publisher
from app.schemas.common import ComplianceState, IntegrationState, MessageRead
from app.schemas.publisher import CampaignRead, PublisherRead


def message_reads(session: Session, entity_type: str, entity_id: int) -> list[MessageRead]:
    messages = session.exec(
        select(Message)
        .where(Message.entity_type == entity_type, Message.entity_id == entity_id, Message.is_public == True)
        .order_by(Message.created_at)
    ).all()
    return [MessageRead.model_validate(message) for message in messages]


def integration_state(session: Session, campaign_id: int) -> IntegrationState | None:
    integration = session.exec(select(CampaignIntegration).where(CampaignIntegration.campaign_id == campaign_id)).first()
    if not integration:
        return None
    return IntegrationState(
        **integration.model_dump(),
        messages=message_reads(session, "integration", integration.id),
    )


def compliance_state(session: Session, campaign_id: int) -> ComplianceState | None:
    compliance = session.exec(select(CampaignCompliance).where(CampaignCompliance.campaign_id == campaign_id)).first()
    if not compliance:
        return None
    return ComplianceState(
        **compliance.model_dump(),
        messages=message_reads(session, "compliance", compliance.id),
    )


def campaign_read(session: Session, campaign: Campaign) -> CampaignRead:
    checklist_items = json.loads(campaign.checklist_json or "[]")
    return CampaignRead(
        **campaign.model_dump(exclude={"checklist_json"}),
        checklist_items=checklist_items,
        integration=integration_state(session, campaign.id),
        compliance=compliance_state(session, campaign.id),
    )


def publisher_read(session: Session, publisher: Publisher) -> PublisherRead:
    campaigns = session.exec(select(Campaign).where(Campaign.publisher_id == publisher.id).order_by(Campaign.created_at)).all()
    notification_emails = json.loads(publisher.notification_emails_json or "[]")
    return PublisherRead(
        **publisher.model_dump(exclude={"notification_emails_json", "access_code_hash"}),
        notification_emails=notification_emails,
        has_access_code=bool(publisher.access_code_hash),
        campaigns=[campaign_read(session, campaign) for campaign in campaigns],
    )
