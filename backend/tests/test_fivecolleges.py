from app.fivecolleges import group_courses, parse_detail, parse_listing, parse_meeting

LISTING = """<table><tr><th>Subject</th></tr>
<tr><td>STATISTC</td><td>240</td><td>01</td><td>LEC</td><td><a href="/courses/UM/2027/SPRING/STATISTC/240/01">Intro to Statistics</a></td><td>Smith</td><td>UMass Amherst</td><td>TU TH 1:00PM 2:15PM</td></tr>
<tr><td>STATISTC</td><td>240</td><td>01AA</td><td>DIS</td><td>Intro to Statistics</td><td></td><td>UMass Amherst</td><td>F 10:10AM 11:00AM</td></tr>
<tr><td>MATH</td><td>131</td><td>01</td><td>LEC</td><td>Calculus I</td><td>Lee</td><td>Smith College</td><td>M W 9:00AM 10:15AM</td></tr>
</table>"""


def test_parse_listing_keeps_umass_rows_only():
    rows = parse_listing(LISTING)
    assert [r["code"] for r in rows] == ["STAT 240", "STAT 240"]
    assert rows[0]["section"] == "LEC01" and rows[0]["days"] == [1, 3] and rows[0]["start"] == "13:00"
    assert rows[0]["url"].endswith("/STATISTC/240/01")


def test_group_courses():
    [(code, course)] = group_courses(parse_listing(LISTING), "Spring 2027").items()
    assert code == "STAT 240" and course["instructors"] == ["Smith"]
    assert [s["section"] for s in course["sections"]] == ["LEC01", "DIS01AA"]


def test_meeting_and_detail():
    assert parse_meeting("M W F 9:05AM 9:55AM") == ([0, 2, 4], "09:05", "09:55")
    assert parse_meeting("TBA") == ([], None, None)
    detail = parse_detail("<main>Credits:\n4.00\nLocation:\nTobin Hall 304\nDescription:\nLearn stats.\nLinked Course\nx</main>")
    assert detail == {"credits": "4", "location": "Tobin Hall 304", "description": "Learn stats."}
