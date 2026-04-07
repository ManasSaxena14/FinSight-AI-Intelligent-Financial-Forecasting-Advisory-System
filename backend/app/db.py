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

    # Motor client options — fail within ~10s instead of hanging (common Atlas/DNS issue)
    _CLIENT_KWARGS = {"serverSelectionTimeoutMS": 10_000, "connectTimeoutMS": 10_000}

    @classmethod
    async def connect_to_database(cls, uri: str = None):
        """Initialize MongoDB Async Client."""
        db_uri = uri or settings.MONGODB_URI
        logger.info("Connecting to MongoDB at %s...", db_uri[:48])
        cls.client = None
        cls.db = None
        try:
            # Use certifi for Atlas (mongodb+srv) but skip for local connections
            if "mongodb+srv://" in db_uri:
                cls.client = AsyncIOMotorClient(
                    db_uri, tlsCAFile=certifi.where(), **cls._CLIENT_KWARGS
                )
            else:
                cls.client = AsyncIOMotorClient(db_uri, **cls._CLIENT_KWARGS)

            cls.db = cls.client[settings.DATABASE_NAME]
            # First round-trip — surfaces auth/network issues early
            await cls.client.admin.command("ping")

            logger.info("Successfully connected to MongoDB! Database: %s", settings.DATABASE_NAME)

            # Ensure unique index on email for the users collection
            await cls.db["users"].create_index("email", unique=True)
            logger.info("Ensured unique index on users.email")
        except Exception as e:
            logger.error("Failed to connect to MongoDB: %s", e)
            if cls.client:
                cls.client.close()
            cls.client = None
            cls.db = None
            raise

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

