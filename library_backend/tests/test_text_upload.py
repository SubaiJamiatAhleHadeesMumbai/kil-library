import io
from pathlib import Path

from fastapi import UploadFile

from utils.local_helper import save_txt_locally


def test_save_txt_locally_accepts_markdown_files(tmp_path, monkeypatch):
    monkeypatch.setattr("utils.local_helper.TXT_DIR", str(tmp_path))

    file = UploadFile(filename="notes.md", file=io.BytesIO(b"hello from markdown"))

    result = save_txt_locally(file)

    assert result is not None
    assert result.startswith("/uploads/texts/")
    assert (tmp_path / Path(result).name).exists()
