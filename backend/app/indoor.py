"""Indoor maps: floors, rooms, hallways, stairs and elevators for each classroom building, and routes inside them.

Two kinds of floor:
- "traced": drawn from a real posted floor plan (the ILC's first floor, from its fire-evacuation plan).
- "generated": laid out from the registrar's official room list and the building outline. Rooms are on the
  right floor and side and in number order, but their exact positions are approximate.

Everything is computed in local meters (x east, y north) around the building center, then returned as [lat, lon].
"""

import heapq
import json
import math
import re
from functools import lru_cache
from pathlib import Path

from app.buildings import buildings, norm, resolve
from app.rooms import floor_guess

SEED = Path(__file__).resolve().parents[1] / "seed"
M_PER_DEG_LAT = 111_320
CORRIDOR_W = 3.0
FLOOR_COST_STAIRS = 12.0   # meters-equivalent for one flight
FLOOR_COST_ELEVATOR = 20.0


# ---------- coordinates ----------

def to_local(center, p):
    return ((p[1] - center[1]) * M_PER_DEG_LAT * math.cos(math.radians(center[0])), (p[0] - center[0]) * M_PER_DEG_LAT)


def to_latlon(center, xy):
    x, y = xy
    return [round(center[0] + y / M_PER_DEG_LAT, 7), round(center[1] + x / (M_PER_DEG_LAT * math.cos(math.radians(center[0]))), 7)]


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


# ---------- the room list ----------

@lru_cache
def classrooms() -> dict[str, list[dict]]:
    """building name -> registrar classrooms in it."""
    data = json.loads((SEED / "classrooms.json").read_text())["rooms"] if (SEED / "classrooms.json").exists() else []
    out: dict[str, list[dict]] = {}
    for r in data:
        b, room = resolve(r["code"])
        if b and room:
            g = floor_guess(room)
            out.setdefault(b["name"], []).append({**r, "room": room, "floor": g["floor"] if g["floor"] is not None else 1,
                                                  "wing": g["wing"]})
    return out


def _room_order(r: dict):
    m = re.search(r"\d+", r["room"])
    return (r["floor"], r.get("wing") or "", int(m.group()) if m else 0, r["room"])


# ---------- generated floors ----------

def _axes(points):
    """Long axis direction and extents of a building outline (principal component)."""
    if len(points) < 3:
        return (1.0, 0.0), (-20, 20), (-8, 8)
    mx = sum(p[0] for p in points) / len(points)
    my = sum(p[1] for p in points) / len(points)
    sxx = sum((p[0] - mx) ** 2 for p in points)
    syy = sum((p[1] - my) ** 2 for p in points)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in points)
    angle = 0.5 * math.atan2(2 * sxy, sxx - syy)
    u = (math.cos(angle), math.sin(angle))
    v = (-u[1], u[0])
    us = [(p[0] - mx) * u[0] + (p[1] - my) * u[1] for p in points]
    vs = [(p[0] - mx) * v[0] + (p[1] - my) * v[1] for p in points]
    return u, (min(us), max(us)), (min(vs), max(vs)), (mx, my)


def _frame(b):
    pts = [to_local(b["center"], p) for p in b.get("outline", [])]
    if len(pts) >= 3:
        u, (u0, u1), (v0, v1), origin = _axes(pts)
    else:
        u, (u0, u1), (v0, v1), origin = (1.0, 0.0), (-25, 25), (-10, 10), (0.0, 0.0)
    v = (-u[1], u[0])
    shrink_u, shrink_v = 0.85, 0.8
    cu, cv = (u0 + u1) / 2, (v0 + v1) / 2
    half_len = max(12.0, (u1 - u0) / 2 * shrink_u)
    half_w = max(8.0, (v1 - v0) / 2 * shrink_v)

    def at(s, t):  # s along the long axis, t across it
        return (origin[0] + (cu + s) * u[0] + (cv + t) * v[0], origin[1] + (cu + s) * u[1] + (cv + t) * v[1])
    return at, half_len, half_w


