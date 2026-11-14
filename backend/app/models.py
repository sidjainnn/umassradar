import uuid
from datetime import datetime, timezone
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field

EASTERN = ZoneInfo("America/New_York")

Category = Literal[
    "deadline",
    "appointment",
    "reply_owed",
    "status_update",
    "opportunity",
    "event",
    "course_info",
    "noise",
]
Source = Literal["gmail", "canvas", "calendar", "syllabus", "screenshot", "web", "demo"]
Status = Literal["open", "done", "dismissed"]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class EmailMsg(BaseModel):
    """One email, held in memory only while it is being processed. Never stored."""

    id: str
    thread_id: str = ""
    from_name: str = ""
    from_email: str = ""
    subject: str = ""
    date: datetime
    list_unsubscribe: str = ""
    label_ids: list[str] = []
    body: str = ""

    @property
    def from_domain(self) -> str:
        return self.from_email.rsplit("@", 1)[-1].lower() if "@" in self.from_email else ""


class Item(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    user_id: str = ""
    category: Category
    title: str
    course: str | None = None
    due_at: datetime | None = None
    starts_at: datetime | None = None
    location: str | None = None
    action_required: bool = False
    urgency_score: float = 0.0
    source: Source = "gmail"
    source_ref: str = ""
    evidence: str = ""
    confidence: float = 1.0
    extracted_by: Literal["rule", "llm"] = "rule"
    created_at: datetime = Field(default_factory=now_utc)
    status: Status = "open"
    # extra context used for ranking and display
    sender: str = ""
    sender_type: Literal["person", "automated", "newsletter", "unknown"] = "unknown"
    received_at: datetime | None = None
    url: str | None = None

    @property
    def when(self) -> datetime | None:
        return self.due_at or self.starts_at

    def dedupe_key(self) -> str:
        when = self.when.astimezone(EASTERN).date().isoformat() if self.when else ""
        return f"{self.source}|{self.source_ref}|{self.category}|{self.title.lower()[:80]}|{when}"
