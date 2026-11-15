import json
from pathlib import Path

from app.buildings import best_entrances, buildings, directions, resolve
from app.rooms import floor_guess

CATALOG_ROOMS = ["CMPLABE110", "CMPSW162", "CS 140", "CSL E302", "CSW 140", "CompSci140", "Dcknsn 114", "Dwight 132",
                 "ELABII0115", "EnginLb303", "Goes 20", "GsmnAdd 64", "HasbAd 109", "Hasbrck134", "Hldswth203", "ILCS120",
                 "LGRC A104A", "LGRT0143", "LederCA201", "LederT 121", "MOR1N375", "Mach W-26", "Marstn 132",
                 "Morr1 N338", "Morr2 131", "Thmpsn 102", "Tobin 304", "Bartlett 206", "Hasbrouck 20", "Marcus 131"]


def test_every_catalog_room_code_resolves():
    for code in CATALOG_ROOMS:
        b, room = resolve(code)
        assert b and room, code


def test_specific_codes():
    assert resolve("MOR1 N375")[0]["name"] == "Morrill I"
    assert resolve("Morrill 1 N375") == resolve("MOR1N375")
    assert resolve("ELABII0115")[0]["name"] == "Engineering Laboratory II"
    assert resolve("EnginLb303")[0]["name"] == "Engineering Laboratory I"
    assert resolve("CSL E302")[0]["name"] == "Computer Science Laboratories"
    assert resolve("nowhere 12") == (None, None)


def test_entrances_on_the_rooms_side_come_first():
    b = {"name": "Test Hall", "center": [42.39, -72.52], "entrances": [
        {"id": "s", "at": [42.3895, -72.52], "level": None},
        {"id": "n", "at": [42.3905, -72.52], "level": "3"},
        {"id": "n2", "at": [42.3905, -72.5201], "level": "1"}]}
    doors = best_entrances(b, "north", 3)
    assert [d["id"] for d in doors][:2] == ["n", "n2"] and doors[0]["side"] == "north"
    steps = directions(b, "N375", floor_guess("N375"), doors)
    assert "north entrance" in steps[0] and "right floor" in steps[1]


def test_seed_file_has_morrill_with_doors():
    data = json.loads((Path(__file__).resolve().parents[1] / "seed" / "buildings.json").read_text())
    names = {b["name"]: b for b in data["buildings"]}
    assert {"Morrill I", "Morrill II", "Lederle Graduate Research Tower"} <= set(names)
    assert names["Morrill II"]["entrances"]
    assert "W.E.B. Du Bois Library" in buildings()
