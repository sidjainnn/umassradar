"""Measure extraction accuracy on a labeled set of emails.

Usage (from backend/):
    python -m eval.evaluate                      # demo inbox, rules only
    python -m eval.evaluate --llm                # rules + Gemini (needs GEMINI_API_KEY)
    python -m eval.evaluate --labels my.csv

The labels CSV has columns message_id, true_category, true_due. message_id is a demo email key
(e.g. "prof-reply"). true_due is either empty, an ISO date (2026-11-20), or "+N" meaning N days
after the day the eval runs (the demo inbox is dated relative to today).

Each email gets one predicted category: the first item a rule parser produced, or the most
confident item from the LLM. Emails nothing handled count as "none".
"""

import argparse
import asyncio
from collections import Counter
from datetime import date, timedelta

from app.models import EASTERN, Item, now_utc
from app.pipeline import apply_rules
from demo.loader import demo_key, load_demo_emails, load_labels
from llm.extract import extract_items

CATEGORIES = ["deadline", "appointment", "reply_owed", "status_update", "opportunity", "event", "course_info", "noise"]


def expected_date(value: str, today: date) -> date | None:
    value = (value or "").strip()
    if not value:
        return None
    if value.startswith("+"):
        return today + timedelta(days=int(value[1:]))
    return date.fromisoformat(value[:10])


def primary(items: list[Item]) -> Item | None:
    if not items:
        return None
    if all(i.extracted_by == "rule" for i in items):
        return items[0]
    return max(items, key=lambda i: i.confidence)


async def predict(use_llm: bool) -> dict[str, Item | None]:
    msgs = load_demo_emails()
    predictions: dict[str, Item | None] = {}
    for msg in msgs:
        items, needs_llm = apply_rules(msg)
        if needs_llm and use_llm:
            items = await extract_items([msg], "eval")
        predictions[demo_key(msg.id)] = primary(items)
    return predictions


def report(labels: dict[str, dict], predictions: dict[str, Item | None], today: date) -> None:
    tp, fp, fn = Counter(), Counter(), Counter()
    dates_total = dates_right = 0
    rows = []
    for key, label in labels.items():
        truth = label["true_category"]
        item = predictions.get(key)
        pred = item.category if item else "none"
        if pred == truth:
            tp[truth] += 1
        else:
            fn[truth] += 1
            fp[pred] += 1
            rows.append((key, truth, pred))
        want = expected_date(label.get("true_due", ""), today)
        if want is not None:
            dates_total += 1
            got = item.when.astimezone(EASTERN).date() if item and item.when else None
            dates_right += got == want

    print(f"\n{'category':<15}{'precision':>10}{'recall':>9}{'f1':>7}{'support':>9}")
    for cat in CATEGORIES:
        support = tp[cat] + fn[cat]
        if support == 0 and fp[cat] == 0:
            continue
        p = tp[cat] / (tp[cat] + fp[cat]) if tp[cat] + fp[cat] else 0.0
        r = tp[cat] / support if support else 0.0
        f1 = 2 * p * r / (p + r) if p + r else 0.0
        print(f"{cat:<15}{p:>10.2f}{r:>9.2f}{f1:>7.2f}{support:>9}")
    total = sum(tp.values()) + sum(fn.values())
    print(f"\naccuracy: {sum(tp.values())}/{total} = {sum(tp.values()) / total:.0%}")
    print(f"unhandled (no item): {fp['none']}")
    if dates_total:
        print(f"date accuracy (same day): {dates_right}/{dates_total} = {dates_right / dates_total:.0%}")
    if rows:
        print("\nmisses:")
        for key, truth, pred in rows:
            print(f"  {key:<20} expected {truth:<14} got {pred}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--labels", default="demo/labels.csv")
    parser.add_argument("--llm", action="store_true", help="send unmatched emails to Gemini")
    args = parser.parse_args()
    today = now_utc().astimezone(EASTERN).date()
    labels = load_labels(args.labels)
    predictions = asyncio.run(predict(args.llm))
    print(f"UMass Radar eval: {len(labels)} labeled emails, {'rules + LLM' if args.llm else 'rules only'}")
    report(labels, predictions, today)


if __name__ == "__main__":
    main()
