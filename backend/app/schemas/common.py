from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: int
    direction: str
    body: str
    formatted_body: str | None
    attachment_url: str | None
    attachment_name: str | None
    source: str
    is_public: bool
    external_message_id: str | None
    created_at: datetime


class IntegrationState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    external_ticket_key: str | None
    external_ticket_url: str | None
    portal_status: str
    external_status: str | None
    frozen_description: str | None
    frozen_description_html: str | None
    last_synced_at: datetime | None
    messages: list[MessageRead] = []


class ComplianceState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    external_item_id: str | None
    external_ticket_url: str | None
    portal_status: str
    external_status: str | None
    frozen_description: str | None
    frozen_description_html: str | None
    last_synced_at: datetime | None
    messages: list[MessageRead] = []
