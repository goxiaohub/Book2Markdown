from __future__ import annotations

import logging
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


logger = logging.getLogger(__name__)


class MinerUError(RuntimeError):
    """Raised when MinerU conversion fails."""


@dataclass(frozen=True)
class MinerUOptions:
    """Configuration for the MinerU CLI provider."""

    command: str = "mineru"
    method: str = "auto"
    backend: str | None = None
    api_url: str | None = None
    timeout_seconds: int = 1800


def mineru_options_from_env() -> MinerUOptions:
    """Create MinerU options from environment variables."""
    return MinerUOptions(
        command=os.getenv("BOOK2MARKDOWN_MINERU_COMMAND", "mineru"),
        method=os.getenv("BOOK2MARKDOWN_MINERU_METHOD", "auto"),
        backend=os.getenv("BOOK2MARKDOWN_MINERU_BACKEND") or None,
        api_url=os.getenv("BOOK2MARKDOWN_MINERU_API_URL") or None,
        timeout_seconds=int(os.getenv("BOOK2MARKDOWN_MINERU_TIMEOUT", "1800")),
    )


def _build_command(source_path: Path, output_dir: Path, options: MinerUOptions) -> list[str]:
    command = [
        options.command,
        "-p",
        str(source_path),
        "-o",
        str(output_dir),
        "-m",
        options.method,
    ]

    if options.backend:
        command.extend(["-b", options.backend])

    if options.api_url:
        command.extend(["--api-url", options.api_url])

    return command


def _find_markdown_file(output_dir: Path) -> Path:
    markdown_files = sorted(
        output_dir.rglob("*.md"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not markdown_files:
        raise MinerUError("MinerU finished but no Markdown file was generated.")
    return markdown_files[0]


def convert_with_mineru(
    source_path: Path,
    output_dir: Path,
    options: MinerUOptions | None = None,
) -> str:
    """Convert a document with the external MinerU CLI."""
    options = options or mineru_options_from_env()
    command_path = shutil.which(options.command)
    if command_path is None:
        raise MinerUError(
            "MinerU CLI was not found. Install MinerU or set "
            "BOOK2MARKDOWN_MINERU_COMMAND."
        )

    mineru_output_dir = output_dir / "mineru"
    mineru_output_dir.mkdir(parents=True, exist_ok=True)
    command = _build_command(source_path, mineru_output_dir, options)
    logger.info("Running MinerU command: %s", " ".join(command))

    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=options.timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise MinerUError("MinerU conversion timed out.") from exc

    if completed.returncode != 0:
        raise MinerUError(
            "MinerU conversion failed: "
            f"{completed.stderr.strip() or completed.stdout.strip()}"
        )

    markdown_path = _find_markdown_file(mineru_output_dir)
    return markdown_path.read_text(encoding="utf-8")
