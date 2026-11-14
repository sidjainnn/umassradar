"""Housing guide and board."""

import re
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import get_db
from app.housing import MATCH_KINDS, POST_DAYS, HousingPost, match, public_view, scam_flags
from app.models import now_utc
from app.security import current_user
from app.store import doc_to_item

router = APIRouter(prefix="/housing")

REPORTS_TO_HIDE = 3


def _visible(user: dict) -> dict:
    """Open, unexpired posts. Demo users see the sample posts; real users never do."""
    return {"status": "open", "expires_at": {"$gt": now_utc()}, "hidden": {"$ne": True},
            "sample": True if user.get("demo") else {"$ne": True}}


def _jsonable(post: HousingPost) -> dict:
    d = post.model_dump()
    for k in ("start", "end"):
        if isinstance(d.get(k), date):
            d[k] = datetime(d[k].year, d[k].month, d[k].day)
    return d


@router.get("/posts")
async def list_posts(kind: str = "", area: str = "", max_rent: int | None = None, user: dict = Depends(current_user)):
    query = _visible(user)
    if kind:
        query["kind"] = {"$in": kind.split(",")}
    if area:
        query["area"] = area
    if max_rent is not None:
        query["rent"] = {"$lte": max_rent}
    docs = await get_db().housing_posts.find(query).sort("created_at", -1).to_list(300)
    return [public_view(d, user["_id"]) for d in docs]


@router.post("/posts")
async def create_post(body: HousingPost, user: dict = Depends(current_user)):
    if user.get("demo"):
        raise HTTPException(403, "Sign in with your UMass account to post.")
    db = get_db()
    if await db.housing_posts.count_documents({"user_id": user["_id"], "status": "open", "expires_at": {"$gt": now_utc()}}) >= 5:
        raise HTTPException(400, "You can have up to 5 open posts. Close one first.")
    now = now_utc()
    doc = {
        "_id": uuid.uuid4().hex, "user_id": user["_id"], **_jsonable(body), "status": "open",
        "created_at": now, "expires_at": now + timedelta(days=POST_DAYS),
        "warnings": scam_flags(f"{body.title} {body.description}"), "reports": [],
    }
    await db.housing_posts.insert_one(doc)
    return public_view(doc, user["_id"])


