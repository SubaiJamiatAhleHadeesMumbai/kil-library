import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from controllers import settings_controller


def test_default_homepage_settings_include_sections_and_theme():
    settings = settings_controller.get_default_homepage_settings()

    assert settings["theme"] in {"day", "night", "aurora"}
    assert settings["accent_color"].startswith("#")
    assert settings["language"] in {"en", "ur", "ar"}
    assert settings["sections"]["hero"]["enabled"] is True
    assert settings["sections"]["search"]["enabled"] is True
    assert settings["sections"]["posts"]["enabled"] is True
    assert "title" in settings["sections"]["hero"]
    assert "subtitle" in settings["sections"]["hero"]
    assert "description" in settings["sections"]["hero"]
    assert settings["sections"]["hero"]["order"] == 0
    assert "primary_cta_label" in settings["sections"]["hero"]
    assert "secondary_cta_url" in settings["sections"]["hero"]
    assert isinstance(settings["site_title"], dict)
    assert settings["site_title"]["en"] == "Markaz Ahle Hadees Kokan"
    assert "ur" in settings["site_title"]
    assert "ar" in settings["site_title"]


def test_merge_settings_site_title():
    # Dictionary update
    merged = settings_controller._merge_settings({"site_title": {"en": "Custom English"}})
    assert merged["site_title"]["en"] == "Custom English"
    assert merged["site_title"]["ur"] == "مرکز اہل حدیث کوکن"

    # String update backwards-compatibility
    merged_str = settings_controller._merge_settings({"site_title": "String Title"})
    assert merged_str["site_title"]["en"] == "String Title"


if __name__ == "__main__":
    test_default_homepage_settings_include_sections_and_theme()
    test_merge_settings_site_title()
    print("All homepage settings tests passed successfully!")
