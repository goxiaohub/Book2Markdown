from __future__ import annotations

from pathlib import Path

from converters.markdown_writer import prepare_output_dir, write_markdown


def test_prepare_output_dir_removes_previous_book_and_images(tmp_path: Path) -> None:
    output_dir = tmp_path / "output"
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True)
    (output_dir / "book.md").write_text("old", encoding="utf-8")
    (images_dir / "old.png").write_bytes(b"old")

    prepare_output_dir(output_dir)

    assert not (output_dir / "book.md").exists()
    assert images_dir.exists()
    assert list(images_dir.iterdir()) == []


def test_write_markdown_uses_utf8(tmp_path: Path) -> None:
    output_path = tmp_path / "book.md"

    result = write_markdown("# 标题\n\n内容", output_path)

    assert result == output_path
    assert output_path.read_text(encoding="utf-8") == "# 标题\n\n内容"
