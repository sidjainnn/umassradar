from app.pipeline import apply_rules
from parsers.noise import is_noise
from tests.helpers import load


def test_promotions_label_is_noise():
    assert is_noise(load("promo"))


def test_unsubscribe_from_non_academic_is_noise():
    items, needs_llm = apply_rules(load("newsletter"))
    assert items[0].category == "noise" and not needs_llm


def test_academic_list_mail_is_not_noise():
    assert not is_noise(load("piazza_quiz"))


def test_unmatched_personal_email_goes_to_llm():
    items, needs_llm = apply_rules(load("professor"))
    assert items == [] and needs_llm
