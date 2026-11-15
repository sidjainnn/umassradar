from app.rooms import floor_guess, normalize_room


def test_floor_from_room_number():
    assert floor_guess("134")["floor"] == 1
    assert floor_guess("1034")["floor"] == 10
    assert floor_guess("20")["floor"] == 0
    assert floor_guess("b 12")["floor"] == 0


def test_wing_letters():
    g = floor_guess("S240")
    assert (g["floor"], g["wing"]) == (2, "south")
    assert "south wing" in g["label"]


def test_unknown_format_has_no_guess():
    assert floor_guess("Auditorium")["floor"] is None


def test_normalize():
    assert normalize_room(" s 240 ") == "S240"
