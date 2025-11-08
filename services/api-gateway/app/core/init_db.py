"""MongoDB indexes and initial setup"""

from app.core.mongodb import get_database
import logging

logger = logging.getLogger(__name__)


async def init_mongodb_indexes():
    """Create MongoDB indexes for optimal query performance"""
    try:
        db = get_database()
        
        await db.sessions.create_index([("id", 1)], unique=True)
        await db.sessions.create_index("share_code", unique=True)
        await db.sessions.create_index("owner_id")
        await db.sessions.create_index("participants")
        await db.sessions.create_index([("created_at", -1)])
        await db.sessions.create_index([("updated_at", -1)])
        await db.sessions.create_index("is_active")
        await db.sessions.create_index("language")
        
        logger.info("MongoDB indexes created successfully")
    except Exception as e:
        logger.error(f"Failed to create MongoDB indexes: {e}")
