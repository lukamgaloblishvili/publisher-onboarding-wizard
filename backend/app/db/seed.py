from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.models import Campaign, CampaignCompliance, CampaignIntegration, Message, Publisher, User


DEFAULT_RESOURCES = """## Default Resources

- [PX Integration Guide](https://example.com/integration-guide)
- [Compliance Checklist](https://example.com/compliance-checklist)
- Reach out in Slack for urgent blockers.

## Publisher Notes

Welcome to the PX onboarding workspace. Use this portal to track Integration and Compliance workstreams.
"""


def seed_data(session: Session) -> None:
    publisher = session.exec(select(Publisher).where(Publisher.slug == "acme-publishing")).first()
    if not publisher:
        publisher = Publisher(
            name="Acme Publishing",
            slug="acme-publishing",
            slack_channel_embed_url="https://slack.com/app_redirect?channel=publisher-onboarding",
            resources_content_markdown=DEFAULT_RESOURCES + "\n\n## Custom Content\n\n- Primary business contact: ops@acme.test",
        )
        session.add(publisher)
        session.commit()
        session.refresh(publisher)

    spring_launch = session.exec(
        select(Campaign).where(Campaign.publisher_id == publisher.id, Campaign.name == "Spring Launch")
    ).first()
    if not spring_launch:
        spring_launch = Campaign(publisher_id=publisher.id, name="Spring Launch", status="in_progress")
        session.add(spring_launch)

    international = session.exec(
        select(Campaign).where(Campaign.publisher_id == publisher.id, Campaign.name == "International Expansion")
    ).first()
    if not international:
        international = Campaign(publisher_id=publisher.id, name="International Expansion", status="waiting_on_publisher")
        session.add(international)
    session.commit()
    session.refresh(spring_launch)
    session.refresh(international)

    integration = session.exec(select(CampaignIntegration).where(CampaignIntegration.campaign_id == spring_launch.id)).first()
    if not integration:
        integration = CampaignIntegration(
            campaign_id=spring_launch.id,
            external_ticket_key="PX-101",
            external_ticket_url="https://jira.example.com/browse/PX-101",
            portal_status="in_progress",
            external_status="In Progress",
            frozen_description="Confirm S2S tracking endpoint configuration and test event delivery.",
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
        )
        session.add(compliance)
    session.commit()
    session.refresh(integration)
    session.refresh(compliance)

    if not session.exec(select(Message).where(Message.entity_type == "integration", Message.entity_id == integration.id)).first():
        session.add(Message(entity_type="integration", entity_id=integration.id, direction="inbound", body="PX has completed the first endpoint validation.", source="jira"))
        session.add(Message(entity_type="integration", entity_id=integration.id, direction="outbound", body="We can provide a fresh callback sample by tomorrow.", source="portal"))
    if not session.exec(select(Message).where(Message.entity_type == "compliance", Message.entity_id == compliance.id)).first():
        session.add(Message(entity_type="compliance", entity_id=compliance.id, direction="inbound", body="Please upload a signed W-8 form.", source="monday"))
        session.add(Message(entity_type="compliance", entity_id=compliance.id, direction="outbound", body="Uploading the signed tax form this afternoon.", source="portal"))

    if not session.exec(select(User).where(User.username == "admin")).first():
        session.add(User(username="admin", password_hash=hash_password("admin123"), role="admin"))
    if not session.exec(select(User).where(User.username == "publisher")).first():
        session.add(
            User(
                username="publisher",
                password_hash=hash_password("publisher123"),
                role="publisher",
                publisher_id=publisher.id,
            )
        )
    session.commit()
