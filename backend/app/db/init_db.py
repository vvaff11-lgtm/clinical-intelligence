from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

from backend.app.core.config import BACKEND_DIR, get_settings
from backend.app.db.session import SessionLocal
from backend.app.seeds.seed_data import seed_reference_data


def ensure_mysql_database() -> None:
    settings = get_settings()
    if settings.database_url and not settings.database_url.startswith("mysql"):
        return

    server_url = (
        f"mysql+pymysql://{quote_plus(settings.mysql_user)}:{quote_plus(settings.mysql_password)}"
        f"@{settings.mysql_host}:{settings.mysql_port}/?charset=utf8mb4"
    )
    engine = create_engine(server_url, pool_pre_ping=True)
    with engine.begin() as connection:
        connection.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )


def run_migrations() -> None:
    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(alembic_cfg, "head")


def seed_database() -> None:
    with SessionLocal() as session:
        seed_reference_data(session)
        session.commit()


def main() -> None:
    ensure_mysql_database()
    run_migrations()
    seed_database()
    print("Database initialized successfully.")


if __name__ == "__main__":
    main()
