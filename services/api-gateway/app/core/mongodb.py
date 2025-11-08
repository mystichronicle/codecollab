"""MongoDB connection and client management."""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db = None

mongodb = MongoDB()


async def connect_to_mongo():
    """Create MongoDB connection."""
    logger.info("Connecting to MongoDB...")
    try:
        mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
        mongodb.db = mongodb.client.get_database("codecollab")
        await mongodb.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB!")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection."""
    logger.info("Closing MongoDB connection...")
    if mongodb.client:
        mongodb.client.close()
        logger.info("MongoDB connection closed!")


def get_database():
    """Get MongoDB database instance."""
    return mongodb.db
