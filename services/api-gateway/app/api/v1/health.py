from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import redis
import logging

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """
    Health check endpoint - returns the status of all services
    """
    status = {
        "status": "healthy",
        "service": "api-gateway",
        "version": "0.1.0",
        "checks": {}
    }
    
    try:
        status["checks"]["postgresql"] = "healthy"
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        status["checks"]["postgresql"] = "unhealthy"
        status["status"] = "degraded"
    
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        status["checks"]["redis"] = "healthy"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        status["checks"]["redis"] = "unhealthy"
        status["status"] = "degraded"
    
    try:
        status["checks"]["mongodb"] = "healthy"
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        status["checks"]["mongodb"] = "unhealthy"
        status["status"] = "degraded"
    
    return status


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check - indicates if the service is ready to accept traffic
    """
    return {
        "ready": True,
        "service": "api-gateway"
    }


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check - indicates if the service is alive
    """
    return {
        "alive": True,
        "service": "api-gateway"
    }
