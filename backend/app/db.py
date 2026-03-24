"""
FinSight AI -- Database Manager
================================
Sets up async MongoDB connection using Motor.
Provides easy access to collections via `get_collection()`.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import certifi
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    def connect_to_database(cls, uri: str = None):
        """Initialize MongoDB Async Client."""
        db_uri = uri or settings.MONGODB_URI
        logger.info(f"Connecting to MongoDB at {db_uri[:40]}...")
        try:
            cls.client = AsyncIOMotorClient(db_uri, tlsCAFile=certifi.where())
            cls.db = cls.client[settings.DATABASE_NAME]
            logger.info(f"Successfully connected to MongoDB! Database: {settings.DATABASE_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise e

    @classmethod
    def close_database_connection(cls):
        """Close connection on app shutdown."""
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed.")

    @classmethod
    def get_collection(cls, collection_name: str):
        """Helper to get a specific DB collection."""
        if cls.db is None:
            cls.connect_to_database()
        return cls.db[collection_name]


# Convenient exports
db_manager = DatabaseManager()

def get_expenses_collection():
    return db_manager.get_collection("expenses")

def get_users_collection():
    return db_manager.get_collection("users")

