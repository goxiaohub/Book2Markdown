from __future__ import annotations

import shutil
from pathlib import Path


def prepare_output_dir(output_dir: Path) -> Path:
    """Prepare a clean output directory for one conversion run."""
    output_dir.mkdir(parents=True, exist_ok=True)

    markdown_path = output_dir / "book.md"
    if markdown_path.exists():
        markdown_path.unlink()

    images_dir = output_dir / "images"
    if images_dir.exists():
        shutil.rmtree(images_dir)
    images_dir.mkdir(parents=True, exist_ok=True)

    return output_dir


def write_markdown(content: str, output_path: Path) -> Path:
    """Write Markdown content with UTF-8 encoding."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")
    return output_path
