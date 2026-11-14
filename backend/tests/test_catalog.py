from app.catalog import parse_days, parse_descriptions, parse_schedule, parse_time_range

DESC = """<main><h2>COMPSCI 220: Programming Methodology</h2>
<p>Instructor(s): Marius Minea, James Perretta</p>
<p>Development of individual skills necessary for designing larger programs.</p>
<p>Prerequisite: CICS 210 (or COMPSCI 187) with a grade of C or better. 4 credits.</p>
<h2>CICS 109: Introduction to Data Analysis in R</h2>
<p>Instructor(s): Pat Mcchesney</p><p>Basics of R. 1 credit.</p></main>"""

SCHED = """<table>
<tr><th>COMPSCI</th><th>CLASS#</th><th>DAYS</th><th>TIME</th><th>LOCATION</th><th>INSTRUCTOR</th></tr>
<tr><td>220</td><td>Programming Methodology (4 CR)</td></tr>
<tr><td>U1 LEC01</td><td>#27587</td><td>TuTh</td><td>04:00 PM - 05:15 PM</td><td>CMPLABE110</td><td>Perretta</td></tr>
<tr><td>U1 LAB01LL</td><td>#27592</td><td>Wed</td><td>01:25 PM - 02:15 PM</td><td>EnginLb305</td><td></td></tr>
</table>"""


def test_parse_descriptions():
    courses = parse_descriptions(DESC, "spring-2027")
    c = courses["COMPSCI 220"]
    assert c["title"] == "Programming Methodology"
    assert c["instructors"] == ["Marius Minea", "James Perretta"]
    assert c["credits"] == "4"
    assert c["prerequisites"].startswith("Prerequisite: CICS 210")
    assert "Instructor" not in c["description"] and "Prerequisite" not in c["description"]
    assert c["term"] == "Spring 2027"
    assert courses["CICS 109"]["credits"] == "1"


def test_parse_schedule():
    sections = parse_schedule(SCHED)["COMPSCI 220"]
    assert sections[0] == {"section": "U1 LEC01", "class_number": "27587", "days": [1, 3], "start": "16:00",
                           "end": "17:15", "location": "CMPLABE110", "instructor": "Perretta"}
    assert sections[1]["days"] == [2] and sections[1]["instructor"] is None


def test_days_and_times():
    assert parse_days("MoWeFr".replace("Mo", "Mon").replace("We", "Wed").replace("Fr", "Fri")) == [0, 2, 4]
    assert parse_days("TuTh") == [1, 3]
    assert parse_time_range("12:00 PM - 12:50 PM") == ("12:00", "12:50")
    assert parse_time_range("TBA") is None
