from __future__ import annotations

import base64
from pathlib import Path

from ebooklib import epub

from converters.epub_converter import convert_epub


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
    "/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)


def _create_sample_epub(path: Path) -> None:
    book = epub.EpubBook()
    book.set_identifier("sample-id")
    book.set_title("Sample EPUB")
    book.set_language("en")

    image = epub.EpubImage(
        uid="sample-image",
        file_name="images/sample.png",
        media_type="image/png",
        content=PNG_BYTES,
    )

    chapter = epub.EpubHtml(title="Chapter 1", file_name="chapter.xhtml", lang="en")
    chapter.content = """
    <html>
      <body>
        <h1>Sample EPUB Title</h1>
        <p>This is a paragraph.</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
        <p><img src="images/sample.png" alt="Sample image" /></p>
      </body>
    </html>
    """

    book.add_item(chapter)
    book.add_item(image)
    book.toc = (epub.Link("chapter.xhtml", "Chapter 1", "chapter"),)
    book.spine = ["nav", chapter]
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    epub.write_epub(str(path), book)


def test_convert_epub_extracts_text_lists_and_images(tmp_path: Path) -> None:
    sample_path = tmp_path / "sample.epub"
    output_dir = tmp_path / "output"
    _create_sample_epub(sample_path)

    markdown = convert_epub(sample_path, output_dir)

    assert "# Sample EPUB Title" in markdown
    assert "This is a paragraph." in markdown
    assert "- First item" in markdown
    assert "- Second item" in markdown
    assert "![Sample image](images/image001.png)" in markdown
    assert (output_dir / "images" / "image001.png").exists()
