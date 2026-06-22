"""Application configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Primary provider: DeepSeek (the only one configured currently)
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # OpenAI fallback (if DEEPSEEK_* is not set, try OPENAI_*)
    openai_api_key: str = os.getenv("OPENAI_API_KEY", os.getenv("DEEPSEEK_API_KEY", ""))
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"))
    openai_model: str = os.getenv("OPENAI_MODEL", os.getenv("DEEPSEEK_MODEL", "deepseek-chat"))

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")

    @property
    def is_configured(self) -> bool:
        return bool(self.openai_api_key and self.supabase_url)


settings = Settings()