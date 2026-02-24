from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.api import deps
from app.models.user import User
from app.models.project import Project, Chapter
from app.models.snapshot import ChapterSnapshot
from app.schemas.snapshot import SnapshotCreate, Snapshot as SnapshotSchema, SnapshotList

router = APIRouter()

@router.post("/chapters/{chapter_id}/snapshots", response_model=SnapshotSchema, status_code=201)
async def create_snapshot(
    *,
    db: AsyncSession = Depends(deps.get_db),
    chapter_id: int,
    snapshot_in: SnapshotCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a snapshot of the current chapter content."""
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == chapter_id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    snapshot = ChapterSnapshot(
        chapter_id=chapter.id,
        content=chapter.content,
        word_count=chapter.word_count or 0,
        label=snapshot_in.label,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot

@router.get("/chapters/{chapter_id}/snapshots", response_model=List[SnapshotList])
async def list_snapshots(
    *,
    db: AsyncSession = Depends(deps.get_db),
    chapter_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all snapshots for a chapter, newest first."""
    # Verify ownership
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == chapter_id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    result = await db.execute(
        select(ChapterSnapshot)
        .where(ChapterSnapshot.chapter_id == chapter_id)
        .order_by(desc(ChapterSnapshot.created_at))
    )
    return result.scalars().all()

@router.get("/snapshots/{snapshot_id}", response_model=SnapshotSchema)
async def get_snapshot(
    *,
    db: AsyncSession = Depends(deps.get_db),
    snapshot_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get a single snapshot with full content."""
    result = await db.execute(
        select(ChapterSnapshot)
        .join(Chapter)
        .join(Project)
        .where(ChapterSnapshot.id == snapshot_id, Project.user_id == current_user.id)
    )
    snapshot = result.scalars().first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot

@router.post("/snapshots/{snapshot_id}/rollback", response_model=dict)
async def rollback_snapshot(
    *,
    db: AsyncSession = Depends(deps.get_db),
    snapshot_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Rollback chapter content to a snapshot version."""
    result = await db.execute(
        select(ChapterSnapshot)
        .join(Chapter)
        .join(Project)
        .where(ChapterSnapshot.id == snapshot_id, Project.user_id == current_user.id)
    )
    snapshot = result.scalars().first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Get the chapter
    chapter = await db.get(Chapter, snapshot.chapter_id)

    # Restore content
    chapter.content = snapshot.content
    chapter.word_count = snapshot.word_count
    db.add(chapter)
    await db.commit()

    return {"message": "Rollback successful", "chapter_id": chapter.id, "word_count": snapshot.word_count}

@router.delete("/snapshots/{snapshot_id}", status_code=204)
async def delete_snapshot(
    *,
    db: AsyncSession = Depends(deps.get_db),
    snapshot_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> None:
    """Delete a snapshot."""
    result = await db.execute(
        select(ChapterSnapshot)
        .join(Chapter)
        .join(Project)
        .where(ChapterSnapshot.id == snapshot_id, Project.user_id == current_user.id)
    )
    snapshot = result.scalars().first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    await db.delete(snapshot)
    await db.commit()
