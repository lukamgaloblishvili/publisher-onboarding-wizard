from threading import Event, Thread

from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.models.models import CampaignCompliance
from app.services.compliance_sync import sync_compliance_record
from app.services.monday import MondayAdapter


stop_event = Event()
worker_thread: Thread | None = None


def _run_loop() -> None:
    monday = MondayAdapter()
    while not stop_event.is_set():
        try:
            with Session(engine) as session:
                compliances = session.exec(
                    select(CampaignCompliance).where(CampaignCompliance.external_item_id != None)
                ).all()
                for compliance in compliances:
                    try:
                        sync_compliance_record(session, compliance, monday)
                    except Exception:
                        continue
        finally:
            stop_event.wait(settings.integration_sync_interval_seconds)


def start_compliance_sync_worker() -> None:
    global worker_thread
    if not settings.integration_auto_sync_enabled or worker_thread is not None:
        return
    stop_event.clear()
    worker_thread = Thread(target=_run_loop, daemon=True, name="compliance-sync-worker")
    worker_thread.start()


def stop_compliance_sync_worker() -> None:
    global worker_thread
    stop_event.set()
    worker_thread = None