def generated_floor(b: dict, level: int, rooms: list[dict]) -> dict:
    """One corridor down the long axis, rooms on both sides in number order, stairs at the ends, elevator mid."""
    at, L, W = _frame(b)
    depth = min(W - CORRIDOR_W / 2, 12.0)
    rooms = sorted(rooms, key=_room_order)
    # wing letters put rooms on that end/side; plain numbers alternate sides
    sides = {"A": [], "B": []}
    for i, r in enumerate(rooms):
        if r.get("wing") in ("north", "east"):
            sides["A"].append(r)
        elif r.get("wing") in ("south", "west"):
            sides["B"].append(r)
        else:
            sides["A" if i % 2 == 0 else "B"].append(r)
    usable = 2 * L - 8.0  # leave room for stairs at both ends
    out_rooms = []
    for side, sign in (("A", 1), ("B", -1)):
        lst = sides[side]
        if not lst:
            continue
        weights = [max(1.0, math.sqrt(r["capacity"])) for r in lst]
        total = sum(weights)
        s = -L + 4.0
        for r, w in zip(lst, weights):
            length = usable * w / total
            s0, s1 = s + 0.3, s + length - 0.3
            t0, t1 = sign * CORRIDOR_W / 2, sign * (CORRIDOR_W / 2 + depth)
            poly = [at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)]
            out_rooms.append({"code": r["code"], "room": r["room"], "capacity": r["capacity"], "features": r["features"],
                              "polygon": poly, "door": at((s0 + s1) / 2, t0), "side": side})
            s += length
    corridor = [at(-L + 1.5, 0), at(L - 1.5, 0)]
    return {"level": level, "source": "generated", "rooms": out_rooms, "corridors": [corridor],
            "stairs": [at(-L + 1.5, 0), at(L - 1.5, 0)], "elevators": [at(0, 0)], "other": []}


# ---------- the traced ILC floor ----------

@lru_cache
def traced() -> dict[str, dict]:
    out = {}
    for f in (SEED / "indoor").glob("*_trace.json"):
        t = json.loads(f.read_text())
        out[t["building"]] = t
    return out


def _inside(pt, poly) -> bool:
    x, y = pt
    hit = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


@lru_cache(maxsize=16)
def _fit_params(name: str):
    """Rotation, scale and offset that best lay the traced outline over the building's real outline.

    Tries rotations every degree; for each, scales to the same area and centers it, then scores how much of
    each shape falls inside the other (sampled on a grid).
    """
    b, t = buildings()[name], traced()[name]
    geo = [to_local(b["center"], p) for p in b["outline"]]
    img = [(x, -y) for x, y in t["outline"]]  # image y grows downward
    gcx, gcy = sum(p[0] for p in geo) / len(geo), sum(p[1] for p in geo) / len(geo)
    icx, icy = sum(p[0] for p in img) / len(img), sum(p[1] for p in img) / len(img)
    scale = math.sqrt(_area(geo) / _area(img))

    def place(theta, k, dx, dy):
        c, s_ = math.cos(theta), math.sin(theta)
        return lambda p: (gcx + dx + k * ((p[0] - icx) * c - (p[1] - icy) * s_), gcy + dy + k * ((p[0] - icx) * s_ + (p[1] - icy) * c))

    gx0, gx1 = min(p[0] for p in geo), max(p[0] for p in geo)
    gy0, gy1 = min(p[1] for p in geo), max(p[1] for p in geo)
    grid = [(gx0 + (gx1 - gx0) * i / 24, gy0 + (gy1 - gy0) * j / 24) for i in range(25) for j in range(25)]
    inside_geo = [g for g in grid if _inside(g, geo)]

    def score(f):
        poly = [f(p) for p in img]
        covered = sum(_inside(g, poly) for g in inside_geo) / max(1, len(inside_geo))
        kept = sum(_inside(f(p), geo) for p in img) / len(img)
        return covered + kept

    best = None
    for deg in range(-45, 46, 2):
        f = place(math.radians(deg), scale, 0, 0)
        sc = score(f)
        if best is None or sc > best[0]:
            best = (sc, deg, scale, 0.0, 0.0)
    _, deg, k, dx, dy = best
    for step in (2.0, 1.0, 0.5):  # small refinements of angle, size and position
        for d_deg in (-step, 0, step):
            for d_k in (0.97, 1.0, 1.03):
                for ddx in (-step, 0, step):
                    for ddy in (-step, 0, step):
                        cand = (deg + d_deg, k * d_k, dx + ddx, dy + ddy)
                        sc = score(place(math.radians(cand[0]), cand[1], cand[2], cand[3]))
                        if sc > best[0]:
                            best = (sc, *cand)
        _, deg, k, dx, dy = best
    return math.radians(deg), k, dx, dy


