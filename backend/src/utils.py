"""
日志和工具函数模块
优先使用 loguru，不可用时回退到标准 logging 模块
"""

import sys
import logging
from pathlib import Path
from typing import Union

# 尝试导入 loguru
try:
    from loguru import logger as loguru_logger
    _HAS_LOGURU = True
except ImportError:
    _HAS_LOGURU = False

# 标准 logging 作为后备
_std_logger: Union[logging.Logger, None] = None


def setup_logger(log_dir: str | None = None) -> None:
    """
    配置日志系统

    Args:
        log_dir: 日志目录路径，默认使用 backend/logs
    """
    global _std_logger

    if log_dir is None:
        log_dir = Path(__file__).parent.parent / "logs"
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / "app.log"

    if _HAS_LOGURU:
        loguru_logger.remove()
        loguru_logger.add(
            log_file,
            rotation="10 MB",
            retention="7 days",
            compression="zip",
            level="DEBUG",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {name}:{function}:{line} | {message}",
            encoding="utf-8",
        )
        loguru_logger.add(
            sys.stderr,
            level="INFO",
            format="<level>{level:<8}</level> | <cyan>{name}</cyan> | {message}",
            colorize=True,
        )
        loguru_logger.info("Logger initialized (loguru)")
    else:
        _std_logger = logging.getLogger("book2markdown")
        _std_logger.setLevel(logging.DEBUG)

        # 文件 handler
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s"
        ))
        _std_logger.addHandler(fh)

        # 控制台 handler
        ch = logging.StreamHandler(sys.stderr)
        ch.setLevel(logging.INFO)
        ch.setFormatter(logging.Formatter("%(levelname)-8s | %(name)s | %(message)s"))
        _std_logger.addHandler(ch)

        _std_logger.info("Logger initialized (stdlib logging)")


def get_logger(name: str):
    """获取子模块的日志记录器"""
    if _HAS_LOGURU:
        return loguru_logger.bind(name=name)
    else:
        return logging.getLogger(f"book2markdown.{name}")