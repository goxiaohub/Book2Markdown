from __future__ import annotations

import logging
import mimetypes
from pathlib import Path
from urllib.parse import unquote

from bs4 import BeautifulSoup, Tag
from ebooklib import ITEM_DOCUMENT, ITEM_IMAGE
from ebooklib import epub


logger = logging.getLogger(__name__)


def _safe_text(value: str) -> str:
    return " ".join(value.split())


def _image_extension(media_type: str | None, fallback_name: str) -> str:
    if media_type:
        extension = mimetypes.guess_extension(media_type)
        if extension:
            return ".jpg" if extension == ".jpe" else extension

    fallback_extension = Path(unquote(fallback_name)).suffix
    return fallback_extension or ".png"


def _export_images(book: epub.EpubBook, images_dir: Path) -> dict[str, str]:
    images_dir.mkdir(parents=True, exist_ok=True)
    image_map: dict[str, str] = {}

    for index, item in enumerate(book.get_items_of_type(ITEM_IMAGE), start=1):
        file_name = f"image{index:03d}{_image_extension(item.media_type, item.file_name)}"
        output_path = images_dir / file_name
        output_path.write_bytes(item.get_content())

        markdown_path = f"images/{file_name}"
        image_map[item.file_name] = markdown_path
        image_map[Path(unquote(item.file_name)).name] = markdown_path
        logger.debug("Exported EPUB image %s to %s", item.file_name, output_path)

    return image_map


def _convert_image(tag: Tag, image_map: dict[str, str]) -> str:
    src = tag.get("src") or tag.get("href") or ""
    src_name = Path(unquote(str(src))).name
    markdown_src = image_map.get(str(src)) or image_map.get(src_name)

    if not markdown_src:
        logger.warning("Image reference not found in EPUB manifest: %s", src)
        return ""

    alt = _safe_text(tag.get("alt", "image"))
    return f"![{alt}]({markdown_src})"


def _convert_list(tag: Tag, image_map: dict[str, str], ordered: bool = False) -> str:
    lines: list[str] = []

    for index, item in enumerate(tag.find_all("li", recursive=False), start=1):
        text_parts = _convert_children(item, image_map)
        text = _safe_text(" ".join(text_parts))
        if not text:
            continue

        prefix = f"{index}." if ordered else "-"
        lines.append(f"{prefix} {text}")

    return "\n".join(lines)


def _convert_children(tag: Tag, image_map: dict[str, str]) -> list[str]:
    blocks: list[str] = []

    for child in tag.children:
        if isinstance(child, Tag):
            converted = _convert_tag(child, image_map)
            if converted:
                blocks.append(converted)
        else:
            text = _safe_text(str(child))
            if text:
                blocks.append(text)

    return blocks


def _convert_tag(tag: Tag, image_map: dict[str, str]) -> str:
    name = tag.name.lower()

    if name in {"script", "style", "nav"}:
        return ""

    if name in {"h1", "h2", "h3", "h4", "h5", "h6"}:
        level = int(name[1])
        text = _safe_text(tag.get_text(" ", strip=True))
        return f"{'#' * level} {text}" if text else ""

    if name == "p":
        parts = _convert_children(tag, image_map)
        return _safe_text(" ".join(parts))

    if name == "img":
        return _convert_image(tag, image_map)

    if name == "ul":
        return _convert_list(tag, image_map)

    if name == "ol":
        return _convert_list(tag, image_map, ordered=True)

    if name in {"br", "hr"}:
        return "\n"

    return "\n\n".join(_convert_children(tag, image_map))


def convert_epub(source_path: Path, output_dir: Path) -> str:
    """Convert an EPUB file to Markdown."""
    if not source_path.exists():
        raise FileNotFoundError(f"EPUB file not found: {source_path}")

    logger.info("Converting EPUB: %s", source_path)
    book = epub.read_epub(str(source_path))
    image_map = _export_images(book, output_dir / "images")
    markdown_blocks: list[str] = []

    for item in book.get_items_of_type(ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        body = soup.body or soup
        converted = _convert_tag(body, image_map).strip()
        if converted:
            markdown_blocks.append(converted)

    markdown = "\n\n".join(markdown_blocks).strip()
    if not markdown:
        raise ValueError("No readable content was found in this EPUB.")

    return f"{markdown}\n"
