import json
from pathlib import Path

from app.buildings import resolve
from app.indoor import building_floors, build_graph, classrooms, route

ROOMS = json.loads((Path(__file__).resolve().parents[1] / "seed" / "classrooms.json").read_text())["rooms"]


def _overlap(a, b):
    """Separating-axis test for convex polygons (rotated rectangles), with a small tolerance."""
    for poly in (a, b):
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            nx, ny = y2 - y1, x1 - x2
            pa = [nx * x + ny * y for x, y in a]
            pb = [nx * x + ny * y for x, y in b]
            norm = (nx * nx + ny * ny) ** 0.5 or 1
            if (min(max(pa), max(pb)) - max(min(pa), min(pb))) / norm < 0.2:
                return False
    return True


def test_every_registrar_room_has_a_building_floor_and_shape():
    assert len(ROOMS) >= 240
    for r in ROOMS:
        b, room = resolve(r["code"])
        assert b and room, r["code"]
    placed = {rr["code"] for name in classrooms() for fl in building_floors(name)["floors"] for rr in fl["rooms"]}
    assert placed == {r["code"] for r in ROOMS}


def test_generated_rooms_dont_overlap():
    for name in ["Herter Hall", "Morrill I", "Lederle Graduate Research Tower", "Machmer Hall"]:
        for fl in building_floors(name)["floors"]:
            if fl["source"] != "generated":
                continue
            polys = [r["polygon"] for r in fl["rooms"]]
            for i in range(len(polys)):
                for j in range(i + 1, len(polys)):
                    assert not _overlap(polys[i], polys[j]), (name, fl["level"])


def test_every_room_is_reachable_and_accessible_routes_skip_stairs():
    for r in ROOMS:
        assert route(r["code"])["reachable"], r["code"]
    ilc = building_floors("Integrative Learning Center")
    nodes, edges = build_graph(ilc, accessible=True)
    for n, out in edges.items():
        for m, _ in out:
            assert not (n[1] == "stairs" and m[1] == "stairs" and n[0] != m[0])
    r = route("ILC S331", accessible=True)
    assert any("elevator" in s for s in r["steps"]) and not any("stairs" in s for s in r["steps"])


def test_ilc_first_floor_is_traced_and_upper_floors_are_marked_generated():
    floors = {f["level"]: f for f in building_floors("Integrative Learning Center")["floors"]}
    assert floors[1]["source"] == "traced"
    assert {r["room"] for r in floors[1]["rooms"]} == {"N101", "N111", "N151", "N155", "S110", "S120", "S131", "S140"}
    assert all(floors[lvl]["source"] == "generated" for lvl in floors if lvl != 1)
    big = max(floors[1]["rooms"], key=lambda r: r["capacity"])
    assert big["room"] == "N151"  # the 340-seat auditorium gets the curved hall


def test_route_steps_read_naturally():
    r = route("LGRT 1234")
    assert r["floor"] == 12 and "elevator" in " ".join(r["steps"])  # 11 flights: take the elevator
    assert sum("Take the" in s for s in r["steps"]) == 1
    assert route("ILC Z999")["found"] is False
