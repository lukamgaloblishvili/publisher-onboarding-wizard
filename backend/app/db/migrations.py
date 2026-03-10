from sqlalchemy import text

from app.db.session import engine


def run_startup_migrations() -> None:
    with engine.begin() as connection:
        if engine.dialect.name != "sqlite":
            return
        campaign_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info('campaign')")).fetchall()
        }
        if "campaign_type" not in campaign_columns:
            connection.execute(text("ALTER TABLE campaign ADD COLUMN campaign_type TEXT DEFAULT 'api_real_time_leads_ping_post'"))
        if "checklist_json" not in campaign_columns:
            connection.execute(text("ALTER TABLE campaign ADD COLUMN checklist_json TEXT"))
        message_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info('message')")).fetchall()
        }
        if "formatted_body" not in message_columns:
            connection.execute(text("ALTER TABLE message ADD COLUMN formatted_body TEXT"))
