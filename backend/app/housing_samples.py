"""Example housing posts, visible only in demo mode so the board isn't empty for judges."""

from datetime import datetime, timedelta

from app.db import get_db
from app.housing import POST_DAYS
from app.models import EASTERN, now_utc


def _d(month: int, day: int, year: int = 2027) -> datetime:
    return datetime(year, month, day, tzinfo=EASTERN)


SAMPLES = [
    dict(kind="sublet_offer", title="Spring sublet, 1 room in a 3BR on Hazel Ave", area="Amherst", building="Hazel Ave",
         rent=850, start=_d(1, 20), end=_d(5, 31), bedrooms=3, furnished=True,
         description="Studying abroad in the spring. Quiet house, two grad students, on the 30 bus line, 10 min to campus."),
    dict(kind="sublet_offer", title="Summer sublet at The Retreat, private bathroom", area="Amherst", building="The Retreat",
         rent=950, start=_d(6, 1), end=_d(8, 15), bedrooms=4, furnished=True, description="Pool and gym included. Utilities included."),
    dict(kind="sublet_offer", title="Spring room in Puffton Village", area="Amherst", building="Puffton Village",
         rent=780, start=_d(1, 25), end=_d(5, 31), bedrooms=2, furnished=False, description="Shared with one roommate who is a CS senior."),
    dict(kind="sublet_offer", title="Cheap Hadley room, ready now", area="Hadley", building="Route 9",
         rent=450, start=_d(1, 10), end=_d(5, 31), bedrooms=4, furnished=True,
         description="Owner is out of the country, wire the deposit and I will mail the keys."),
    dict(kind="sublet_wanted", title="Looking for a summer sublet near campus", area="Amherst", rent=900,
         start=_d(6, 1), end=_d(8, 20), description="Doing a research internship on campus this summer."),
    dict(kind="swap", title="Swap: double in Southwest (Kennedy) for anything in Northeast", area="On campus",
         building="Kennedy Hall, Southwest", wants="Northeast", description="Closer to my classes in LGRT."),
    dict(kind="swap", title="Northeast single (Knowlton) for Southwest", area="On campus", building="Knowlton Hall, Northeast",
         wants="Southwest", description="Want to be with my friends in Southwest."),
    dict(kind="roommate", title="CS junior looking for a roommate for fall", area="Amherst", rent=900,
         start=_d(8, 25), end=_d(5, 31, 2028), sleep="late", tidiness="average", guests="sometimes", smoking="no",
         description="Into climbing and cooking. Looking at 2BRs near North Pleasant."),
    dict(kind="roommate", title="Quiet nursing student, early riser", area="Amherst", rent=850,
         start=_d(8, 25), end=_d(5, 31, 2028), sleep="early", tidiness="very tidy", guests="rarely", smoking="no",
         description="Clinicals start at 6 AM, so I'm in bed by 10."),
    dict(kind="roommate", title="Grad student, flexible, looking in Northampton", area="Northampton", rent=1100,
         start=_d(9, 1), end=_d(8, 31, 2028), sleep="flexible", tidiness="relaxed", guests="often", smoking="outside only",
         description="Ok with pets."),
]

DEMO_MINE = dict(kind="roommate", title="Me: sophomore looking for a fall roommate", area="Amherst", rent=950,
                 start=_d(8, 25), end=_d(5, 31, 2028), sleep="late", tidiness="average", guests="sometimes", smoking="no",
                 description="This is the demo student's own roommate post, used to show matching.")


async def ensure_samples() -> None:
    from app.housing import scam_flags

    db = get_db()
    if await db.housing_posts.count_documents({"sample": True, "expires_at": {"$gt": now_utc()}}) >= len(SAMPLES):
        return
    await db.housing_posts.delete_many({"sample": True})
    now = now_utc()
    docs = []
    for n, s in enumerate(SAMPLES + [DEMO_MINE]):
        docs.append({**s, "_id": f"sample-{n}", "user_id": "sample-demo-me" if s is DEMO_MINE else f"sample-{n}",
                     "sample": True, "sample_mine": s is DEMO_MINE, "status": "open", "poster_label": "Example post",
                     "created_at": now - timedelta(hours=n * 7), "expires_at": now + timedelta(days=POST_DAYS),
                     "warnings": scam_flags(f"{s['title']} {s.get('description', '')}"), "reports": []})
    await db.housing_posts.insert_many(docs)
