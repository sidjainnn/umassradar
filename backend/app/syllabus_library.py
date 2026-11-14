"""Build the shared syllabus library from public syllabi and PDFs you provide.

    python -m app.syllabus_library                       # seed/syllabus_sources.csv + seed/syllabi/*.pdf
    python -m app.syllabus_library --since "Fall 2025"   # accept syllabi from that term on (default: last 12 months)

Each syllabus is read once (PDF or web page), run through the same extraction as student uploads,
and only kept if it's from the last 12 months. Only the extracted facts and a link to the source
are stored, never the document. Sources already processed (same content) are skipped.
"""

import argparse
import asyncio
import csv
import hashlib
import re
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

import httpx

from app.courses import add_syllabus_facts, term_start
from app.db import get_db
from app.models import EASTERN, now_utc
from app.watchers import main_text
from llm.extract import normalize_course
from llm.syllabus import SyllabusError, extract_syllabus, pdf_text, to_records

SEED = Path(__file__).resolve().parents[1] / "seed"
USER_AGENT = "Mozilla/5.0 (compatible; UMassRadar syllabus library; student project)"
MAX_AGE = timedelta(days=365)


def is_recent(term: str | None, today: date | None = None, since: date | None = None) -> bool:
    """A syllabus counts if its term started within the last 12 months (or on/after `since`, if given)."""
    start = term_start(term)
    today = today or now_utc().astimezone(EASTERN).date()
    return bool(start) and start >= (since or today - MAX_AGE)


def download_url(url: str) -> str:
    """Shared-document links point at a viewer page; ask for the file itself instead."""
    m = re.search(r"docs\.google\.com/(document|presentation)/d/([\w-]+)", url)
    if m:
        return f"https://docs.google.com/{m.group(1)}/d/{m.group(2)}/export?format=txt"
    m = re.search(r"drive\.google\.com/file/d/([\w-]+)", url)
    if m:
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    if "sharepoint.com" in url and "download=1" not in url:
        return url + ("&" if "?" in url else "?") + "download=1"
    return url


async def read_url(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        resp = await client.get(download_url(url))
        resp.raise_for_status()
    if "login.microsoftonline.com" in str(resp.url) or "accounts.google.com" in str(resp.url):
        raise SyllabusError("needs a UMass login")
    if resp.content.startswith(b"%PDF"):
        return pdf_text(resp.content)
    if "text/plain" in resp.headers.get("content-type", ""):
        text = resp.text.strip()
        if len(text) < 200:
            raise SyllabusError("document has almost no text")
        return text[:30_000]
    text = main_text(resp.text)
    if len(text) < 200:
        raise SyllabusError("page has almost no text")
    return text[:30_000]


async def import_text(text: str, source: str, expected: str | None = None, term_hint: str | None = None,
                      since: date | None = None) -> str:
    db = get_db()
    digest = hashlib.sha256(text.encode()).hexdigest()
    seen = await db.syllabus_sources.find_one({"_id": source})
    if seen and seen.get("hash") == digest:
        return f"unchanged ({seen.get('status')})"

    result = await extract_syllabus(text)
    result.term = result.term or term_hint or None
    course, office_hours, items = to_records(result, text, user_id="library")
    want = normalize_course(expected) if expected else None
    if want and (not course or (course != want and await db.courses.find_one({"_id": want}, {"_id": 1}))):
        course = want  # the curated list knows which course this is; trust it when it's a real catalog course
    if not course:
        status = "skipped: no course code found"
    elif not is_recent(result.term, since=since):
        status = f"skipped: {result.term or 'term unknown'} is too old or not stated"
    else:
        updated = await add_syllabus_facts(course, office_hours, items, result.grading, result.late_policy,
                                           term=result.term, source_url=source if source.startswith("http") else None,
                                           from_student=False)
        status = f"added to {course} ({result.term})" if updated else f"kept newer syllabus for {course}"
    await db.syllabus_sources.update_one(
        {"_id": source}, {"$set": {"hash": digest, "status": status, "course": course, "term": result.term,
                                   "checked_at": now_utc()}}, upsert=True)
    return status


async def main(since: date | None = None) -> None:
    sources = []
    csv_path = SEED / "syllabus_sources.csv"
    if csv_path.exists():
        with open(csv_path, newline="") as f:
            sources += [("url", row["url"].strip(), (row.get("course") or "").strip() or None,
                         (row.get("term") or "").strip() or None) for row in csv.DictReader(f)]
    sources += [("file", str(p), None, None) for p in sorted((SEED / "syllabi").glob("*.pdf"))]

    tally: Counter = Counter()
    for n, (kind, source, expected, term_hint) in enumerate(sources, 1):
        try:
            text = await read_url(source) if kind == "url" else pdf_text(Path(source).read_bytes())
            status = await import_text(text, source, expected, term_hint, since)
        except Exception as e:  # one bad source shouldn't stop the rest
            status = f"failed: {str(e)[:120]}"
        tally[status.split(":")[0].split(" (")[0].split(" to ")[0]] += 1
        print(f"[{n}/{len(sources)}] {expected or Path(source).name}: {status}", flush=True)
        if kind == "url":
            await asyncio.sleep(1)  # be polite to course sites
    print("\nsummary:", dict(tally), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", help='oldest term to accept, e.g. "Fall 2025" (default: last 12 months)')
    args = parser.parse_args()
    asyncio.run(main(term_start(args.since) if args.since else None))
