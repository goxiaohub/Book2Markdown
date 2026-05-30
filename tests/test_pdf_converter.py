from __future__ import annotations

from pathlib import Path

import fitz

from converters.pdf_converter import convert_pdf


def _create_sample_pdf(path: Path) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Sample PDF Title", fontsize=22)
    page.insert_text((72, 120), "Chapter 1", fontsize=16)
    page.insert_text((72, 160), "This is a paragraph extracted from a PDF.", fontsize=11)
    page.insert_text((72, 190), "- First item", fontsize=11)
    page.insert_text((72, 215), "- Second item", fontsize=11)
    document.save(path)
    document.close()


def test_convert_pdf_extracts_text_and_headings(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.pdf"
    output_dir = tmp_path / "output"
    _create_sample_pdf(sample_path)

    markdown = convert_pdf(sample_path, output_dir)

    assert "# Sample PDF Title" in markdown
    assert "## Chapter 1" in markdown
    assert "This is a paragraph extracted from a PDF." in markdown
    assert "- First item" in markdown
    assert "- Second item" in markdown
