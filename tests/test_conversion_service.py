from __future__ import annotations

from pathlib import Path

import pytest

from services.conversion_service import (
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
