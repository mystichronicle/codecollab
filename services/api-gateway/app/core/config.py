from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    """Application configuration using environment variables."""
    
    PROJECT_NAME: str = "CodeCollab"
    ENVIRONMENT: str = "development"
    
    # Security - MUST be set in production via environment variables
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database URLs - Override in production
    DATABASE_URL: str = "postgresql://codecollab:dev_password@postgres:5432/codecollab"
    REDIS_URL: str = "redis://redis:6379/0"
    MONGODB_URL: str = "mongodb://codecollab:dev_password@mongodb:27017/codecollab?authSource=admin"
    RABBITMQ_URL: str = "amqp://codecollab:dev_password@rabbitmq:5672/"
    
    # CORS - Restrict in production
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

    AUTH_SERVICE_URL: str = "http://auth-service:8001"
    COLLAB_SERVICE_URL: str = "http://collab-service:8002"
    AI_SERVICE_URL: str = "http://ai-service:8003"
    EXECUTION_SERVICE_URL: str = "http://localhost:8004"
    COMPILER_SERVICE_URL: str = "http://compiler-service:8005"
    MEMORY_SERVICE_URL: str = "http://memory-service:8006"
    SESSION_MANAGER_URL: str = "http://session-manager:8007"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        if self.ENVIRONMENT == "production" and "dev_secret" in self.SECRET_KEY.lower():
            raise ValueError("Cannot use default SECRET_KEY in production!")


settings = Settings()
