import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import Session, delete, select

from app.api.deps import get_current_user, require_admin
from app.api.utils import campaign_read, compliance_state, integration_state, message_reads, publisher_read
from app.core.config import settings
from app.core.defaults import DEFAULT_RESOURCES, build_checklist
from app.core.security import create_session_token, hash_password, verify_password
from app.db.session import get_session
from app.models.models import Campaign, CampaignCompliance, CampaignIntegration, Message, Publisher, User
from app.schemas.auth import LoginRequest, UserRead, UserUpdate
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
from app.services.integration_sync import plain_text_to_html, reset_integration_snapshot, sync_integration_record
from app.services.compliance_sync import sync_compliance_record
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


def ensure_unique_integration_ticket(session: Session, ticket_key: str, integration_id: int | None = None) -> None:
    query = select(CampaignIntegration).where(CampaignIntegration.external_ticket_key == ticket_key)
    if integration_id is not None:
        query = query.where(CampaignIntegration.id != integration_id)
    duplicate = session.exec(query).first()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Jira ticket {ticket_key} is already linked to campaign {duplicate.campaign_id}. "
                "Unlink or relink the other campaign first."
            ),
        )


def ensure_unique_compliance_item(session: Session, item_id: str, compliance_id: int | None = None) -> None:
    query = select(CampaignCompliance).where(CampaignCompliance.external_item_id == item_id)
    if compliance_id is not None:
        query = query.where(CampaignCompliance.id != compliance_id)
    duplicate = session.exec(query).first()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Monday item {item_id} is already linked to campaign {duplicate.campaign_id}. "
                "Unlink or relink the other campaign first."
            ),
        )


def reset_compliance_snapshot(session: Session, compliance: CampaignCompliance) -> None:
    compliance.portal_status = "not_started"
    compliance.external_status = None
    compliance.frozen_description = None
    compliance.frozen_description_html = None
    compliance.last_synced_at = None
    session.add(compliance)
    session.exec(delete(Message).where(Message.entity_type == "compliance", Message.entity_id == compliance.id))


def delete_campaign_graph(session: Session, campaign: Campaign) -> None:
    integration = session.exec(select(CampaignIntegration).where(CampaignIntegration.campaign_id == campaign.id)).first()
    if integration:
        session.exec(delete(Message).where(Message.entity_type == "integration", Message.entity_id == integration.id))
        session.delete(integration)
    compliance = session.exec(select(CampaignCompliance).where(CampaignCompliance.campaign_id == campaign.id)).first()
    if compliance:
        session.exec(delete(Message).where(Message.entity_type == "compliance", Message.entity_id == compliance.id))
        session.delete(compliance)
    session.delete(campaign)


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
    data = payload.model_dump()
    if not data.get("resources_content_markdown"):
        data["resources_content_markdown"] = DEFAULT_RESOURCES
    publisher = Publisher(**data, updated_at=datetime.now(timezone.utc))
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


