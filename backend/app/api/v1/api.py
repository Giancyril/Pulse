"""
backend/app/api/v1/api.py
API Router aggregator for v1 endpoints.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import health

api_router = APIRouter()

api_router.include_router(health.router)
