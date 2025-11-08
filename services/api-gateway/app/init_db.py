"""Initial database setup script - creates tables."""

from sqlalchemy import create_engine
from app.core.config import settings
from app.models.user import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db():
    """Initialize database tables."""
    logger.info("Creating database tables...")
    engine = create_engine(settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully!")


if __name__ == "__main__":
    init_db()
