"""Merge duplicate items: same course, similar title, dates within a day."""

import re
from datetime import timedelta
from difflib import SequenceMatcher

from app.models import Item

STOPWORDS = {"reminder", "due", "date", "changed", "new", "assignment", "the", "a", "an", "is", "for", "re", "fwd"}


def norm_title(title: str) -> str:
    t = re.sub(r"\b[A-Z]{2,8}\s?\d{3}[A-Z]?\b", " ", title)  # drop course codes
    words = [w for w in re.sub(r"[^a-z0-9 ]+", " ", t.lower()).split() if w not in STOPWORDS]
    return " ".join(words)


def similar_titles(a: str, b: str) -> bool:
    na, nb = norm_title(a), norm_title(b)
    if not na or not nb:
        return False
    nums_a, nums_b = set(re.findall(r"\d+", na)), set(re.findall(r"\d+", nb))
    if nums_a and nums_b and nums_a != nums_b:
        return False  # "Homework 6" is not "Homework 7"
    if na == nb or na in nb or nb in na:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= 0.8


def same_course(a: Item, b: Item) -> bool:
    if a.course and b.course:
        return a.course.replace(" ", "").lower() == b.course.replace(" ", "").lower()
    return a.course is None and b.course is None


def is_duplicate(a: Item, b: Item) -> bool:
    if a.category == "noise" or b.category == "noise":
        return False
    if a.category != b.category and {a.category, b.category} != {"deadline", "event"}:
        return False
    if not same_course(a, b) or not similar_titles(a.title, b.title):
        return False
    if a.when and b.when:
        return abs(a.when - b.when) <= timedelta(days=1)
    return a.when is None and b.when is None and a.source_ref == b.source_ref


def merge_items(items: list[Item]) -> list[Item]:
    """Collapse duplicates within one list, keeping the higher-confidence item."""
    kept: list[Item] = []
    for item in sorted(items, key=lambda i: i.confidence, reverse=True):
        if not any(is_duplicate(item, k) for k in kept):
            kept.append(item)
    return kept


def find_duplicate(item: Item, existing: list[Item]) -> Item | None:
    for other in existing:
        if other.dedupe_key() != item.dedupe_key() and is_duplicate(item, other):
            return other
    return None
