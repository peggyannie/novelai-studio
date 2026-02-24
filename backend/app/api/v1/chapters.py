from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api import deps
from app.models.user import User
from app.models.project import Project, Volume, Chapter
from app.schemas.project import Chapter as ChapterSchema, ChapterCreate, ChapterUpdate

router = APIRouter()

@router.post("/volumes/{volume_id}/chapters", response_model=ChapterSchema, status_code=201)
async def create_chapter(
    *,
    db: AsyncSession = Depends(deps.get_db),
    volume_id: int,
    chapter_in: ChapterCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new chapter in a volume.
    """
    # Verify volume (and project) ownership
    result = await db.execute(
        select(Volume)
        .join(Project)
        .where(Volume.id == volume_id, Project.user_id == current_user.id)
    )
    volume = result.scalars().first()
    if not volume:
        raise HTTPException(status_code=404, detail="Volume not found")

    chapter = Chapter(
        **chapter_in.dict(),
        volume_id=volume_id,
        project_id=volume.project_id
    )
    if chapter.content:
        chapter.word_count = len(chapter.content)
        
    db.add(chapter)
    await db.commit()
    await db.refresh(chapter)
    return chapter

@router.get("/chapters/{id}", response_model=ChapterSchema)
async def read_chapter(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get chapter details.
    """
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@router.put("/chapters/{id}", response_model=ChapterSchema)
async def update_chapter(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    chapter_in: ChapterUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update chapter.
    """
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = chapter_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chapter, field, value)
    
    # Calculate word count if content is updated
    if "content" in update_data and update_data["content"] is not None:
        chapter.word_count = len(update_data["content"])
    
    db.add(chapter)
    await db.commit()
    await db.refresh(chapter)
    return chapter

@router.delete("/chapters/{id}", response_model=ChapterSchema)
async def delete_chapter(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete chapter.
    """
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    await db.delete(chapter)
    await db.commit()
    return chapter