@router.patch("/posts/{post_id}")
async def close_post(post_id: str, user: dict = Depends(current_user)):
    r = await get_db().housing_posts.update_one({"_id": post_id, "user_id": user["_id"]}, {"$set": {"status": "closed"}})
    if not r.matched_count:
        raise HTTPException(404, "Post not found.")
    return {"ok": True}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(current_user)):
    db = get_db()
    r = await db.housing_posts.delete_one({"_id": post_id, "user_id": user["_id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Post not found.")
    await db.housing_requests.delete_many({"post_id": post_id})
    return {"ok": True}


class ConnectBody(BaseModel):
    message: str = Field("", max_length=600)


@router.post("/posts/{post_id}/connect")
async def connect(post_id: str, body: ConnectBody, user: dict = Depends(current_user)):
    db = get_db()
    post = await db.housing_posts.find_one({"_id": post_id, **_visible(user)})
    if not post:
        raise HTTPException(404, "That post isn't open anymore.")
    if post["user_id"] == user["_id"]:
        raise HTTPException(400, "That's your own post.")
    if post.get("sample"):
        return {"ok": True, "sample": True}  # demo: pretend it was sent
    existing = await db.housing_requests.find_one({"post_id": post_id, "from_user": user["_id"]})
    if existing:
        return {"ok": True, "already": True}
    await db.housing_requests.insert_one({
        "_id": uuid.uuid4().hex, "post_id": post_id, "to_user": post["user_id"], "from_user": user["_id"],
        "message": body.message.strip(), "status": "pending", "created_at": now_utc(),
    })
    return {"ok": True}


@router.get("/requests")
async def requests(user: dict = Depends(current_user)):
    """Requests on your posts (incoming) and the ones you sent (outgoing). Emails appear only once accepted."""
    db = get_db()
    out = {"incoming": [], "outgoing": []}
    reqs = await db.housing_requests.find({"$or": [{"to_user": user["_id"]}, {"from_user": user["_id"]}]}).sort("created_at", -1).to_list(200)
    posts = {p["_id"]: p async for p in db.housing_posts.find({"_id": {"$in": [r["post_id"] for r in reqs]}})}
    people = {u["_id"]: u async for u in db.users.find(
        {"_id": {"$in": list({r["to_user"] for r in reqs} | {r["from_user"] for r in reqs})}}, {"email": 1, "profile": 1, "name": 1})}
    for r in reqs:
        post = posts.get(r["post_id"])
        if not post:
            continue
        incoming = r["to_user"] == user["_id"]
        other = people.get(r["from_user"] if incoming else r["to_user"], {})
        first = (other.get("profile") or {}).get("preferred_name") or (other.get("name") or "").split(" ")[0] or "A UMass student"
        out["incoming" if incoming else "outgoing"].append({
            "id": r["_id"], "post_id": post["_id"], "post_title": post["title"], "status": r["status"],
            "message": r.get("message", ""), "created_at": r["created_at"], "name": first,
            "email": other.get("email") if r["status"] == "accepted" else None,
        })
    return out


class Decision(BaseModel):
    accept: bool


@router.post("/requests/{request_id}")
async def decide(request_id: str, body: Decision, user: dict = Depends(current_user)):
    r = await get_db().housing_requests.update_one(
        {"_id": request_id, "to_user": user["_id"], "status": "pending"},
        {"$set": {"status": "accepted" if body.accept else "declined", "decided_at": now_utc()}},
    )
    if not r.matched_count:
        raise HTTPException(404, "Request not found.")
    return {"ok": True}


class ReportBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=300)


@router.post("/posts/{post_id}/report")
async def report(post_id: str, body: ReportBody, user: dict = Depends(current_user)):
    db = get_db()
    post = await db.housing_posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(404, "Post not found.")
    if any(r["by"] == user["_id"] for r in post.get("reports", [])):
        return {"ok": True}
    reports = post.get("reports", []) + [{"by": user["_id"], "reason": body.reason.strip(), "at": now_utc()}]
    update = {"reports": reports}
    if len(reports) >= REPORTS_TO_HIDE:
        update["hidden"] = True  # hidden until someone reviews it
    await db.housing_posts.update_one({"_id": post_id}, {"$set": update})
    return {"ok": True}


@router.get("/mine")
async def my_posts(user: dict = Depends(current_user)):
    docs = await get_db().housing_posts.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(50)
    return [public_view(d, user["_id"]) for d in docs]


@router.get("/matches")
async def matches(user: dict = Depends(current_user)):
    """For each of your open posts, the best-fitting posts from other students."""
    db = get_db()
    if user.get("demo"):
        mine = await db.housing_posts.find({"sample_mine": True, "sample": True}).to_list(5)
    else:
        mine = await db.housing_posts.find({"user_id": user["_id"], "status": "open", "expires_at": {"$gt": now_utc()}}).to_list(5)
    out = []
    for post in mine:
        candidates = await db.housing_posts.find({**_visible(user), "kind": {"$in": MATCH_KINDS[post["kind"]]},
                                                  "_id": {"$ne": post["_id"]}, "user_id": {"$ne": post["user_id"]}}).to_list(300)
        scored = []
        for c in candidates:
            score, reasons = match(c, post) if post["kind"] == "sublet_offer" else match(post, c)
            scored.append({**public_view(c, user["_id"]), "score": score, "reasons": reasons})
        scored.sort(key=lambda x: -x["score"])
        out.append({"post": public_view(post, user["_id"]), "matches": [s for s in scored if s["score"] >= 50][:6]})
    return out


HOUSING_WORDS = re.compile(r"\b(housing|room selection|room assignment|residence hall|res ?life|lease|sublet|move[- ]in|move[- ]out|"
                           r"rent|landlord|roommate|dorm|apartment|security deposit)\b", re.I)


@router.get("/timeline")
async def timeline(user: dict = Depends(current_user)):
    """Housing dates and deadlines already found in your email and imports."""
    docs = await get_db().items.find({"user_id": user["_id"], "status": "open",
                                      "category": {"$in": ["deadline", "appointment", "event", "opportunity", "status_update"]}}).to_list(1000)
    items = [doc_to_item(d) for d in docs]
    picked = [i for i in items if HOUSING_WORDS.search(f"{i.title} {i.evidence} {i.sender}") or
              any(k in (i.sender or "").lower() for k in ("residential life", "housing", "reslife"))]
    picked.sort(key=lambda i: (i.when or i.received_at or now_utc()))
    return [i.model_dump(mode="json") for i in picked[:30]]
