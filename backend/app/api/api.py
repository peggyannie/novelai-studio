from fastapi import APIRouter
from app.api.v1 import auth, projects, volumes, chapters, lore, outline, writing, consistency, snapshots, export, stats, reorder, bible

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(volumes.router, tags=["Volumes"])
api_router.include_router(chapters.router, tags=["Chapters"])
api_router.include_router(lore.router, tags=["Lore"])
api_router.include_router(bible.router, prefix="/projects", tags=["Bible Generation"])
api_router.include_router(outline.router, prefix="/outline", tags=["Outline"])
api_router.include_router(writing.router, prefix="/writing", tags=["Writing"])
api_router.include_router(consistency.router, prefix="/consistency", tags=["Consistency"])
api_router.include_router(snapshots.router, tags=["Snapshots"])
api_router.include_router(export.router, tags=["Export"])
api_router.include_router(stats.router, prefix="/stats", tags=["Stats"])
api_router.include_router(reorder.router, prefix="/reorder", tags=["Reorder"])
