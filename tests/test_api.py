from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from api import api_app
from tests.test_pdf_converter import _create_sample_pdf


def test_health_endpoint() -> None:
    client = TestClient(api_app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_convert_endpoint_returns_markdown(tmp_path: Path) -> None:
    client = TestClient(api_app)
    sample_path = tmp_path / "sample.pdf"
    _create_sample_pdf(sample_path)

    with sample_path.open("rb") as sample_file:
        response = client.post(
            "/convert",
            files={"file": ("sample.pdf", sample_file, "application/pdf")},
        )

    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    assert "# Sample PDF Title" in response.text


def test_convert_endpoint_rejects_unknown_format(tmp_path: Path) -> None:
    client = TestClient(api_app)
    sample_path = tmp_path / "sample.txt"
    sample_path.write_text("hello", encoding="utf-8")

    with sample_path.open("rb") as sample_file:
        response = client.post(
            "/convert",
            files={"file": ("sample.txt", sample_file, "text/plain")},
        )

    assert response.status_code == 400
