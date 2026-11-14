"""Build the shared syllabus library from public syllabi and PDFs you provide.

    python -m app.syllabus_library            # seed/syllabus_sources.csv + seed/syllabi/*.pdf

Each syllabus is read once (PDF or web page), run through the same extraction as student uploads,
and only kept if it's from the last 12 months. Only the extracted facts and a link to the source
are stored, never the document. Sources already processed (same content) are skipped.
"""

import asyncio
import csv
import hashlib
import sys
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


def is_recent(term: str | None, today: date | None = None) -> bool:
    """A syllabus counts if its term started within the last 12 months (or hasn't started yet)."""
    start = term_start(term)
    today = today or now_utc().astimezone(EASTERN).date()
    return bool(start) and start >= today - MAX_AGE


async def read_url(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    if resp.content.startswith(b"%PDF"):
        return pdf_text(resp.content)
    text = main_text(resp.text)
    if len(text) < 200:
        raise SyllabusError("page has almost no text")
    return text[:30_000]


async def import_text(text: str, source: str, expected: str | None = None) -> str:
    db = get_db()
    digest = hashlib.sha256(text.encode()).hexdigest()
    seen = await db.syllabus_sources.find_one({"_id": source})
    if seen and seen.get("hash") == digest:
        return f"unchanged ({seen.get('status')})"

    result = await extract_syllabus(text)
    course, office_hours, items = to_records(result, text, user_id="library")
    course = course or normalize_course(expected)
    if not course:
        status = "skipped: no course code found"
    elif not is_recent(result.term):
        status = f"skipped: {result.term or 'term unknown'} is older than 12 months or not stated"
    else:
        updated = await add_syllabus_facts(course, office_hours, items, result.grading, result.late_policy,
                                           term=result.term, source_url=source if source.startswith("http") else None,
                                           from_student=False)
        status = f"added to {course} ({result.term})" if updated else f"kept newer syllabus for {course}"
    await db.syllabus_sources.update_one(
        {"_id": source}, {"$set": {"hash": digest, "status": status, "course": course, "term": result.term,
                                   "checked_at": now_utc()}}, upsert=True)
    return status


async def main() -> None:
    sources = []
    csv_path = SEED / "syllabus_sources.csv"
    if csv_path.exists():
        with open(csv_path, newline="") as f:
            sources += [("url", row["url"].strip(), row.get("course", "").strip() or None) for row in csv.DictReader(f)]
    sources += [("file", str(p), None) for p in sorted((SEED / "syllabi").glob("*.pdf"))]

    for kind, source, expected in sources:
        try:
            text = await read_url(source) if kind == "url" else pdf_text(Path(source).read_bytes())
            status = await import_text(text, source, expected)
        except Exception as e:  # one bad source shouldn't stop the rest
            status = f"failed: {str(e)[:120]}"
        print(f"{Path(source).name if kind == 'file' else source}\n    {status}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
    sys.exit(0)
