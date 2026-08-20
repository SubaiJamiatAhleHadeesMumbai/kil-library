from fastapi.testclient import TestClient

from main import app


def test_about_settings_endpoint_returns_default_structure():
    client = TestClient(app)
    response = client.get("/api/settings/about-settings", headers={"host": "127.0.0.1"})

    assert response.status_code == 200
    payload = response.json()

    assert "hero" in payload
    assert "intro" in payload
    assert "ulma_quotes" in payload
    assert "gallery" in payload
    assert isinstance(payload["ulma_quotes"], list)
    assert isinstance(payload["gallery"], list)