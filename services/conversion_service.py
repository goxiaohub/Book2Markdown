from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from converters.epub_converter import convert_epub
from converters.markdown_writer import prepare_output_dir, write_markdown
from converters.pdf_converter import convert_pdf
from providers.mineru_provider import MinerUError, convert_with_mineru


logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".epub", ".pdf"}
MINERU_SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}


@dataclass(frozen=True)
class ConversionResult:
    """Result returned after a successful conversion."""

    markdown: str
    markdown_path: Path
    output_dir: Path


class UnsupportedFormatError(ValueError):
    """Raised when the uploaded file extension is not supported."""


class ConversionProviderError(RuntimeError):
    """Raised when an optional provider fails."""


def _validate_extension(suffix: str, use_mineru: bool) -> None:
    supported = SUPPORTED_EXTENSIONS | (MINERU_SUPPORTED_EXTENSIONS if use_mineru else set())
    if suffix not in supported:
        raise UnsupportedFormatError(
            "Unsupported format. Please upload a .epub, .pdf, or MinerU-supported "
            "image file."
        )


def convert_book_to_markdown(
    source_path: Path,
    output_dir: Path,
    use_mineru: bool = False,
) -> ConversionResult:
    """Convert an EPUB or PDF file into Markdown and write it to disk."""
    suffix = source_path.suffix.lower()
    logger.info("Received file for conversion: %s", source_path.name)

    _validate_extension(suffix, use_mineru)

    prepare_output_dir(output_dir)

    try:
        if use_mineru and suffix in MINERU_SUPPORTED_EXTENSIONS:
            markdown = convert_with_mineru(source_path, output_dir)
        elif suffix == ".epub":
            markdown = convert_epub(source_path, output_dir)
        else:
            markdown = convert_pdf(source_path, output_dir)
    except MinerUError as exc:
        raise ConversionProviderError(str(exc)) from exc

    markdown_path = write_markdown(markdown, output_dir / "book.md")
    return ConversionResult(
        markdown=markdown,
        markdown_path=markdown_path,
        output_dir=output_dir,
    )
