from __future__ import annotations

from pathlib import Path

import pytest

from providers.mineru_provider import MinerUError, convert_with_mineru


def test_convert_with_mineru_requires_cli(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sample_path = tmp_path / "sample.pdf"
    sample_path.write_bytes(b"pdf")
    monkeypatch.setattr("providers.mineru_provider.shutil.which", lambda _: None)

    with pytest.raises(MinerUError, match="MinerU CLI was not found"):
        convert_with_mineru(sample_path, tmp_path / "output")
