"""One-time import of every general-assignment classroom from the University Registrar's public list.

Run: python -m app.registrar_rooms. Writes seed/classrooms.json; the app never fetches it at runtime.
Source: https://www.umass.edu/registrar/book (Classroom Capacities).
"""

import html
import json
import re
import string
import time
from pathlib import Path

import httpx

OUT = Path(__file__).resolve().parents[1] / "seed" / "classrooms.json"
BASE = "https://www.umass.edu/registrar/book"
ROW = re.compile(r"([A-Z][A-Z0-9]{1,6}) ([A-Z]{0,2}-?\d{1,4}[A-Z]?) (\d{1,4}) (.+?)(?= [A-Z][A-Z0-9]{1,6} [A-Z]{0,2}-?\d{1,4}[A-Z]? \d{1,4} |$)")
FEATURES = ["ECHO", "FL", "TBL", "TBLLITE", "AUD", "AUD/T", "Multimedia"]


def page_text(raw: str) -> str:
    x = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw)))
    i = x.find("Home Book")
    j = x.find("‹ Previous", i)
    seg = x[i:j] if i >= 0 else ""
    return re.sub(r"^Home Book (Classroom Capacities )?\w ", "", seg)


def parse(seg: str) -> list[dict]:
    out = []
    for code, room, cap, rest in ROW.findall(seg):
        tokens = rest.split()
        feats = []
        while tokens and any(t in tokens[-1].split("/") or tokens[-1] in FEATURES for t in ("ECHO", "FL", "TBL", "TBLLITE", "AUD", "T", "Multimedia")):
            feats.insert(0, tokens.pop())
        out.append({"code": f"{code} {room}", "building_code": code, "room": room, "capacity": int(cap),
                    "name": " ".join(tokens), "features": [f for t in feats for f in t.split("/")]})
    return out


def main() -> None:
    rooms, seen = [], set()
    with httpx.Client(headers={"User-Agent": "Mozilla/5.0 (campus classroom list import)"}, timeout=30, follow_redirects=True) as c:
        for letter in string.ascii_lowercase:
            for path in (f"{BASE}/{letter}", f"{BASE}/classroom-capacities/{letter}"):
                r = c.get(path)
                time.sleep(1)
                if r.status_code == 200 and "Classroom Capacities" in r.text:
                    for row in parse(page_text(r.text)):
                        if row["code"] not in seen:
                            seen.add(row["code"])
                            rooms.append(row)
                    break
    OUT.write_text(json.dumps({"source": BASE, "rooms": rooms}, indent=1))
    print(f"{len(rooms)} classrooms in {len({r['building_code'] for r in rooms})} buildings -> {OUT}")


if __name__ == "__main__":
    main()
