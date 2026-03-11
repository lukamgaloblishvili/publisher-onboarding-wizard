from threading import Event, Thread
from time import sleep

from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.models.models import CampaignIntegration
from app.services.integration_sync import sync_integration_record
from app.services.jira import JiraAdapter


stop_event = Event()
worker_thread: Thread | None = None


def _run_loop() -> None:
    jira = JiraAdapter()
    while not stop_event.is_set():
        try:
            with Session(engine) as session:
                integrations = session.exec(
                    select(CampaignIntegration).where(CampaignIntegration.external_ticket_key != None)
                ).all()
                for integration in integrations:
                    try:
                        sync_integration_record(session, integration, jira)
                    except Exception:
                        continue
        finally:
            stop_event.wait(settings.integration_sync_interval_seconds)


def start_integration_sync_worker() -> None:
    global worker_thread
    if not settings.integration_auto_sync_enabled or worker_thread is not None:
        return
    stop_event.clear()
    worker_thread = Thread(target=_run_loop, daemon=True, name="integration-sync-worker")
    worker_thread.start()


def stop_integration_sync_worker() -> None:
    global worker_thread
    stop_event.set()
    worker_thread = None
