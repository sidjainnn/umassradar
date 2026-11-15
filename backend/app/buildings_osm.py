"""One-time import of UMass building outlines and entrances from OpenStreetMap into seed/buildings.json.

Run: python -m app.buildings_osm. The app reads the saved file and never calls OpenStreetMap at runtime.
Data (c) OpenStreetMap contributors, ODbL.
"""

import json
import math
from pathlib import Path

import httpx

OVERPASS = "https://overpass-api.de/api/interpreter"
BBOX = "42.375,-72.545,42.400,-72.510"  # UMass Amherst main campus
OUT = Path(__file__).resolve().parents[1] / "seed" / "buildings.json"
QUERY = f"""[out:json][timeout:90];
(way["building"]["name"]({BBOX}); relation["building"]["name"]({BBOX}););
out geom tags;
node["entrance"]({BBOX});
out body;"""


def meters(a, b) -> float:
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


def outline_of(el: dict) -> list[list[float]]:
    if el["type"] == "way":
        pts = [[p["lat"], p["lon"]] for p in el.get("geometry", [])]
    else:
        pts = [[p["lat"], p["lon"]] for m in el.get("members", []) if m.get("role") == "outer" for p in m.get("geometry", [])]
    step = max(1, len(pts) // 40)
    return [[round(a, 6), round(b, 6)] for a, b in pts[::step]]


def main() -> None:
    r = httpx.post(OVERPASS, data={"data": QUERY}, headers={"User-Agent": "campus-map-builder/1.0"}, timeout=120)
    r.raise_for_status()
    els = r.json()["elements"]
    buildings, entrances = [], []
    for el in els:
        if el["type"] == "node":
            t = el.get("tags", {})
            entrances.append({"id": f"n{el['id']}", "at": [round(el["lat"], 6), round(el["lon"], 6)], "level": t.get("level"),
                              "wheelchair": t.get("wheelchair"), "name": t.get("name") or t.get("ref"),
                              "kind": t.get("entrance")})
        else:
            pts = outline_of(el)
            if len(pts) < 3:
                continue
            center = [round(sum(p[0] for p in pts) / len(pts), 6), round(sum(p[1] for p in pts) / len(pts), 6)]
            t = el["tags"]
            buildings.append({"id": f"{el['type'][0]}{el['id']}", "name": t["name"], "short": t.get("short_name") or t.get("alt_name"),
                              "levels": t.get("building:levels"), "center": center, "outline": pts, "entrances": []})
    # each entrance belongs to the building whose outline it is closest to (within 12 m)
    for e in entrances:
        best = min(buildings, key=lambda b: min(meters(e["at"], p) for p in b["outline"]), default=None)
        if best and min(meters(e["at"], p) for p in best["outline"]) <= 12:
            best["entrances"].append(e)
    buildings.sort(key=lambda b: b["name"])
    OUT.write_text(json.dumps({"source": "OpenStreetMap contributors (ODbL)", "buildings": buildings}, indent=1))
    print(f"{len(buildings)} buildings, {sum(len(b['entrances']) for b in buildings)} entrances -> {OUT}")


if __name__ == "__main__":
    main()
