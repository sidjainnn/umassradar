"""Find a room: building, floor, the best door and step-by-step directions, plus walking between classes."""

import time
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.buildings import best_entrances, buildings, directions, meters, norm, resolve
from app.db import get_db
from app.models import now_utc
from app.rooms import floor_guess
from app.security import current_user

router = APIRouter(prefix="/rooms")

WALK_M_PER_MIN = 80
CONFIRMS_NEEDED = 2

_index: dict = {"at": 0.0, "rooms": {}}


async def classes_in_rooms() -> dict[str, list[dict]]:
    """normalized room string -> courses that meet there (built from the catalog, cached for an hour)."""
    if time.monotonic() - _index["at"] < 3600 and _index["rooms"]:
        return _index["rooms"]
    rooms: dict[str, list[dict]] = {}
    async for c in get_db().courses.find({}, {"terms": 1}):
        for term, t in (c.get("terms") or {}).items():
            for s in t.get("sections", []) or []:
                loc = s.get("location")
                if not loc:
                    continue
                b, room = resolve(loc)
                if b and room:
                    rooms.setdefault(f"{b['name']}|{norm(room)}", []).append(
                        {"course": c["_id"], "section": s.get("section"), "days": s.get("days", []),
                         "start": s.get("start"), "end": s.get("end"), "term": term})
    _index.update(at=time.monotonic(), rooms=rooms)
    return rooms


async def confirmed(building: str, room: str) -> dict | None:
    docs = await get_db().room_confirmations.find({"building": building, "room": room}).to_list(200)
    floors = Counter(d["floor"] for d in docs if d.get("floor") is not None)
    if not floors:
        return None
    floor, n = floors.most_common(1)[0]
    if n < CONFIRMS_NEEDED:
        return None
    landmarks = [d["landmark"] for d in docs if d.get("landmark") and d.get("floor") == floor][-3:]
    doors = Counter(d["entrance_id"] for d in docs if d.get("entrance_id") and d.get("floor") == floor)
    return {"floor": floor, "count": n, "landmarks": landmarks, "entrance_id": doors.most_common(1)[0][0] if doors else None}


@router.get("/locate")
async def locate(q: str, accessible: bool = False, user: dict = Depends(current_user)):
    b, room = resolve(q)
    if not b:
        raise HTTPException(404, "Couldn't tell which building that is. Try the code from SPIRE, like “MOR1 N375” or “LGRT 0143”.")
    guess = floor_guess(room) if room else None
    check = await confirmed(b["name"], room) if room else None
    if check and guess:
        guess = {**guess, "floor": check["floor"], "label": f"On floor {check['floor']}, confirmed by {check['count']} students"}
    doors = best_entrances(b, guess.get("wing") if guess else None, guess.get("floor") if guess else None, accessible)
    if check and check.get("entrance_id"):
        doors.sort(key=lambda e: e["id"] != check["entrance_id"])
    meets = (await classes_in_rooms()).get(f"{b['name']}|{norm(room)}", []) if room else []
    tips = await get_db().room_tips.find({"building": b["id"], "room": norm(room) if room else None,
                                         "hidden": {"$ne": True}}).to_list(20) if room else []
    return {
        "query": q,
        "building": {"id": b["id"], "name": b["name"], "center": b["center"], "outline": b["outline"],
                     "levels": b.get("levels")},
        "room": room,
        "floor": guess,
        "confirmed": check,
        "entrances": doors[:4],
        "steps": directions(b, room, guess, doors) + (
            [f"Students say: {t}" for t in (check or {}).get("landmarks", [])]),
        "classes_here": sorted(meets, key=lambda m: (m["term"], m["course"]))[:12],
        "tips": [t["text"] for t in tips],
        "source": "Building outlines and doors from OpenStreetMap.",
    }


@router.get("/route")
async def route(frm: str, to: str, user: dict = Depends(current_user)):
    """Walking between two rooms (e.g. back-to-back classes): rough minutes and which doors to use."""
    a, _ = resolve(frm)
    b, room_b = resolve(to)
    if not a or not b:
        raise HTTPException(404, "Couldn't find one of those buildings.")
    g = floor_guess(room_b) if room_b else None
    exit_a = min(a["entrances"], key=lambda e: meters(e["at"], b["center"]), default=None)
    door_b = min(b["entrances"], key=lambda e: meters(e["at"], a["center"]), default=None) if not (g and g.get("wing")) \
        else (best_entrances(b, g.get("wing"), g.get("floor")) or [None])[0]
    start = exit_a["at"] if exit_a else a["center"]
    end = door_b["at"] if door_b else b["center"]
    dist = meters(start, end) * 1.3  # paths aren't straight lines
    return {"from": a["name"], "to": b["name"], "meters": round(dist), "minutes": max(1, round(dist / WALK_M_PER_MIN)),
            "exit": exit_a, "enter": door_b, "same_building": a["name"] == b["name"]}


class Confirm(BaseModel):
    floor: int = Field(..., ge=-2, le=25)
    entrance_id: str | None = Field(None, max_length=40)
    landmark: str | None = Field(None, max_length=140)


@router.post("/confirm")
async def confirm(q: str, body: Confirm, user: dict = Depends(current_user)):
    """'I found it': records where a room really is. Two matching confirmations override the guess."""
    if user.get("demo"):
        raise HTTPException(403, "Sign in with your UMass account to confirm rooms.")
    b, room = resolve(q)
    if not b or not room:
        raise HTTPException(404, "Give a building and room, like “MOR1 N375”.")
    if body.entrance_id and body.entrance_id not in {e["id"] for e in b["entrances"]}:
        raise HTTPException(400, "That door isn't part of this building.")
    await get_db().room_confirmations.update_one(
        {"user_id": user["_id"], "building": b["name"], "room": room},
        {"$set": {"floor": body.floor, "entrance_id": body.entrance_id, "landmark": (body.landmark or "").strip() or None,
                  "at": now_utc()}}, upsert=True)
    return {"ok": True, "confirmed": await confirmed(b["name"], room)}


@router.get("/buildings")
async def all_buildings(user: dict = Depends(current_user)):
    """Every building with its outline and doors, for drawing the map."""
    return [{"id": b["id"], "name": b["name"], "center": b["center"], "outline": b["outline"],
             "entrances": b["entrances"], "levels": b.get("levels")} for b in buildings().values()]
