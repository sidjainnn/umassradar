"""Room finder: which floor and wing a room code is probably on, and students' tips for getting there."""

import re

FLOOR_WORDS = {0: "the lower level", 1: "the first floor", 2: "the second floor", 3: "the third floor"}


def normalize_room(room: str) -> str:
    return re.sub(r"\s+", "", room or "").upper()[:12]


def floor_guess(room: str) -> dict:
    """UMass rooms are mostly numbered by floor: 134 is on floor 1, S240 is on floor 2 of the south wing,
    and a one- or two-digit room (like 20) is usually on the ground or lower level."""
    code = normalize_room(room)
    m = re.fullmatch(r"([A-Z]{0,2})-?(\d{1,4})([A-Z]?)", code)
    if not m:
        return {"room": code, "floor": None, "wing": None, "label": None}
    letters, digits = m.group(1), m.group(2)
    wing = {"N": "north", "S": "south", "E": "east", "W": "west"}.get(letters) if len(letters) == 1 else None
    if letters == "B" or len(digits) <= 2:
        floor = 0
    else:
        floor = int(digits[:-2])
    where = FLOOR_WORDS.get(floor, f"floor {floor}")
    label = f"Probably on {where}" + (f", {wing} wing" if wing else "")
    return {"room": code, "floor": floor, "wing": wing, "label": label}
