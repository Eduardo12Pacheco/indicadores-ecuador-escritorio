"""Typed settings loaded from ``ECUADOR_DATA_*`` environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from ecuador_data import __version__


def default_data_dir() -> Path:
    """Return the repository ``data/`` directory for source checkouts.

    Running the CLI from ``pipeline/`` (as documented) must write to the
    repository-level ``data/`` directory, not to ``pipeline/data/``. Installed
    wheels fall back to ``./data``; deployments set ``ECUADOR_DATA_DATA_DIR``.
    """

    pipeline_dir = Path(__file__).resolve().parents[2]
    if (pipeline_dir / "pyproject.toml").is_file():
        return pipeline_dir.parent / "data"
    return Path("data")


class Settings(BaseSettings):
    """Runtime configuration for the data pipeline.

    Every field maps to a documented environment variable with the
    ``ECUADOR_DATA_`` prefix, for example ``ECUADOR_DATA_DATA_DIR``.
    """

    model_config = SettingsConfigDict(
        env_prefix="ECUADOR_DATA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    data_dir: Path = Field(default_factory=default_data_dir)
    http_timeout_s: float = Field(default=30.0, gt=0)
    http_retries: int = Field(default=4, ge=1, le=10)
    user_agent: str = Field(
        default=(
            f"ecuador-data/{__version__} "
            "(+https://github.com/Eduardo12Pacheco/indicadores-ecuador-escritorio)"
        ),
        min_length=1,
    )
    log_level: str = Field(default="INFO", min_length=1)


def load_settings() -> Settings:
    return Settings()
