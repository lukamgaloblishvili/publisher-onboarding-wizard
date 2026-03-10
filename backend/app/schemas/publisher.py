from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.auth import UserRead
from app.schemas.common import ComplianceState, IntegrationState


class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    publisher_id: int
    name: str
    status: str
    campaign_type: str
    checklist_items: list[dict]
    created_at: datetime
    updated_at: datetime
    integration: IntegrationState | None = None
    compliance: ComplianceState | None = None


class PublisherCreate(BaseModel):
    name: str
    slug: str
    slack_channel_embed_url: str | None = None
    resources_content_markdown: str | None = None


class PublisherUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    slack_channel_embed_url: str | None = None
    resources_content_markdown: str | None = None


class PublisherRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    slack_channel_embed_url: str | None
    resources_content_markdown: str | None
    created_at: datetime
    updated_at: datetime
    users: list[UserRead] = []
    campaigns: list[CampaignRead] = []


class PublisherUserCreate(BaseModel):
    username: str
    password: str


class CampaignCreate(BaseModel):
    name: str
    status: str = "in_progress"
    campaign_type: str = "api_real_time_leads_ping_post"


class CampaignUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    campaign_type: str | None = None
    checklist_items: list[dict] | None = None


class IntegrationLinkRequest(BaseModel):
    external_ticket_key: str
    external_ticket_url: str | None = None


class ComplianceLinkRequest(BaseModel):
    external_item_id: str
    external_ticket_url: str | None = None


class MessageCreate(BaseModel):
    body: str
