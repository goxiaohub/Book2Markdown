from __future__ import annotations

from pathlib import Path

import pytest

import services.conversion_service as conversion_service
from services.conversion_service import (
    ConversionProviderError,
    UnsupportedFormatError,
    convert_book_to_markdown,
)
from tests.test_pdf_converter import _create_sample_pdf


def test_convert_book_to_markdown_routes_pdf(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.pdf"
    output_dir = tmp_path / "output"
    _create_sample_pdf(sample_path)

    result = convert_book_to_markdown(sample_path, output_dir)

    assert result.markdown_path == output_dir / "book.md"
    assert result.markdown_path.exists()
    assert "# Sample PDF Title" in result.markdown


def test_convert_book_to_markdown_rejects_unknown_format(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.txt"
    sample_path.write_text("hello", encoding="utf-8")

    with pytest.raises(UnsupportedFormatError):
        convert_book_to_markdown(sample_path, tmp_path / "output")


def test_convert_book_to_markdown_rejects_image_without_mineru(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.png"
    sample_path.write_bytes(b"not a real image")

    with pytest.raises(UnsupportedFormatError):
        convert_book_to_markdown(sample_path, tmp_path / "output")


def test_convert_book_to_markdown_routes_mineru(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_path = tmp_path / "sample.png"
    output_dir = tmp_path / "output"
    sample_path.write_bytes(b"not a real image")

    def fake_convert_with_mineru(source_path: Path, output_path: Path) -> str:
        assert source_path == sample_path
        assert output_path == output_dir
        return "# MinerU Result\n"

    monkeypatch.setattr(
        conversion_service,
        "convert_with_mineru",
        fake_convert_with_mineru,
    )

    result = convert_book_to_markdown(sample_path, output_dir, use_mineru=True)

    assert result.markdown == "# MinerU Result\n"
    assert result.markdown_path.read_text(encoding="utf-8") == "# MinerU Result\n"


def test_convert_book_to_markdown_wraps_mineru_errors(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_path = tmp_path / "sample.pdf"
    sample_path.write_bytes(b"not a real pdf")

    def fake_convert_with_mineru(source_path: Path, output_path: Path) -> str:
        raise conversion_service.MinerUError("missing mineru")

    monkeypatch.setattr(
        conversion_service,
        "convert_with_mineru",
        fake_convert_with_mineru,
    )

    with pytest.raises(ConversionProviderError, match="missing mineru"):
        convert_book_to_markdown(sample_path, tmp_path / "output", use_mineru=True)
