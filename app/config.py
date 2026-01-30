from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenRouter
    openrouter_api_key: str = "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"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    llm_model: str = "google/gemini-3-flash-preview"

    # Database
    duckdb_path: str = "./data/speak_up.duckdb"

    # Security
    jwt_secret: str = "change_me_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # App
    room_code_length: int = 6
    max_students_per_exam: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
