from fastapi import APIRouter

from app.api.v1 import auth, billing, edits, export, files, objects

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(objects.router, prefix="/objects", tags=["objects"])
api_router.include_router(edits.router, prefix="/edits", tags=["edits"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
