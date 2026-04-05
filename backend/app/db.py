"""
FinSight AI -- Database Manager
================================
Sets up async MongoDB connection using Motor.
Provides easy access to collections via `get_collection()`.
"""

from typing import Any
from motor.motor_asyncio import AsyncIOMotorClient # type: ignore
from app.config import settings
import certifi
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: Any = None
    db: Any = None

    @classmethod
    async def connect_to_database(cls, uri: str = None):
        """Initialize MongoDB Async Client."""
        db_uri = uri or settings.MONGODB_URI
        logger.info(f"Connecting to MongoDB at {db_uri[:40]}...")
        try:
            # Use certifi for Atlas (mongodb+srv) but skip for local connections
            if "mongodb+srv://" in db_uri:
                cls.client = AsyncIOMotorClient(db_uri, tlsCAFile=certifi.where())
            else:
                cls.client = AsyncIOMotorClient(db_uri)
            
            cls.db = cls.client[settings.DATABASE_NAME]
            logger.info(f"Successfully connected to MongoDB! Database: {settings.DATABASE_NAME}")
            
            # Ensure unique index on email for the users collection
            await cls.db["users"].create_index("email", unique=True)
            logger.info("Ensured unique index on users.email")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise e

    @classmethod
    async def close_database_connection(cls):
        """Close connection on app shutdown."""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed.")

    @classmethod
    async def get_collection(cls, collection_name: str):
        """Helper to get a specific DB collection."""
        if cls.db is None:
            await cls.connect_to_database()
        return cls.db[collection_name]


# Convenient exports
db_manager = DatabaseManager()

async def get_expenses_collection():
    # Use the async method properly inside routes
    return await db_manager.get_collection("expenses")

async def get_users_collection():
    return await db_manager.get_collection("users")

async def get_database():
    if DatabaseManager.db is None:
        await DatabaseManager.connect_to_database()
    return DatabaseManager.db

