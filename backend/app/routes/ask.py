import time
from collections import defaultdict, deque
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.courses import my_courses
from app.db import get_db
from app.models import now_utc
from app.security import current_user
from app.store import doc_to_item
from llm.ask import ask, build_context

router = APIRouter()

LIMIT, WINDOW = 20, 600  # questions per user per 10 minutes
_recent: dict[str, deque] = defaultdict(deque)


def allowed(user_id: str, now: float | None = None) -> bool:
    now = now or time.monotonic()
    q = _recent[user_id]
    while q and now - q[0] > WINDOW:
        q.popleft()
    if len(q) >= LIMIT:
        return False
    q.append(now)
    return True


class Turn(BaseModel):
    role: Literal["student", "sam"]
    text: str = Field(..., max_length=2000)


class Question(BaseModel):
    question: str = Field(..., min_length=2, max_length=500)
    history: list[Turn] = []


@router.post("/ask")
async def ask_sam(body: Question, user: dict = Depends(current_user)):
    if not get_settings().gemini_api_key:
        raise HTTPException(503, "Ask Sam needs GEMINI_API_KEY on the server.")
    if not allowed(user["_id"]):
        raise HTTPException(429, "That's a lot of questions. Give Sam a few minutes.")
    db = get_db()
    docs = await db.items.find({"user_id": user["_id"], "status": "open", "category": {"$ne": "noise"}}).to_list(400)
    items = sorted((doc_to_item(d) for d in docs), key=lambda i: (i.when is None, i.when or now_utc()))
    mine = await my_courses(user["_id"])
    courses = {c["_id"]: c.get("shared") or {} async for c in db.courses.find({"_id": {"$in": sorted(mine)}}, {"shared": 1})}
    context = build_context(items, user.get("schedule"), courses, user.get("followed_groups", []), now_utc())
    try:
        answer = await ask(body.question, context, [t.model_dump() for t in body.history], user.get("mode", "study"))
    except Exception:
        raise HTTPException(502, "Sam couldn't think of an answer right now. Try again in a minute.")
    known = {i.id: i for i in items}
    cited = [known[i] for i in answer.item_ids if i in known][:6]
    return {
        "answer": answer.answer.strip(),
        "items": [{"id": i.id, "title": i.title, "course": i.course, "when": i.when, "category": i.category} for i in cited],
        "courses": [c for c in answer.courses if c in courses][:4],
    }
