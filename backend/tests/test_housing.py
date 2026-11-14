from datetime import date

import pytest
from pydantic import ValidationError

from app.housing import HousingPost, match, public_view, scam_flags


def roommate(**kw):
    base = dict(kind="roommate", area="Amherst", rent=900, start=date(2027, 8, 25), end=date(2028, 5, 31),
                sleep="late", tidiness="average", guests="sometimes", smoking="no")
    base.update(kw)
    return base


def test_compatible_roommates_score_high_with_reasons():
    score, reasons = match(roommate(), roommate(rent=950))
    assert score >= 85
    assert "Both looking in Amherst" in reasons and "Similar budgets" in reasons and "Dates line up" in reasons


def test_incompatible_roommates_score_low():
    other = roommate(area="Northampton", rent=1500, sleep="early", tidiness="very tidy", smoking="yes",
                     start=date(2026, 1, 1), end=date(2026, 5, 1))
    score, reasons = match(roommate(), other)
    assert score < 30
    assert "Smoking doesn't match" in reasons and "Dates don't overlap" in reasons


def test_sublet_wanted_vs_offer_respects_budget():
    want = dict(kind="sublet_wanted", area="Amherst", rent=900, start=date(2027, 6, 1), end=date(2027, 8, 20))
    cheap = dict(kind="sublet_offer", area="Amherst", rent=850, start=date(2027, 6, 1), end=date(2027, 8, 15))
    pricey = dict(cheap, rent=1400)
    assert match(want, cheap)[0] > match(want, pricey)[0]
    assert any("within your $900 budget" in r for r in match(want, cheap)[1])


def test_swaps_match_when_each_has_what_the_other_wants():
    a = dict(kind="swap", area="On campus", building="Kennedy Hall, Southwest", wants="Northeast")
    b = dict(kind="swap", area="On campus", building="Knowlton Hall, Northeast", wants="Southwest")
    score, reasons = match(a, b)
    assert score >= 90 and "Wants what you have" in reasons


def test_scam_phrases_are_flagged():
    assert scam_flags("Owner is out of the country, wire the deposit and I will mail the keys")
    assert scam_flags("Please pay the first month before viewing")
    assert not scam_flags("Quiet house on the 30 bus line, utilities included")


def test_post_validation():
    with pytest.raises(ValidationError):
        HousingPost(kind="sublet_offer", title="Room", area="Amherst", start=date(2027, 5, 1), end=date(2027, 1, 1))
    with pytest.raises(ValidationError):
        HousingPost(kind="sublet_offer", title="Room in a nice house", area="Mars")


def test_public_view_hides_who_posted():
    doc = {"_id": "p1", "user_id": "secret-user", "kind": "roommate", "title": "Looking", "area": "Amherst",
           "contact": "me@umass.edu"}
    view = public_view(doc, "someone-else")
    assert "user_id" not in view and "contact" not in view and view["mine"] is False