def _fit_image(b: dict, t: dict):
    theta, k, dx, dy = _fit_params(b["name"])
    geo = [to_local(b["center"], p) for p in b["outline"]]
    img = [(x, -y) for x, y in t["outline"]]
    gcx, gcy = sum(p[0] for p in geo) / len(geo), sum(p[1] for p in geo) / len(geo)
    icx, icy = sum(p[0] for p in img) / len(img), sum(p[1] for p in img) / len(img)
    c, s_ = math.cos(theta), math.sin(theta)

    def f(px):
        x, y = px[0], -px[1]
        return (gcx + dx + k * ((x - icx) * c - (y - icy) * s_), gcy + dy + k * ((x - icx) * s_ + (y - icy) * c))
    return f


def traced_floors(b: dict, t: dict, rooms: list[dict]) -> list[dict]:
    """The traced floor, plus upper floors that reuse its hallways and room slots for that floor's rooms."""
    f = _fit_image(b, t)
    by_floor: dict[int, list[dict]] = {}
    for r in rooms:
        by_floor.setdefault(r["floor"], []).append(r)
    floors = []
    for level in sorted(by_floor):
        todo = sorted(by_floor[level], key=lambda r: -r["capacity"])
        slots = list(t["rooms"])
        placed = []
        for r in todo:
            wing = (r.get("wing") or "")[:1].upper()
            options = [s for s in slots if s["wing"] == wing] or slots
            if not options:
                break
            # biggest rooms take the biggest slots
            slot = max(options, key=lambda s: _area([f(p) for p in s["polygon"]]))
            slots.remove(slot)
            placed.append({"code": r["code"], "room": r["room"], "capacity": r["capacity"], "features": r["features"],
                           "polygon": [f(p) for p in slot["polygon"]], "door": f(slot["door"]), "side": slot["wing"]})
        floors.append({"level": level, "source": "traced" if level == t["level"] else "generated",
                       "rooms": placed, "corridors": [[f(p) for p in c] for c in t["corridors"]],
                       "stairs": [f(p) for p in t["stairs"]], "elevators": [f(p) for p in t["elevators"]],
                       "other": [{"label": o["label"], "polygon": [f(p) for p in o["polygon"]]} for o in t.get("other", [])],
                       "entrances_local": [f(p) for p in t["entrances"]] if level == t["level"] else []})
    return floors


def _area(poly):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))) / 2


# ---------- per building ----------

@lru_cache(maxsize=128)
def building_floors(name: str) -> dict | None:
    b = buildings().get(name)
    rooms = classrooms().get(name, [])
    if not b or not rooms:
        return None
    t = traced().get(name)
    if t and b.get("outline"):
        floors = traced_floors(b, t, rooms)
    else:
        by_floor: dict[int, list[dict]] = {}
        for r in rooms:
            by_floor.setdefault(r["floor"], []).append(r)
        floors = [generated_floor(b, lvl, rs) for lvl, rs in sorted(by_floor.items())]
    levels = [fl["level"] for fl in floors]
    ground = 0 if 0 in levels else 1
    template = floors[0]
    have = set(levels)
    for lvl in range(ground, max(levels) + 1):
        if lvl not in have:
            if t and b.get("outline"):
                floors.append({**{k: template[k] for k in ("corridors", "stairs", "elevators")}, "level": lvl,
                               "source": "generated", "rooms": [], "other": []})
            else:
                floors.append({**generated_floor(b, lvl, []), "rooms": []})
    floors.sort(key=lambda fl: fl["level"])
    levels = [fl["level"] for fl in floors]
    # entrances: traced ones where we have them, else OpenStreetMap doors on the ground floor
    entrances = []
    for fl in floors:
        for i, p in enumerate(fl.pop("entrances_local", [])):
            entrances.append({"id": f"t{i}", "level": fl["level"], "xy": p})
    if not entrances:
        for e in b.get("entrances", []):
            lvl = int(e["level"]) if (e.get("level") or "").isdigit() and int(e["level"]) in levels else ground
            entrances.append({"id": e["id"], "level": lvl, "xy": to_local(b["center"], e["at"])})
    if not entrances:
        at, L, _ = _frame(b)
        entrances = [{"id": "main", "level": ground, "xy": at(-L, 0)}]
    return {"building": b["name"], "id": b["id"], "center": b["center"], "floors": floors, "entrances": entrances,
            "ground": ground}


