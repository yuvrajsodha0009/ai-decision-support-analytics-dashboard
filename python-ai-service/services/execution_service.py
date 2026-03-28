from functools import lru_cache
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from config import get_settings


@lru_cache(maxsize=1)
def _get_client() -> AsyncIOMotorClient:
    settings = get_settings()
    return AsyncIOMotorClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=settings.mongo_server_selection_timeout_ms,
        connectTimeoutMS=settings.mongo_connect_timeout_ms,
    )


def _normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(row)
    if "_id" in normalized:
        normalized["_id"] = str(normalized["_id"])
    return normalized


async def execute_orders_aggregation(pipeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not pipeline:
        raise ValueError("Aggregation pipeline cannot be empty")

    settings = get_settings()
    database = _get_client()[settings.mongodb_db]
    collection = database["orders"]

    cursor = collection.aggregate(pipeline, allowDiskUse=False)
    rows: list[dict[str, Any]] = []
    async for row in cursor:
        rows.append(_normalize_row(row))

    return rows
