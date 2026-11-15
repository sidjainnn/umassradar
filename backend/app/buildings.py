"""Find a classroom: which building (or building part) a room code is in, its floor and side, and the best door.

Building outlines and entrances come from OpenStreetMap (seed/buildings.json, made by app.buildings_osm).
Room codes come from SPIRE and the course catalog, e.g. "MOR1N375", "LGRT0143", "ILCS120", "Mach W-26".
"""

import json
import math
import re
from functools import lru_cache
from pathlib import Path

from app.rooms import floor_guess

SEED = Path(__file__).resolve().parents[1] / "seed" / "buildings.json"

# SPIRE/catalog abbreviations -> OpenStreetMap building names. Longest codes are tried first.
ALIASES = {
    "Morrill I": ["MOR1", "MORR1", "MORRILL1", "MORRILLI", "MORRILLSCICTR1"],
    "Morrill II": ["MOR2", "MORR2", "MORRILL2", "MORRILLII", "MORRILL", "MORRILLSCICTR"],
    "Morrill III": ["MOR3", "MORR3", "MORRILL3", "MORRILLIII"],
    "Morrill IV North": ["MOR4N", "MORR4N", "MORRILL4N", "MORRILLIVNORTH", "MOR4"],
    "Morrill IV South": ["MOR4S", "MORR4S", "MORRILL4S", "MORRILLIVSOUTH"],
    "Lederle Graduate Research Tower": ["LGRT", "LEDERT", "LGR", "LEDERLETOWER"],
    "Lederle Graduate Research Center": ["LGRC", "LEDERC", "LEDERLELOWRISE", "LEDERLE"],
    "Hasbrouck Laboratory": ["HASA", "HASBRCK", "HASBAD", "HASBROUCK", "HASB", "HAS"],
    "Engineering Laboratory II": ["ELABII", "ENGINLB2", "ENGINEERINGLAB2", "ENGINEERINGLABII"],
    "Engineering Laboratory I": ["ELAB", "ENGINLB", "ELABI", "ELAB", "ENGINEERINGLAB", "ENGINEERINGLABI"],
    "Computer Science Laboratories": ["CMPLAB", "CSL", "COMPSCILAB", "CSLAB"],
    "Computer Science Building": ["COMPSCI", "COMPUTERSCIENCE", "CMPS", "CSW", "CS"],
    "Marston Hall": ["MRST", "MARSTN", "MARSTON"],
    "Marcus Hall": ["MARC", "MARCUS", "MRCS"],
    "Thompson Hall": ["THOM", "THMPSN", "THOMPSON", "THO"],
    "Goessmann Laboratory": ["GSMN", "GSMNADD", "GOESSMANN", "GOES", "GSMN"],
    "Tobin Hall": ["TOBN", "TOBIN", "TOB"],
    "Holdsworth Hall": ["HOLD", "HLDSWTH", "HOLDSWORTH", "HLD"],
    "Machmer Hall": ["MACHMER", "MACH"],
    "Dickinson Hall": ["DKSN", "DCKNSN", "DICKINSON"],
    "Dwight Hall": ["DWIGHT"],
    "Integrative Learning Center": ["INTEGRATIVELEARNINGCENTER", "ILC"],
    "Bartlett Hall": ["BART", "BARTLETT", "BART"],
    "Herter Hall": ["HERT", "HERTER", "HER"],
    "Life Science Laboratories": ["LIFESCIENCE", "LSL"],
    "Physical Sciences Building": ["PHYSICALSCIENCES", "PSB"],
    "Integrated Sciences Building": ["ISB", "INTEGRATEDSCIENCES", "ISB"],
    "Paige Laboratory": ["PAIGE"],
    "South College": ["SC", "SOUTHCOLLEGE", "SCOL"],
    "Old Chapel": ["OLDCHAPEL"],
    "Student Union": ["STUDENTUNION", "SU"],
    "Murray D. Lincoln Campus Center": ["CAMPUSCENTER", "CAMPCTR", "CC"],
    "Boyden Gym": ["BOYD", "BOYDEN"],
    "Totman Gym": ["TOTM", "TOTMAN"],
    "Knowles Engineering Bulding": ["KNOWLES"],
    "Randolph W. Bromery Center for the Arts": ["BROMERY", "FAC", "FINEARTS", "FINEARTSCENTER"],
    "Recreation Center": ["RECCENTER", "REC"],
    "Elm Hall": ['ELM'],
    "School of Public Health & Health Sciences Hub": ['PHUB', 'SPHHSHUB'],
    "Arnold House": ['ARND', 'ARNOLD'],
    "Chenoweth Laboratory": ['CHNW', 'CHENOWETH'],
    "Chenoweth Lab Addition": ['CHEN'],
    "French Hall": ['FREN', 'FRENCH'],
    "Mahar Auditorium": ['MAH', 'MAHAR'],
    "Stockbridge Hall": ['STK', 'STOCKBRIDGE'],
    "New Africa House": ['NAH', 'NEWAFRICAHOUSE'],
    "Flint Lab": ['FLIN', 'FLINT'],
    "Fernald Hall": ['FERN', 'FERNALD'],
    "Draper Hall": ['DRA', 'DRAPER'],
    "Bowditch Hall": ['BOWD', 'BOWDITCH'],
    "Agricultural Engineering Center": ['AEBC'],
    "Agricultural Engineering North": ['AEBN'],
    "Furcolo Hall": ['FURC', 'FURCOLO'],
    "Skinner Hall": ["SKIN", "SKINNER"],
    # not named in OpenStreetMap; centers from OpenStreetMap search
    "W.E.B. Du Bois Library": ["DUBOIS", "DUBOISLIBRARY", "LIBRARY", "DBL"],
    "Isenberg School of Management": ["SOM", "ISENBERG", "ISOM", "SOM"],
}
EXTRA = {
    "W.E.B. Du Bois Library": [42.38974, -72.52817],
    "Isenberg School of Management": [42.38682, -72.52486],
    "Furcolo Hall": [42.39828, -72.52651],
    "Skinner Hall": [42.39166, -72.52480],
}
SIDES = {"north": 0, "east": 90, "south": 180, "west": 270}


