from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api import deps
from app.models.user import User
from app.models.project import Project, Chapter

router = APIRouter()


@router.get("/overview")
async def get_writing_stats(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Return writing statistics overview for the current user."""
    # Total projects
    result = await db.execute(
        select(func.count(Project.id)).where(Project.user_id == current_user.id)
    )
    total_projects = result.scalar() or 0

    # Total chapters + total words
    result = await db.execute(
        select(
            func.count(Chapter.id),
            func.coalesce(func.sum(Chapter.word_count), 0),
        )
        .join(Project)
        .where(Project.user_id == current_user.id)
    )
    row = result.one()
    total_chapters = row[0] or 0
    total_words = row[1] or 0

    # Today's words (chapters updated today)
    from datetime import date, datetime, timezone
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    result = await db.execute(
        select(func.coalesce(func.sum(Chapter.word_count), 0))
        .join(Project)
        .where(Project.user_id == current_user.id, Chapter.updated_at >= today_start)
    )
    today_words = result.scalar() or 0

    return {
        "total_projects": total_projects,
        "total_chapters": total_chapters,
        "total_words": total_words,
        "today_words": today_words,
    }
