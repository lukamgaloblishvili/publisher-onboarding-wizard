from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.api.deps import get_current_user, require_admin
from app.api.utils import campaign_read, compliance_state, integration_state, message_reads, publisher_read
from app.core.config import settings
from app.core.security import create_session_token, hash_password, verify_password
from app.db.session import get_session
from app.models.models import Campaign, CampaignCompliance, CampaignIntegration, Message, Publisher, User
from app.schemas.auth import LoginRequest, UserRead
from app.schemas.common import ComplianceState, IntegrationState, MessageRead
from app.schemas.publisher import (
    CampaignCreate,
    CampaignRead,
    CampaignUpdate,
    ComplianceLinkRequest,
    IntegrationLinkRequest,
    MessageCreate,
    PublisherCreate,
    PublisherRead,
    PublisherUpdate,
    PublisherUserCreate,
)
from app.services.jira import JiraAdapter
from app.services.monday import MondayAdapter
from app.services.storage import StorageService


router = APIRouter()
jira = JiraAdapter()
monday = MondayAdapter()
storage = StorageService()


def ensure_campaign_access(session: Session, campaign_id: int, user: User) -> Campaign:
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if user.role != "admin" and campaign.publisher_id != user.publisher_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return campaign


def ensure_entity_access(session: Session, entity_type: str, entity_id: int, user: User):
    entity = session.get(CampaignIntegration if entity_type == "integration" else CampaignCompliance, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    campaign = session.get(Campaign, entity.campaign_id)
    if not campaign or (user.role != "admin" and campaign.publisher_id != user.publisher_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return entity, campaign


@router.post("/auth/login", response_model=UserRead)
def login(payload: LoginRequest, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == payload.username)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    response.set_cookie(
        key=settings.session_cookie_name,
        value=create_session_token(user.id),
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return UserRead.model_validate(user)


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return UserRead.model_validate(user)


@router.get("/admin/publishers", response_model=list[PublisherRead])
def admin_publishers(session: Session = Depends(get_session), _: User = Depends(require_admin)):
    return [publisher_read(session, publisher) for publisher in session.exec(select(Publisher).order_by(Publisher.created_at)).all()]


@router.post("/admin/publishers", response_model=PublisherRead)
def create_publisher(payload: PublisherCreate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    publisher = Publisher(**payload.model_dump(), updated_at=datetime.now(timezone.utc))
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher_read(session, publisher)


@router.get("/admin/publishers/{publisher_id}", response_model=PublisherRead)
def get_publisher_admin(publisher_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    publisher = session.get(Publisher, publisher_id)
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    return publisher_read(session, publisher)


@router.patch("/admin/publishers/{publisher_id}", response_model=PublisherRead)
def update_publisher(publisher_id: int, payload: PublisherUpdate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    publisher = session.get(Publisher, publisher_id)
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(publisher, key, value)
    publisher.updated_at = datetime.now(timezone.utc)
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher_read(session, publisher)


@router.post("/admin/publishers/{publisher_id}/users", response_model=UserRead)
def create_publisher_user(publisher_id: int, payload: PublisherUserCreate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Publisher, publisher_id):
        raise HTTPException(status_code=404, detail="Publisher not found")
    user = User(username=payload.username, password_hash=hash_password(payload.password), role="publisher", publisher_id=publisher_id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserRead.model_validate(user)


@router.post("/admin/publishers/{publisher_id}/campaigns", response_model=CampaignRead)
def create_campaign(publisher_id: int, payload: CampaignCreate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Publisher, publisher_id):
        raise HTTPException(status_code=404, detail="Publisher not found")
    campaign = Campaign(publisher_id=publisher_id, **payload.model_dump())
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign_read(session, campaign)


@router.patch("/admin/campaigns/{campaign_id}", response_model=CampaignRead)
def update_campaign(campaign_id: int, payload: CampaignUpdate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(campaign, key, value)
    campaign.updated_at = datetime.now(timezone.utc)
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign_read(session, campaign)


@router.post("/admin/campaigns/{campaign_id}/integration/link", response_model=IntegrationState)
def link_integration(campaign_id: int, payload: IntegrationLinkRequest, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")
    integration = session.exec(select(CampaignIntegration).where(CampaignIntegration.campaign_id == campaign_id)).first()
    if not integration:
        integration = CampaignIntegration(campaign_id=campaign_id)
    integration.external_ticket_key = payload.external_ticket_key
    integration.external_ticket_url = payload.external_ticket_url
    session.add(integration)
    session.commit()
    session.refresh(integration)
    return sync_integration(integration.id, session, _)


@router.post("/admin/campaigns/{campaign_id}/compliance/link", response_model=ComplianceState)
def link_compliance(campaign_id: int, payload: ComplianceLinkRequest, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")
    compliance = session.exec(select(CampaignCompliance).where(CampaignCompliance.campaign_id == campaign_id)).first()
    if not compliance:
        compliance = CampaignCompliance(campaign_id=campaign_id)
    compliance.external_item_id = payload.external_item_id
    compliance.external_ticket_url = payload.external_ticket_url
    session.add(compliance)
    session.commit()
    session.refresh(compliance)
    return sync_compliance(compliance.id, session, _)


@router.post("/admin/integration/{integration_id}/sync", response_model=IntegrationState)
def sync_integration(integration_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    integration = session.get(CampaignIntegration, integration_id)
    if not integration or not integration.external_ticket_key:
        raise HTTPException(status_code=404, detail="Integration not found")
    ticket = jira.fetch_ticket(integration.external_ticket_key, integration.external_ticket_url)
    comments = jira.fetch_public_comments(integration.external_ticket_key)
    integration.external_ticket_url = ticket.url
    integration.external_status = ticket.status
    integration.portal_status = jira.map_status(ticket.status)
    integration.last_synced_at = datetime.now(timezone.utc)
    if not integration.frozen_description:
        integration.frozen_description = ticket.description
    session.add(integration)
    existing_ids = {
        message.external_message_id
        for message in session.exec(select(Message).where(Message.entity_type == "integration", Message.entity_id == integration_id)).all()
    }
    for comment in comments:
        if comment.id in existing_ids or not comment.is_public:
            continue
        session.add(
            Message(
                entity_type="integration",
                entity_id=integration_id,
                direction="inbound",
                body=comment.body,
                source="jira",
                external_message_id=comment.id,
                created_at=comment.created_at,
            )
        )
    session.commit()
    return integration_state(session, integration.campaign_id)


@router.post("/admin/compliance/{compliance_id}/sync", response_model=ComplianceState)
def sync_compliance(compliance_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    compliance = session.get(CampaignCompliance, compliance_id)
    if not compliance or not compliance.external_item_id:
        raise HTTPException(status_code=404, detail="Compliance not found")
    item = monday.fetch_item(compliance.external_item_id, compliance.external_ticket_url)
    updates = monday.fetch_updates(compliance.external_item_id)
    compliance.external_ticket_url = item.url
    compliance.external_status = item.status
    compliance.portal_status = monday.map_status(item.status)
    compliance.last_synced_at = datetime.now(timezone.utc)
    if not compliance.frozen_description:
        compliance.frozen_description = item.description
    session.add(compliance)
    existing_ids = {
        message.external_message_id
        for message in session.exec(select(Message).where(Message.entity_type == "compliance", Message.entity_id == compliance_id)).all()
    }
    for update in updates:
        if update.id in existing_ids:
            continue
        session.add(
            Message(
                entity_type="compliance",
                entity_id=compliance_id,
                direction="inbound",
                body=update.body,
                source="monday",
                external_message_id=update.id,
                created_at=update.created_at,
            )
        )
    session.commit()
    return compliance_state(session, compliance.campaign_id)


@router.get("/publishers/current", response_model=PublisherRead)
def current_publisher(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    publisher = session.exec(select(Publisher).order_by(Publisher.created_at)).first() if user.role == "admin" else session.get(Publisher, user.publisher_id)
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    return publisher_read(session, publisher)


@router.get("/campaigns/{campaign_id}", response_model=CampaignRead)
def get_campaign(campaign_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    return campaign_read(session, ensure_campaign_access(session, campaign_id, user))


@router.get("/integration/{integration_id}/messages", response_model=list[MessageRead])
def get_integration_messages(integration_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    ensure_entity_access(session, "integration", integration_id, user)
    return message_reads(session, "integration", integration_id)


@router.post("/integration/{integration_id}/messages", response_model=MessageRead)
def post_integration_message(integration_id: int, payload: MessageCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    integration, _campaign = ensure_entity_access(session, "integration", integration_id, user)
    external_id = jira.push_comment(integration.external_ticket_key or f"integration-{integration_id}", payload.body)
    message = Message(
        entity_type="integration",
        entity_id=integration_id,
        direction="outbound",
        body=payload.body,
        source="portal",
        external_message_id=external_id,
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return MessageRead.model_validate(message)


@router.get("/compliance/{compliance_id}/messages", response_model=list[MessageRead])
def get_compliance_messages(compliance_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    ensure_entity_access(session, "compliance", compliance_id, user)
    return message_reads(session, "compliance", compliance_id)


@router.post("/compliance/{compliance_id}/messages", response_model=MessageRead)
def post_compliance_message(compliance_id: int, payload: MessageCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    compliance, _campaign = ensure_entity_access(session, "compliance", compliance_id, user)
    external_id = monday.push_update(compliance.external_item_id or str(compliance_id), payload.body)
    message = Message(
        entity_type="compliance",
        entity_id=compliance_id,
        direction="outbound",
        body=payload.body,
        source="portal",
        external_message_id=external_id,
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return MessageRead.model_validate(message)


@router.post("/compliance/{compliance_id}/upload", response_model=MessageRead)
def upload_compliance_file(
    compliance_id: int,
    file: UploadFile = File(...),
    note: str = Form(default="File uploaded from portal"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if file.size and file.size > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File too large")
    allowed = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".doc", ".docx"}
    extension = Path(file.filename or "").suffix.lower()
    if extension not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    compliance, _campaign = ensure_entity_access(session, "compliance", compliance_id, user)
    attachment_url, attachment_name = storage.save_upload(file)
    monday.upload_file(compliance.external_item_id or str(compliance_id), attachment_name)
    message = Message(
        entity_type="compliance",
        entity_id=compliance_id,
        direction="outbound",
        body=note,
        source="portal",
        attachment_url=attachment_url,
        attachment_name=attachment_name,
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return MessageRead.model_validate(message)


@router.get("/resources/current")
def current_resources(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    publisher = session.exec(select(Publisher).order_by(Publisher.created_at)).first() if user.role == "admin" else session.get(Publisher, user.publisher_id)
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    return {"publisher_id": publisher.id, "content_markdown": publisher.resources_content_markdown or ""}


@router.get("/uploads/{file_name}")
def serve_upload(file_name: str):
    file_path = Path(settings.upload_dir) / file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
