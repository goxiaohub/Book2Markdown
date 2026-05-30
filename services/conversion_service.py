from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from converters.epub_converter import convert_epub
from converters.markdown_writer import prepare_output_dir, write_markdown
from converters.pdf_converter import convert_pdf


logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".epub", ".pdf"}


@dataclass(frozen=True)
class ConversionResult:
    """Result returned after a successful conversion."""

    markdown: str
    markdown_path: Path
    output_dir: Path


class UnsupportedFormatError(ValueError):
    """Raised when the uploaded file extension is not supported."""


def convert_book_to_markdown(source_path: Path, output_dir: Path) -> ConversionResult:
    """Convert an EPUB or PDF file into Markdown and write it to disk."""
    suffix = source_path.suffix.lower()
    logger.info("Received file for conversion: %s", source_path.name)

    if suffix not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFormatError(
            "Unsupported format. Please upload a .epub or .pdf file."
        )

    prepare_output_dir(output_dir)

    if suffix == ".epub":
        markdown = convert_epub(source_path, output_dir)
    else:
        markdown = convert_pdf(source_path, output_dir)

    markdown_path = write_markdown(markdown, output_dir / "book.md")
    return ConversionResult(
        markdown=markdown,
        markdown_path=markdown_path,
        output_dir=output_dir,
    )
