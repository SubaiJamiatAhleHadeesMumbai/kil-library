from controllers import fatawa_controller
from schemas import fatawa_schema


def test_fatawa_category_slug_is_generated_from_name():
    payload = fatawa_schema.FatawaCategoryCreate(name="Ahl-e-Hadith Answers")
    assert payload.slug == "ahl-e-hadith-answers"


def test_fatawa_visibility_and_status_helpers_accept_expected_values():
    assert fatawa_controller.normalize_visibility("public") == "public"
    assert fatawa_controller.normalize_visibility("private") == "private"
    assert fatawa_controller.normalize_status("answered") == "answered"
    assert fatawa_controller.normalize_status(None) == "pending"