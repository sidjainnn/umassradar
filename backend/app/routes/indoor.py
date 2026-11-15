"""Indoor maps and room-to-room directions inside classroom buildings."""

from fastapi import APIRouter, Depends, HTTPException

from app.buildings import resolve
from app.indoor import building_floors, classrooms, route, to_geojsonish
from app.security import current_user

router = APIRouter(prefix="/indoor")


@router.get("/buildings")
async def indoor_buildings(user: dict = Depends(current_user)):
    """Buildings that have indoor maps, with how many classrooms and floors each has."""
    out = []
    for name, rooms in sorted(classrooms().items()):
        data = building_floors(name)
        if data:
            out.append({"building": name, "id": data["id"], "center": data["center"], "classrooms": len(rooms),
                        "floors": [f["level"] for f in data["floors"]],
                        "traced": any(f["source"] == "traced" for f in data["floors"])})
    return out


@router.get("/route")
async def indoor_route(to: str, accessible: bool = False, entrance: str | None = None, user: dict = Depends(current_user)):
    """From a building door to a classroom: per-floor route lines and plain-language steps."""
    r = route(to, accessible, entrance)
    if r is None:
        raise HTTPException(404, "Couldn't find that classroom. Try the SPIRE code, like “ILC S220”.")
    if not r.get("found"):
        raise HTTPException(404, f"{r['room']} isn't in the official classroom list for {r['building']}.")
    return r


@router.get("/{building}")
async def indoor_building(building: str, user: dict = Depends(current_user)):
    """Every floor of a building: rooms (with numbers), hallways, stairs, elevators and doors, as [lat, lon]."""
    b, _ = resolve(building)
    data = building_floors(b["name"]) if b else None
    if not data:
        raise HTTPException(404, "No indoor map for that building yet.")
    return to_geojsonish(data)
