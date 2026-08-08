"""
backend/app/core/config.py
Pydantic BaseSettings loading environment configuration.
"""
from typing import List, Union
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Data Analyst API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Credentials
    GEMINI_API_KEY: str = Field(default="your_gemini_api_key_here")
    SECRET_KEY: str = Field(default="dev_secret_key_change_in_production_123456")

    # Database
    DATABASE_URL: str = Field(default="sqlite:///./aidataanalyst.db")

    # Security & Guardrails
    ENCRYPTION_KEY: str = Field(default="dev_fernet_key_32_bytes_placeholder_val=")
    MAX_ROW_LIMIT: int = Field(default=1000)
    QUERY_TIMEOUT_SECONDS: int = Field(default=5)

    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