def to_geojsonish(data: dict) -> dict:
    """The building's floors with every point as [lat, lon], for the apps."""
    c = data["center"]
    conv = lambda pts: [to_latlon(c, p) for p in pts]  # noqa: E731
    return {
        "building": data["building"], "id": data["id"], "center": c, "ground_floor": data["ground"],
        "entrances": [{"id": e["id"], "level": e["level"], "at": to_latlon(c, e["xy"])} for e in data["entrances"]],
        "floors": [{
            "level": fl["level"], "source": fl["source"],
            "rooms": [{"code": r["code"], "room": r["room"], "capacity": r["capacity"], "features": r["features"],
                       "polygon": conv(r["polygon"]), "door": to_latlon(c, r["door"])} for r in fl["rooms"]],
            "corridors": [conv(cor) for cor in fl["corridors"]],
            "stairs": conv(fl["stairs"]), "elevators": conv(fl["elevators"]),
            "other": [{"label": o["label"], "polygon": conv(o["polygon"])} for o in fl.get("other", [])],
        } for fl in data["floors"]],
    }


# ---------- routing ----------

def _nearest_on_segment(p, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy)))
    return (ax + t * dx, ay + t * dy)


def _snap(p, corridors):
    best = None
    for ci, c in enumerate(corridors):
        for si, (a, b) in enumerate(zip(c, c[1:])):
            q = _nearest_on_segment(p, a, b)
            d = dist(p, q)
            if best is None or d < best[0]:
                best = (d, q, ci, si)
    return best


def build_graph(data: dict, accessible: bool):
    """Nodes are (level, kind, id); edges have lengths in meters."""
    nodes: dict = {}
    edges: dict = {}

    def add(n, xy):
        nodes[n] = xy
        edges.setdefault(n, [])

    def link(a, b, w=None):
        w = dist(nodes[a], nodes[b]) if w is None else w
        edges[a].append((b, w))
        edges[b].append((a, w))

    for fl in data["floors"]:
        lvl, cors = fl["level"], fl["corridors"]
        # points on each corridor: its vertices plus every snapped feature, linked in order
        on: dict[tuple, list] = {}
        for ci, c in enumerate(cors):
            for si, p in enumerate(c):
                n = (lvl, "c", f"{ci}.{si}")
                add(n, p)
                on.setdefault((ci, max(0, si - 1)), []).append((n, p))
                if si < len(c) - 1:
                    on.setdefault((ci, si), []).append((n, p))

        def attach(n, xy):
            snap = _snap(xy, cors)
            if not snap:
                return
            _, q, ci, si = snap
            sn = (lvl, "s", n[2] + n[1])
            add(sn, q)
            link(n, sn)
            on.setdefault((ci, si), []).append((sn, q))

        for r in fl["rooms"]:
            n = (lvl, "room", norm(r["code"]))
            add(n, r["door"])
            attach(n, r["door"])
        for i, p in enumerate(fl["stairs"]):
            n = (lvl, "stairs", str(i))
            add(n, p)
            attach(n, p)
        for i, p in enumerate(fl["elevators"]):
            n = (lvl, "elevator", str(i))
            add(n, p)
            attach(n, p)
        for e in data["entrances"]:
            if e["level"] == lvl:
                n = (lvl, "entrance", e["id"])
                add(n, e["xy"])
                attach(n, e["xy"])
        for (ci, si), pts in on.items():
            a = cors[ci][si]
            pts.sort(key=lambda x: dist(a, x[1]))
            for (n1, _), (n2, _) in zip(pts, pts[1:]):
                link(n1, n2)
    levels = sorted(fl["level"] for fl in data["floors"])
    for lo, hi in zip(levels, levels[1:]):
        for kind, cost in (("elevator", FLOOR_COST_ELEVATOR), ("stairs", FLOOR_COST_STAIRS)):
            if kind == "stairs" and accessible:
                continue
            i = 0
            while (lo, kind, str(i)) in nodes and (hi, kind, str(i)) in nodes:
                link((lo, kind, str(i)), (hi, kind, str(i)), cost * (hi - lo))
                i += 1
    return nodes, edges


