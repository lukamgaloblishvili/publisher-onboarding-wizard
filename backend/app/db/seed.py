import json

from sqlmodel import Session, select

from app.core.defaults import DEFAULT_RESOURCES, build_checklist
from app.core.security import hash_password
from app.models.models import Campaign, CampaignCompliance, CampaignIntegration, Message, Publisher, User


SEEDED_PUBLISHER_ACCESS_CODE = "ACME-ACCESS-2026"


def seed_data(session: Session) -> None:
    default_publisher_resources = DEFAULT_RESOURCES
    publisher = session.exec(select(Publisher).where(Publisher.slug == "acme-publishing")).first()
    if not publisher:
        publisher = Publisher(
            name="Acme Publishing",
            slug="acme-publishing",
            slack_channel_embed_url="https://it4px.slack.com/archives/C0ADVQH943X",
            notification_emails_json=json.dumps(["ops@acmepublishing.example", "finance@acmepublishing.example"]),
            access_code_hash=hash_password(SEEDED_PUBLISHER_ACCESS_CODE),
            resources_content_markdown=default_publisher_resources,
        )
        session.add(publisher)
        session.commit()
        session.refresh(publisher)
    else:
        updated = False
        if not publisher.resources_content_markdown or "https://api.px.com/" not in publisher.resources_content_markdown:
            publisher.resources_content_markdown = default_publisher_resources
            updated = True
        if not publisher.notification_emails_json:
            publisher.notification_emails_json = json.dumps(["ops@acmepublishing.example", "finance@acmepublishing.example"])
            updated = True
        if not publisher.access_code_hash:
            publisher.access_code_hash = hash_password(SEEDED_PUBLISHER_ACCESS_CODE)
            updated = True
        if updated:
            session.add(publisher)
            session.commit()
            session.refresh(publisher)

    spring_launch = session.exec(select(Campaign).where(Campaign.publisher_id == publisher.id, Campaign.name == "Spring Launch")).first()
    if not spring_launch:
        spring_launch = Campaign(
            publisher_id=publisher.id,
            name="Spring Launch",
            status="in_progress",
            campaign_type="api_real_time_leads_ping_post",
            checklist_json=build_checklist("api_real_time_leads_ping_post"),
        )
        session.add(spring_launch)

    international = session.exec(
        select(Campaign).where(Campaign.publisher_id == publisher.id, Campaign.name == "International Expansion")
    ).first()
    if not international:
        international = Campaign(
            publisher_id=publisher.id,
            name="International Expansion",
            status="waiting_on_publisher",
            campaign_type="branded_tracking_link",
            checklist_json=build_checklist("branded_tracking_link"),
        )
        session.add(international)
    session.commit()
    session.refresh(spring_launch)
    session.refresh(international)

    if not spring_launch.checklist_json:
        spring_launch.checklist_json = build_checklist(spring_launch.campaign_type)
        session.add(spring_launch)
    if not international.checklist_json:
        international.checklist_json = build_checklist(international.campaign_type)
        session.add(international)
    session.commit()

    integration = session.exec(select(CampaignIntegration).where(CampaignIntegration.campaign_id == spring_launch.id)).first()
    if not integration:
        integration = CampaignIntegration(
            campaign_id=spring_launch.id,
            external_ticket_key="PX-101",
            external_ticket_url="https://jira.example.com/browse/PX-101",
            portal_status="in_progress",
            external_status="In Progress",
            frozen_description="Confirm S2S tracking endpoint configuration and test event delivery.",
            frozen_description_html="<p>Confirm <strong>S2S tracking endpoint</strong> configuration and test event delivery.</p>",
        )
        session.add(integration)

    compliance = session.exec(select(CampaignCompliance).where(CampaignCompliance.campaign_id == spring_launch.id)).first()
    if not compliance:
        compliance = CampaignCompliance(
            campaign_id=spring_launch.id,
            external_item_id="9001",
            external_ticket_url="https://monday.example.com/boards/mock/pulses/9001",
            portal_status="waiting_on_publisher",
            external_status="Waiting for client",
            frozen_description="Collect compliance documents, business registration, and payment paperwork.",
            frozen_description_html="<p>Collect compliance documents, business registration, and payment paperwork.</p>",
        )
        session.add(compliance)
    session.commit()
    session.refresh(integration)
    session.refresh(compliance)

    if not session.exec(select(Message).where(Message.entity_type == "integration", Message.entity_id == integration.id)).first():
        session.add(
            Message(
                entity_type="integration",
                entity_id=integration.id,
                direction="inbound",
                body="PX has completed the first endpoint validation.",
                source="jira",
            )
        )
        session.add(
            Message(
                entity_type="integration",
                entity_id=integration.id,
                direction="outbound",
                body="We can provide a fresh callback sample by tomorrow.",
                source="portal",
            )
        )
    if not session.exec(select(Message).where(Message.entity_type == "compliance", Message.entity_id == compliance.id)).first():
        session.add(
            Message(
                entity_type="compliance",
                entity_id=compliance.id,
                direction="inbound",
                body="Please upload a signed W-8 form.",
                source="monday",
            )
        )
        session.add(
            Message(
                entity_type="compliance",
                entity_id=compliance.id,
                direction="outbound",
                body="Uploading the signed tax form this afternoon.",
                source="portal",
            )
        )

    if not session.exec(select(User).where(User.username == "admin")).first():
        session.add(User(username="admin", password_hash=hash_password("admin123"), role="admin"))
    session.commit()
