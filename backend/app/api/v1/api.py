"""
backend/app/api/v1/api.py
API Router aggregator for v1 endpoints.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import health, upload, datasets

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(upload.router)
api_router.include_router(datasets.router)