@router.delete("/admin/publishers/{publisher_id}", status_code=204)
def delete_publisher(publisher_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    publisher = session.get(Publisher, publisher_id)
    if not publisher:
        raise HTTPException(status_code=404, detail="Publisher not found")
    campaigns = session.exec(select(Campaign).where(Campaign.publisher_id == publisher_id)).all()
    for campaign in campaigns:
        delete_campaign_graph(session, campaign)
    users = session.exec(select(User).where(User.publisher_id == publisher_id)).all()
    for user in users:
        session.delete(user)
    session.delete(publisher)
    session.commit()
    return Response(status_code=204)


@router.post("/admin/publishers/{publisher_id}/users", response_model=UserRead)
def create_publisher_user(publisher_id: int, payload: PublisherUserCreate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Publisher, publisher_id):
        raise HTTPException(status_code=404, detail="Publisher not found")
    user = User(username=payload.username, password_hash=hash_password(payload.password), role="publisher", publisher_id=publisher_id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserRead.model_validate(user)


@router.patch("/admin/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.username:
        user.username = payload.username
    if payload.password:
        user.password_hash = hash_password(payload.password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/admin/users/{user_id}", status_code=204)
def delete_user(user_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "publisher":
        raise HTTPException(status_code=400, detail="Only publisher logins can be deleted")
    session.delete(user)
    session.commit()
    return Response(status_code=204)


@router.post("/admin/publishers/{publisher_id}/campaigns", response_model=CampaignRead)
def create_campaign(publisher_id: int, payload: CampaignCreate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Publisher, publisher_id):
        raise HTTPException(status_code=404, detail="Publisher not found")
    data = payload.model_dump()
    campaign = Campaign(
        publisher_id=publisher_id,
        **data,
        checklist_json=build_checklist(data["campaign_type"]),
    )
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign_read(session, campaign)


@router.patch("/admin/campaigns/{campaign_id}", response_model=CampaignRead)
def update_campaign(campaign_id: int, payload: CampaignUpdate, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    update_data = payload.model_dump(exclude_none=True)
    checklist_items = update_data.pop("checklist_items", None)
    for key, value in update_data.items():
        setattr(campaign, key, value)
    if checklist_items is not None:
        campaign.checklist_json = json.dumps(checklist_items)
    elif "campaign_type" in update_data:
        campaign.checklist_json = build_checklist(campaign.campaign_type)
    campaign.updated_at = datetime.now(timezone.utc)
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign_read(session, campaign)


@router.delete("/admin/campaigns/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    campaign = session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    delete_campaign_graph(session, campaign)
    session.commit()
    return Response(status_code=204)


@router.post("/admin/campaigns/{campaign_id}/integration/link", response_model=IntegrationState)
def link_integration(campaign_id: int, payload: IntegrationLinkRequest, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    if not session.get(Campaign, campaign_id):
        raise HTTPException(status_code=404, detail="Campaign not found")
    integration = session.exec(select(CampaignIntegration).where(CampaignIntegration.campaign_id == campaign_id)).first()
    if not integration:
        integration = CampaignIntegration(campaign_id=campaign_id)
    next_key = payload.external_ticket_key.strip()
    next_url = (payload.external_ticket_url or "").strip()
    ensure_unique_integration_ticket(session, next_key, integration.id)
    if integration.id is not None:
        reset_integration_snapshot(session, integration)
    integration.external_ticket_key = next_key
    integration.external_ticket_url = next_url or None
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
    try:
        item_id, item_url = monday.parse_item_reference(payload.external_item_id, payload.external_ticket_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    ensure_unique_compliance_item(session, item_id, compliance.id)
    if compliance.id is not None:
        reset_compliance_snapshot(session, compliance)
    compliance.external_item_id = item_id
    compliance.external_ticket_url = item_url
    session.add(compliance)
    session.commit()
    session.refresh(compliance)
    return sync_compliance(compliance.id, session, _)


@router.post("/admin/integration/{integration_id}/sync", response_model=IntegrationState)
def sync_integration(integration_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    integration = session.get(CampaignIntegration, integration_id)
    if not integration or not integration.external_ticket_key:
        raise HTTPException(status_code=404, detail="Integration not found")
    ensure_unique_integration_ticket(session, integration.external_ticket_key, integration.id)
    integration = sync_integration_record(session, integration, jira)
    return integration_state(session, integration.campaign_id)


@router.post("/admin/compliance/{compliance_id}/sync", response_model=ComplianceState)
def sync_compliance(compliance_id: int, session: Session = Depends(get_session), _: User = Depends(require_admin)):
    compliance = session.get(CampaignCompliance, compliance_id)
    if not compliance or not compliance.external_item_id:
        raise HTTPException(status_code=404, detail="Compliance not found")
    ensure_unique_compliance_item(session, compliance.external_item_id, compliance.id)
    sync_compliance_record(session, compliance, monday)
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
    if integration.external_ticket_key:
        ensure_unique_integration_ticket(session, integration.external_ticket_key, integration.id)
    external_id = jira.push_comment(integration.external_ticket_key or f"integration-{integration_id}", payload.body)
    message = Message(
        entity_type="integration",
        entity_id=integration_id,
        direction="outbound",
        body=payload.body,
        formatted_body=plain_text_to_html(payload.body),
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
    if compliance.external_item_id:
        ensure_unique_compliance_item(session, compliance.external_item_id, compliance.id)
    external_id = monday.push_update(compliance.external_item_id or str(compliance_id), payload.body)
    message = Message(
        entity_type="compliance",
        entity_id=compliance_id,
        direction="outbound",
        body=payload.body,
        formatted_body=plain_text_to_html(payload.body),
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
    if compliance.external_item_id:
        ensure_unique_compliance_item(session, compliance.external_item_id, compliance.id)
    attachment_url, attachment_name = storage.save_upload(file)
    monday.upload_file(compliance.external_item_id or str(compliance_id), str(Path(settings.upload_dir) / Path(attachment_url).name), note)
    message = Message(
        entity_type="compliance",
        entity_id=compliance_id,
        direction="outbound",
        body=note,
        formatted_body=plain_text_to_html(note),
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
