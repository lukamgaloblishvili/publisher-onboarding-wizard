from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.api.routes import router
from app.core.config import settings
from app.db.migrations import run_startup_migrations
from app.db.seed import seed_data
from app.db.session import create_db_and_tables, engine
from app.services.integration_sync_worker import start_integration_sync_worker, stop_integration_sync_worker


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    run_startup_migrations()
    with Session(engine) as session:
        seed_data(session)
    start_integration_sync_worker()


@app.on_event("shutdown")
def on_shutdown() -> None:
    stop_integration_sync_worker()


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(router)
