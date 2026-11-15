from llm.syllabus import Material, SyllabusResult, clean_materials


def test_materials_are_cleaned_and_deduped():
    result = SyllabusResult(course="STAT 315", office_hours=[], dated=[], grading=None, late_policy=None, materials=[
        Material(title="Probability and Statistics for Engineering and the Sciences", author="Devore", edition="9th",
                 isbn="978-1-305-25180-9", required=False, note="older edition is fine",
                 evidence="The textbook is recommended; any edition after the 7th is fine."),
        Material(title="WebAssign", platform="Cengage WebAssign", access_code=True, required=False,
                 note="not needed, homework is on Gradescope", evidence="You do not need a WebAssign access code."),
        Material(title="webassign ", required=True),
        Material(title="  "),
    ])
    out = clean_materials(result.materials)
    assert [m["title"] for m in out] == ["Probability and Statistics for Engineering and the Sciences", "WebAssign"]
    assert out[0]["isbn"] == "9781305251809" and out[0]["required"] is False
    assert out[1]["access_code"] is True and out[1]["required"] is False
    assert "Gradescope" in out[1]["note"]


def test_old_results_without_materials_still_parse():
    r = SyllabusResult.model_validate({"course": None, "office_hours": [], "dated": [], "grading": None, "late_policy": None})
    assert r.materials == []


def test_bad_isbn_is_dropped():
    assert clean_materials([Material(title="Book", isbn="12345")])[0]["isbn"] is None
