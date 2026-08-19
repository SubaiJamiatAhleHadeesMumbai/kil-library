from fastapi.testclient import TestClient

from main import app


def test_books_endpoint_allows_frontend_origin():
    client = TestClient(app)
    response = client.options(
        "/api/books/",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    }
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_render_host_is_allowed():
    client = TestClient(app)
    response = client.get("/", headers={"host": "kil2.onrender.com"})

    assert response.status_code == 404
