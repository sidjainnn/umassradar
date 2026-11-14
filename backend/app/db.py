from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_db() -> AsyncIOMotorDatabase:
    global _client
    settings = get_settings()
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri, tz_aware=True)
    return _client[settings.mongodb_db]


async def ensure_indexes() -> None:
    db = get_db()
    await db.sessions.create_index("token_hash", unique=True)
    await db.sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.oauth_states.create_index("created_at", expireAfterSeconds=900)
    await db.items.create_index([("user_id", 1), ("dedupe_key", 1)], unique=True)
    await db.items.create_index([("user_id", 1), ("status", 1)])
    await db.processed_messages.create_index([("user_id", 1), ("message_id", 1)], unique=True)
    await db.llm_cache.create_index([("user_id", 1), ("message_id", 1)], unique=True)
    await db.office_hours.create_index([("user_id", 1), ("course", 1)])
    await db.housing_posts.create_index([("status", 1), ("kind", 1), ("expires_at", 1)])
    await db.housing_requests.create_index([("to_user", 1)])
    await db.housing_requests.create_index([("from_user", 1)])
