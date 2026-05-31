# -*- coding: utf-8 -*-
"""
文档转换核心模块
使用 Microsoft MarkItDown 进行文档转换
"""

import json, sys, time, traceback
from pathlib import Path
from typing import Optional, Any

from markitdown import MarkItDown
from .utils import setup_logger, get_logger

PROTOCOL_VERSION = "1.0"

SUPPORTED_FORMATS = {
    ".pdf": "PDF", ".epub": "EPUB", ".docx": "Word",
    ".pptx": "PowerPoint", ".xlsx": "Excel", ".html": "HTML",
    ".htm": "HTML", ".csv": "CSV", ".json": "JSON", ".xml": "XML",
    ".jpg": "Image", ".jpeg": "Image", ".png": "Image",
    ".gif": "Image", ".bmp": "Image", ".tiff": "Image",
    ".mp3": "Audio", ".wav": "Audio", ".zip": "Archive",
}

setup_logger()
logger = get_logger(__name__)
_md_converter: Optional[MarkItDown] = None


def get_converter() -> MarkItDown:
    global _md_converter
    if _md_converter is None:
        logger.info("Initializing MarkItDown converter")
        _md_converter = MarkItDown()
    return _md_converter


def make_response(success: bool, data: dict | None = None, error: str | None = None) -> dict:
    return {
        "protocol": PROTOCOL_VERSION,
        "success": success,
        "data": data or {},
        "error": error,
    }


def detect_format(file_path: str) -> tuple:
    ext = Path(file_path).suffix.lower()
    return ext, SUPPORTED_FORMATS.get(ext, "Unknown")


def health_check() -> dict:
    try:
        get_converter()
        return make_response(True, data={
            "status": "healthy",
            "engine": "markitdown",
            "protocol": PROTOCOL_VERSION,
            "supported_formats_count": len(SUPPORTED_FORMATS),
            "supported_extensions": list(SUPPORTED_FORMATS.keys()),
        })
    except Exception as e:
        return make_response(False, error=str(e))


def convert_file(file_path: str) -> dict:
    start_time = time.time()
    try:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        if not path.is_file():
            raise ValueError(f"Not a file: {file_path}")

        ext, fmt_name = detect_format(file_path)
        file_size = path.stat().st_size
        logger.info(f"Converting: {path.name} ({fmt_name}, {file_size} bytes)")

        converter = get_converter()
        converted = converter.convert(str(path))

        elapsed = time.time() - start_time
        markdown_len = len(converted.text_content)
        logger.info(f"Done: {path.name} -> {markdown_len} chars in {elapsed:.2f}s")

        return make_response(True, data={
            "markdown": converted.text_content,
            "filename": path.stem + ".md",
            "metadata": {
                "source_file": path.name,
                "source_format": fmt_name,
                "source_extension": ext,
                "source_size_bytes": file_size,
                "markdown_length": markdown_len,
                "conversion_time_seconds": round(elapsed, 3),
            },
        })

    except FileNotFoundError as e:
        logger.error(str(e))
        return make_response(False, error=f"文件未找到: {e}")
    except ValueError as e:
        logger.error(str(e))
        return make_response(False, error=str(e))
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Conversion failed ({elapsed:.2f}s): {e}")
        logger.debug(traceback.format_exc())
        return make_response(False, error=f"转换失败: {str(e)}")


def main():
    if len(sys.argv) < 2:
        print(json.dumps(
            make_response(False, error="Usage: python -m src.converter <action> [args...]"),
            ensure_ascii=False
        ))
        sys.exit(1)

    action = sys.argv[1]

    if action == "health":
        result = health_check()
    elif action == "convert":
        if len(sys.argv) < 3:
            result = make_response(False, error="convert requires file path")
        else:
            result = convert_file(sys.argv[2])
    elif action == "batch":
        if len(sys.argv) < 3:
            result = make_response(False, error="batch requires file paths")
        else:
            results = [convert_file(fp) for fp in sys.argv[2:]]
            result = make_response(True, data={"results": results})
    else:
        result = make_response(False, error=f"Unknown action: {action}")

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
