from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path

import fitz


logger = logging.getLogger(__name__)

PAGE_NUMBER_PATTERN = re.compile(r"^\s*(?:page\s*)?\d+\s*$", re.IGNORECASE)


@dataclass(frozen=True)
class PdfElement:
    """A text or image element extracted from a PDF page."""

    kind: str
    content: str
    font_size: float = 0.0
    page_number: int = 0


def _safe_text(value: str) -> str:
    return " ".join(value.split())


def _normalize_repeated_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _is_page_number(value: str) -> bool:
    return bool(PAGE_NUMBER_PATTERN.match(value))


def _image_extension(extension: str | None) -> str:
    normalized = (extension or "png").lower().lstrip(".")
    if normalized in {"jpeg", "jpg"}:
        return "jpg"
    if normalized in {"png", "webp", "bmp", "gif", "tiff"}:
        return normalized
    return "png"


def _export_image_block(
    block: dict,
    images_dir: Path,
    image_index: int,
) -> tuple[str | None, int]:
    image_bytes = block.get("image")
    if not image_bytes:
        return None, image_index

    extension = _image_extension(block.get("ext"))
    file_name = f"image{image_index:03d}.{extension}"
    output_path = images_dir / file_name
    output_path.write_bytes(image_bytes)
    logger.debug("Exported PDF image to %s", output_path)

    return f"![image](images/{file_name})", image_index + 1


def _extract_pdf_elements(document: fitz.Document, images_dir: Path) -> list[PdfElement]:
    elements: list[PdfElement] = []
    image_index = 1

    images_dir.mkdir(parents=True, exist_ok=True)

    for page_index, page in enumerate(document, start=1):
        page_dict = page.get_text("dict", sort=True)

        for block in page_dict.get("blocks", []):
            block_type = block.get("type")

            if block_type == 0:
                for line in block.get("lines", []):
                    spans = line.get("spans", [])
                    text = _safe_text(" ".join(span.get("text", "") for span in spans))
                    if not text:
                        continue

                    font_size = max(
                        (float(span.get("size", 0.0)) for span in spans),
                        default=0.0,
                    )
                    elements.append(
                        PdfElement(
                            kind="text",
                            content=text,
                            font_size=font_size,
                            page_number=page_index,
                        )
                    )

            if block_type == 1:
                markdown_image, image_index = _export_image_block(
                    block,
                    images_dir,
                    image_index,
                )
                if markdown_image:
                    elements.append(
                        PdfElement(
                            kind="image",
                            content=markdown_image,
                            page_number=page_index,
                        )
                    )

    return elements


def _find_repeated_lines(elements: list[PdfElement]) -> set[str]:
    page_count = max((element.page_number for element in elements), default=0)
    if page_count < 3:
        return set()

    page_lines: dict[int, list[str]] = {}
    for element in elements:
        if element.kind != "text":
            continue
        page_lines.setdefault(element.page_number, []).append(element.content)

    counts: dict[str, int] = {}
    for lines in page_lines.values():
        candidates = lines[:2] + lines[-2:]
        for candidate in candidates:
            normalized = _normalize_repeated_text(candidate)
            if len(normalized) < 4 or _is_page_number(normalized):
                continue
            counts[normalized] = counts.get(normalized, 0) + 1

    minimum_repeats = max(3, page_count // 2)
    return {
        text
        for text, count in counts.items()
        if count >= minimum_repeats
    }


def _heading_level(font_size: float, heading_sizes: list[float]) -> int | None:
    if not heading_sizes:
        return None

    for index, heading_size in enumerate(heading_sizes[:3], start=1):
        if font_size >= heading_size - 0.2:
            return index

    return None


def _detect_heading_sizes(elements: list[PdfElement]) -> list[float]:
    body_sizes = [
        round(element.font_size, 1)
        for element in elements
        if element.kind == "text" and element.font_size > 0
    ]
    if not body_sizes:
        return []

    size_counts: dict[float, int] = {}
    for size in body_sizes:
        size_counts[size] = size_counts.get(size, 0) + 1

    body_size = max(size_counts, key=size_counts.get)
    larger_sizes = sorted(
        {size for size in body_sizes if size >= body_size + 2},
        reverse=True,
    )
    return larger_sizes[:3]


def _format_text_element(element: PdfElement, heading_sizes: list[float]) -> str:
    text = element.content
    heading_level = _heading_level(element.font_size, heading_sizes)

    if heading_level and len(text) <= 120:
        return f"{'#' * heading_level} {text}"

    if re.match(r"^[-*•]\s+", text):
        item_text = re.sub(r"^[-*•]\s+", "", text)
        return f"- {item_text}"

    if re.match(r"^\d+[.)]\s+", text):
        return text

    return text


def convert_pdf(source_path: Path, output_dir: Path) -> str:
    """Convert a PDF file to Markdown."""
    if not source_path.exists():
        raise FileNotFoundError(f"PDF file not found: {source_path}")

    logger.info("Converting PDF: %s", source_path)

    try:
        with fitz.open(source_path) as document:
            elements = _extract_pdf_elements(document, output_dir / "images")
    except Exception as exc:
        raise ValueError(f"Unable to read PDF file: {exc}") from exc

    repeated_lines = _find_repeated_lines(elements)
    heading_sizes = _detect_heading_sizes(elements)
    markdown_blocks: list[str] = []

    for element in elements:
        if element.kind == "image":
            markdown_blocks.append(element.content)
            continue

        normalized = _normalize_repeated_text(element.content)
        if _is_page_number(element.content) or normalized in repeated_lines:
            continue

        markdown_blocks.append(_format_text_element(element, heading_sizes))

    markdown = "\n\n".join(block for block in markdown_blocks if block).strip()
    if not markdown:
        raise ValueError("No readable content was found in this PDF.")

    return f"{markdown}\n"