def shortest(nodes, edges, starts: list, goal):
    pq = [(0.0, s, None) for s in starts]
    best, prev = {}, {}
    while pq:
        d, n, p = heapq.heappop(pq)
        if n in best:
            continue
        best[n], prev[n] = d, p
        if n == goal:
            break
        for m, w in edges.get(n, []):
            if m not in best:
                heapq.heappush(pq, (d + w, m, n))
    if goal not in best:
        return None, None
    path, n = [], goal
    while n is not None:
        path.append(n)
        n = prev[n]
    return path[::-1], best[goal]


def _turn(a, b, c):
    """'left', 'right' or None for the turn at b when walking a -> b -> c."""
    v1 = (b[0] - a[0], b[1] - a[1])
    v2 = (c[0] - b[0], c[1] - b[1])
    cross = v1[0] * v2[1] - v1[1] * v2[0]
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    ang = math.degrees(math.atan2(cross, dot))
    if abs(ang) < 35:
        return None
    return "left" if ang > 0 else "right"


def route(query: str, accessible: bool = False, start_entrance: str | None = None) -> dict | None:
    b, room = resolve(query)
    if not b or not room:
        return None
    data = building_floors(b["name"])
    if not data:
        return None
    goal = None
    target = None
    for fl in data["floors"]:
        for r in fl["rooms"]:
            if norm(r["room"]) == norm(room):
                goal, target = (fl["level"], "room", norm(r["code"])), (fl, r)
    if not goal:
        return {"building": b["name"], "room": room, "found": False}
    nodes, edges = build_graph(data, accessible)
    starts = [n for n in nodes if n[1] == "entrance" and (start_entrance is None or n[2] == start_entrance)]
    path, length = shortest(nodes, edges, starts, goal)
    if path and not accessible and abs(goal[0] - path[0][0]) > 3:
        # nobody wants to climb more than three flights: use the elevator
        alt, alt_len = shortest(*build_graph(data, True), starts, goal)
        if alt:
            path, length = alt, alt_len
    if not path:
        return {"building": b["name"], "room": room, "found": True, "reachable": False}
    c = data["center"]
    fl, r = target
    # per-floor polylines and plain-language steps
    legs, steps = [], []
    entrance = path[0]
    side_word = {(0, 45): "north", (45, 135): "east", (135, 225): "south", (225, 315): "west"}

    def compass(xy):
        ang = (math.degrees(math.atan2(xy[0], xy[1])) + 360) % 360
        return next((w for (lo, hi), w in side_word.items() if lo <= ang < hi), "north")
    steps.append(f"Enter {b['name']} by the {compass(nodes[entrance])} doors (floor {entrance[0]}).")
    current = [nodes[path[0]]]
    level = path[0][0]
    for prev_n, n in zip(path, path[1:]):
        if n[0] != level:
            if len(current) > 1:
                legs.append({"level": level, "line": [to_latlon(c, p) for p in current]})
            how = "elevator" if n[1] == "elevator" else "stairs"
            step = f"Take the {how} {'up' if n[0] > level else 'down'} to floor {n[0]}."
            if steps and steps[-1].startswith(f"Take the {how}"):
                steps[-1] = step  # one step for the whole ride, not one per floor
            else:
                steps.append(step)
            level = n[0]
            current = [nodes[n]]
        else:
            current.append(nodes[n])
    legs.append({"level": level, "line": [to_latlon(c, p) for p in current]})
    last = [nodes[n] for n in path if n[0] == level]
    if len(last) >= 3:
        turn = _turn(last[-3], last[-2], last[-1])
        doors_passed = sum(1 for other in fl["rooms"] if other is not r and dist(other["door"], last[0]) < dist(r["door"], last[0])
                           and dist(other["door"], r["door"]) < dist(last[0], r["door"]))
        where = f"on your {turn}" if turn else "ahead"
        steps.append(f"Follow the hallway; {r['room']} is {where}"
                     + (f", after {doors_passed} other classroom door{'s' if doors_passed != 1 else ''}." if doors_passed else "."))
    else:
        steps.append(f"{r['room']} is right there.")
    return {
        "building": b["name"], "room": r["room"], "code": r["code"], "found": True, "reachable": True,
        "floor": fl["level"], "source": fl["source"], "accessible": accessible,
        "meters": round(length), "minutes": max(1, round(length / 70)),
        "entrance": {"id": entrance[2], "at": to_latlon(c, nodes[entrance]), "level": entrance[0]},
        "legs": legs, "steps": steps, "room_polygon": [to_latlon(c, p) for p in r["polygon"]],
    }
