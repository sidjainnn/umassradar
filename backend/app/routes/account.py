from fastapi import APIRouter, Cookie, Depends, Response

from app.security import current_user, end_session
from app.store import delete_user_data
from app.sync import sync_user

router = APIRouter()


@router.post("/sync")
async def sync_now(full: bool = False, user: dict = Depends(current_user)):
    if user.get("demo"):
        return {"status": "ok", "new_messages": 0, "items": 0, "message": "Demo inbox doesn't sync."}
    return await sync_user(user["_id"], full=full)


@router.delete("/account")
async def delete_account(
    response: Response, user: dict = Depends(current_user), radar_session: str | None = Cookie(default=None)
):
    """Delete everything stored for this user: items, processed ids, cache, sessions, tokens."""
    await delete_user_data(user["_id"])
    await end_session(response, radar_session)
    return {"ok": True}
