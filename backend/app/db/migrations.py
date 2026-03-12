from alembic import command
from alembic.config import Config

from app.core.config import settings


def run_startup_migrations() -> None:
    config = Config(settings.alembic_ini_path)
    config.set_main_option("script_location", settings.alembic_script_location)
    config.set_main_option("sqlalchemy.url", settings.database_url)
    command.upgrade(config, "head")
