from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from services.conversion_service import (
    ConversionProviderError,
    MINERU_SUPPORTED_EXTENSIONS,
    SUPPORTED_EXTENSIONS,
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

api_app = FastAPI(
    title="Book2Markdown API",
    description="Convert EPUB and PDF ebooks into Markdown.",
    version="0.1.0",
)


@api_app.get("/health")
def health() -> dict[str, str]:
    """Return service health."""
    return {"status": "ok"}


@api_app.post("/convert")
def convert(
    file: UploadFile = File(...),
    use_mineru: bool = Query(False),
) -> FileResponse:
    """Convert an uploaded EPUB or PDF file and return book.md."""
    suffix = Path(file.filename or "").suffix.lower()
    supported = SUPPORTED_EXTENSIONS | (MINERU_SUPPORTED_EXTENSIONS if use_mineru else set())
    if suffix not in supported:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported format. Please upload a .epub, .pdf, or "
                "MinerU-supported image file."
            ),
        )

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        result = convert_book_to_markdown(temp_path, OUTPUT_DIR, use_mineru=use_mineru)
        return FileResponse(
            path=result.markdown_path,
            media_type="text/markdown; charset=utf-8",
            filename="book.md",
        )
    except UnsupportedFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConversionProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("API conversion failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        file.file.close()
        if "temp_path" in locals() and temp_path.exists():
            temp_path.unlink()
