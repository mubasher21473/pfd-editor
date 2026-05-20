from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    storage_endpoint_url: str
    storage_access_key_id: str
    storage_secret_access_key: str
    storage_bucket_name: str
    storage_public_url: str
    stripe_secret_key: str
    stripe_webhook_secret: str
    cors_origins: str = "http://localhost:3000"
    free_tier_uploads_per_month: int = 3
    free_tier_max_file_size_mb: int = 10
    pro_tier_max_file_size_mb: int = 50
    environment: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
