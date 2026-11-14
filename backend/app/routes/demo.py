"""Demo mode: a realistic fake UMass inbox run through the real pipeline, no Google login."""

import json
import secrets
from pathlib import Path
from datetime import timedelta

from fastapi import APIRouter, Response

from app.db import get_db
from app.models import now_utc
from app.pipeline import process_emails
from app.security import create_session
from app.store import delete_user_data, save_items
from demo.loader import load_demo_emails

router = APIRouter()


@router.post("/demo/load")
async def load_demo(response: Response):
    db = get_db()
    # tidy up demo users from previous days
    async for old in db.users.find({"demo": True, "created_at": {"$lt": now_utc() - timedelta(days=1)}}, {"_id": 1}):
        await delete_user_data(old["_id"])

    user_id = f"demo-{secrets.token_hex(6)}"
    schedule = json.loads((Path(__file__).parents[2] / "demo" / "schedule.json").read_text())
    await db.users.insert_one(
        {"_id": user_id, "demo": True, "name": "Demo Student", "email": "demo@umass.edu",
         "created_at": now_utc(), "last_sync_at": now_utc(),
         "schedule": {**schedule, "uploaded_at": now_utc()}}
    )
    items = await process_emails(load_demo_emails(), user_id, cache_user="demo-shared")
    for item in items:
        item.source = "demo"
        item.url = None
    await save_items(user_id, items)
    await create_session(response, user_id)
    return {"ok": True, "items": len(items)}
