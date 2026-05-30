from __future__ import annotations

import logging
from pathlib import Path

import gradio as gr

from services.conversion_service import (
    ConversionProviderError,
    UnsupportedFormatError,
    convert_book_to_markdown,
)


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "output"


def convert_book(file_path: str | None, use_mineru: bool) -> tuple[str, str | None]:
    """Convert an uploaded ebook and return a preview plus download path."""
    if not file_path:
        return "Please upload an EPUB or PDF file first.", None

    source = Path(file_path)

    try:
        result = convert_book_to_markdown(source, OUTPUT_DIR, use_mineru=use_mineru)
        return result.markdown, str(result.markdown_path)
    except UnsupportedFormatError as exc:
        return str(exc), None
    except ConversionProviderError as exc:
        logger.exception("External provider conversion failed")
        return f"Provider conversion failed: {exc}", None
    except Exception as exc:
        logger.exception("Conversion failed")
        return f"Conversion failed: {exc}", None


def build_ui() -> gr.Blocks:
    """Build the Gradio interface."""
    with gr.Blocks(title="Book2Markdown") as demo:
        gr.Markdown("# Book2Markdown")
        gr.Markdown("Upload an EPUB or PDF file and convert it to Markdown.")

        ebook_file = gr.File(
            label="Upload File",
            file_types=[".epub", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".bmp"],
            type="filepath",
        )
        use_mineru = gr.Checkbox(
            label="Use MinerU for PDFs/images",
            value=False,
        )
        convert_button = gr.Button("Convert", variant="primary")
        markdown_preview = gr.Markdown(label="Preview Markdown")
        markdown_download = gr.File(label="Download Markdown")

        convert_button.click(
            fn=convert_book,
            inputs=[ebook_file, use_mineru],
            outputs=[markdown_preview, markdown_download],
            show_progress="full",
            show_api=False,
        )

    return demo


if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    build_ui().launch(server_name="0.0.0.0", server_port=7860)
