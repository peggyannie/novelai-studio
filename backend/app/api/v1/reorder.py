from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.api import deps
from app.models.user import User
from app.models.project import Project, Volume, Chapter

router = APIRouter()


class ReorderItem(BaseModel):
    id: int
    order_no: int


class ReorderRequest(BaseModel):
    items: List[ReorderItem]


@router.put("/volumes/reorder")
async def reorder_volumes(
    *,
    db: AsyncSession = Depends(deps.get_db),
    body: ReorderRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Reorder volumes by updating their order_no."""
    for item in body.items:
        result = await db.execute(
            select(Volume)
            .join(Project)
            .where(Volume.id == item.id, Project.user_id == current_user.id)
        )
        volume = result.scalars().first()
        if volume:
            volume.order_no = item.order_no
    await db.commit()
    return {"message": "ok"}


@router.put("/chapters/reorder")
async def reorder_chapters(
    *,
    db: AsyncSession = Depends(deps.get_db),
    body: ReorderRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Reorder chapters by updating their order_no."""
    for item in body.items:
        result = await db.execute(
            select(Chapter)
            .join(Volume)
            .join(Project)
            .where(Chapter.id == item.id, Project.user_id == current_user.id)
        )
        chapter = result.scalars().first()
        if chapter:
            chapter.order_no = item.order_no
    await db.commit()
    return {"message": "ok"}
