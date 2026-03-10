from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(index=True)
    publisher_id: int | None = Field(default=None, foreign_key="publisher.id")
    created_at: datetime = Field(default_factory=utcnow)


class Publisher(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    slack_channel_embed_url: str | None = None
    resources_content_markdown: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Campaign(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    publisher_id: int = Field(foreign_key="publisher.id", index=True)
    name: str
    status: str = Field(default="in_progress")
    campaign_type: str = Field(default="api_real_time_leads_ping_post")
    checklist_json: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class CampaignIntegration(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaign.id", index=True, unique=True)
    external_type: str = "jira"
    external_ticket_key: str | None = None
    external_ticket_url: str | None = None
    portal_status: str = Field(default="not_started")
    external_status: str | None = None
    frozen_description: str | None = None
    last_synced_at: datetime | None = None


class CampaignCompliance(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaign.id", index=True, unique=True)
    external_type: str = "monday"
    external_item_id: str | None = None
    external_ticket_url: str | None = None
    portal_status: str = Field(default="not_started")
    external_status: str | None = None
    frozen_description: str | None = None
    last_synced_at: datetime | None = None


class Message(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)
    entity_id: int = Field(index=True)
    direction: str
    body: str
    attachment_url: str | None = None
    attachment_name: str | None = None
    source: str
    is_public: bool = Field(default=True)
    external_message_id: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
