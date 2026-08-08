"""
backend/app/api/v1/endpoints/health.py
Health check endpoint for checking application status.
"""
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Returns application health status and current API version."""
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }
