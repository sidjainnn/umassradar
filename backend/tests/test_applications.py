from datetime import datetime, timezone

from app.applications import detect, next_stage
from app.models import EmailMsg

D = datetime(2026, 11, 10, tzinfo=timezone.utc)


def msg(subject, from_name="", from_email="", body=""):
    return EmailMsg(id="x", subject=subject, from_name=from_name, from_email=from_email, body=body, date=D)


def test_workday_confirmation():
    s = detect(msg("Thank you for applying to Kronos", "Kronos Careers", "kronos@myworkday.com",
                   "We have received your application for the Software Engineering Intern position."))
    assert (s.company, s.stage) == ("Kronos", "applied")
    assert "Software Engineering Intern" in s.role


def test_greenhouse_interview_and_rejection():
    s = detect(msg("Next steps with Wayfair", "Wayfair Recruiting", "no-reply@greenhouse.io",
                   "We'd like to schedule a time for a phone screen for the Data Science Intern role."))
    assert (s.company, s.stage) == ("Wayfair", "interview")
    r = detect(msg("Your application to HubSpot", "HubSpot Talent", "talent@hubspot.com",
                   "Unfortunately, we have decided to move forward with other candidates."))
    assert (r.company, r.stage) == ("HubSpot", "rejected")


def test_offer():
    s = detect(msg("Offer letter: Analyst Intern", "Fidelity University Relations", "careers@fidelity.com",
                   "We are pleased to offer you the Analyst Intern position."))
    assert s.stage == "offer"


def test_ordinary_mail_is_ignored():
    assert detect(msg("Thank you for your interest in the club", "Hackers Club", "hackers@umass.edu")) is None
    assert detect(msg("Lab 6 interview questions", "Prof. Chen", "chen@cs.umass.edu")) is None


def test_stages_only_move_forward():
    assert next_stage("interview", "applied") == "interview"
    assert next_stage("applied", "interview") == "interview"
    assert next_stage("interview", "rejected") == "rejected"
    assert next_stage("rejected", "applied") == "rejected"
    assert next_stage(None, "applied") == "applied"


def test_signal_keeps_no_body():
    s = detect(msg("Thank you for applying to Kronos", "Kronos Careers", "kronos@myworkday.com", "SECRET BODY " * 50))
    assert "SECRET" not in f"{s.company}{s.role}{s.subject}"


def test_handshake_viewed_update_names_the_company():
    s = detect(msg("Your application to Data Analyst Intern at Liberty Mutual was viewed", "Handshake",
                   "no-reply@joinhandshake.com"))
    assert (s.company, s.role, s.stage) == ("Liberty Mutual", "Data Analyst Intern", "applied")