@lru_cache
def buildings() -> dict[str, dict]:
    data = json.loads(SEED.read_text())["buildings"] if SEED.exists() else []
    out = {b["name"]: b for b in data}
    for name, center in EXTRA.items():
        out.setdefault(name, {"id": "x-" + re.sub(r"\W+", "-", name.lower()), "name": name, "center": center,
                              "outline": [], "entrances": [], "levels": None})
    return out


@lru_cache
def _alias_list() -> list[tuple[str, str]]:
    pairs = [(code, name.strip()) for name, codes in ALIASES.items() for code in codes]
    pairs += [(re.sub(r"[^A-Z0-9]", "", n.upper()), n) for n in buildings()]
    return sorted(set(pairs), key=lambda p: -len(p[0]))


def norm(s: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def resolve(query: str) -> tuple[dict | None, str | None]:
    """(building, room code) for strings like 'MOR1 N375', 'Morrill 1 N375', 'LGRT0143', 'Hasbrouck 20'."""
    q = norm(query)
    if not q:
        return None, None
    for code, name in _alias_list():
        if q.startswith(code):
            rest = q[len(code):]
            # 'CS140' vs 'CSL' style: the room has to look like a room
            if rest and not re.fullmatch(r"[A-Z]{0,2}\d{1,4}[A-Z]?", rest):
                continue
            b = buildings().get(name)
            if b:
                raw = query.strip()
                m = re.search(r"([A-Za-z]{0,2}-?\d{1,4}[A-Za-z]?)\s*$", raw)
                room = (m.group(1).upper() if m and norm(m.group(1)) == rest else rest) or None
                return b, room
    return None, None


def bearing(a: list[float], b: list[float]) -> float:
    """Compass bearing from a to b in degrees (0 = north)."""
    dy = b[0] - a[0]
    dx = (b[1] - a[1]) * math.cos(math.radians(a[0]))
    return (math.degrees(math.atan2(dx, dy)) + 360) % 360


def meters(a: list[float], b: list[float]) -> float:
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


def side_name(deg: float) -> str:
    return ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][round(deg / 45) % 8]


def best_entrances(b: dict, wing: str | None, floor: int | None, accessible: bool = False) -> list[dict]:
    """Entrances ranked: on the room's side first, then on its floor, then step-free if asked."""
    want = SIDES.get(wing) if wing else None
    ranked = []
    for e in b.get("entrances", []):
        deg = bearing(b["center"], e["at"])
        off = min(abs(deg - want), 360 - abs(deg - want)) if want is not None else 0
        level = int(e["level"]) if (e.get("level") or "").lstrip("-").isdigit() else None
        cost = off / 45 + (0 if floor is None or level is None else (0 if level == floor else 1 + abs(level - floor) * 0.3))
        if accessible and e.get("wheelchair") == "no":
            cost += 5
        ranked.append((cost, {**e, "side": side_name(deg), "level": level}))
    return [e for _, e in sorted(ranked, key=lambda x: x[0])]


def directions(b: dict, room: str | None, guess: dict | None, doors: list[dict]) -> list[str]:
    steps = []
    door = doors[0] if doors else None
    wing = (guess or {}).get("wing")
    if door:
        on = f" (it opens onto floor {door['level']})" if door.get("level") is not None else ""
        steps.append(f"Use the {door['side']} entrance of {b['name']}{on}.")
        if wing and wing not in door["side"]:
            steps.append(f"That's the closest mapped door; once inside, head toward the {wing} side.")
    else:
        steps.append(f"Head to {b['name']}; any main entrance works.")
    if room and guess and guess.get("floor") is not None:
        floor = guess["floor"]
        if door and door.get("level") is not None:
            diff = floor - door["level"]
            if diff:
                steps.append(f"Go {'up' if diff > 0 else 'down'} {abs(diff)} floor{'s' if abs(diff) > 1 else ''}"
                             f" by the nearest stairs or elevator.")
            else:
                steps.append("You're on the right floor as you walk in.")
        else:
            where = "the lower level" if floor == 0 else f"floor {floor}"
            steps.append(f"Room {room} should be on {where}; take the stairs or elevator.")
        if guess.get("wing"):
            steps.append(f"Look for the {guess['wing']} side or wing; the room number starts with {room[0]}.")
        steps.append("Room numbers usually run in order down each hallway, so check the numbers by the doors.")
    return steps
