"""The application tracker built from your email."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.applications import AppSignal, record
from app.db import get_db
from app.models import now_utc
from app.security import current_user

router = APIRouter()


@router.get("/applications")
async def applications(user: dict = Depends(current_user)):
    now = now_utc()
    docs = await get_db().applications.find({"user_id": user["_id"]}).sort("last_at", -1).to_list(300)
    out = []
    for d in docs:
        last = d["last_at"] if d["last_at"].tzinfo else d["last_at"].replace(tzinfo=now.tzinfo)
        out.append({"id": d["_id"], "company": d["company"], "role": d.get("role") or None, "stage": d["stage"],
                    "first_at": d["first_at"], "last_at": d["last_at"], "days_quiet": (now - last).days,
                    "history": [{"stage": h["stage"], "at": h["at"]} for h in d.get("history", [])]})
    return out


class ManualApp(BaseModel):
    company: str
    role: str = ""
    stage: str = "applied"


@router.post("/applications")
async def add_application(body: ManualApp, user: dict = Depends(current_user)):
    """Track an application by hand (e.g. one sent from a personal email)."""
    if body.stage not in ("applied", "interview", "offer", "rejected") or not body.company.strip():
        raise HTTPException(400, "Give a company and a stage: applied, interview, offer or rejected.")
    await record(user["_id"], AppSignal(company=body.company.strip()[:60], role=body.role.strip()[:80], stage=body.stage,
                                        at=now_utc(), subject="Added by you"))
    return {"ok": True}


@router.delete("/applications/{app_id}")
async def delete_application(app_id: str, user: dict = Depends(current_user)):
    r = await get_db().applications.delete_one({"_id": app_id, "user_id": user["_id"]})
    if not r.deleted_count:
        raise HTTPException(404, "Not found.")
    return {"ok": True}
