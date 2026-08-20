from pathlib import Path

from utils.local_helper import resolve_upload_path


def test_resolve_upload_path_uses_backend_static_directory(tmp_path, monkeypatch):
    monkeypatch.setattr("utils.local_helper.BASE_DIR", tmp_path)

    upload_file = tmp_path / "static" / "uploads" / "texts" / "sample.txt"
    upload_file.parent.mkdir(parents=True, exist_ok=True)
    upload_file.write_text("hello from deep search", encoding="utf-8")

    result = resolve_upload_path("/uploads/texts/sample.txt")

    assert result == upload_file.resolve()
