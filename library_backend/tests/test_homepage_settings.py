from controllers import settings_controller


def test_default_homepage_settings_include_sections_and_theme():
    settings = settings_controller.get_default_homepage_settings()

    assert settings["theme"] in {"day", "night", "aurora"}
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
