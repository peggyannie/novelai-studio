from typing import Any
from io import BytesIO
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import asc

from app.api import deps
from app.models.user import User
from app.models.project import Project, Volume, Chapter

router = APIRouter()


@router.get("/projects/{project_id}/export/txt")
async def export_project_txt(
    *,
    db: AsyncSession = Depends(deps.get_db),
    project_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Export entire project as a TXT file."""
    # Fetch project
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch volumes+chapters ordered
    result = await db.execute(
        select(Volume)
        .where(Volume.project_id == project_id)
        .order_by(asc(Volume.order_no))
    )
    volumes = result.scalars().all()

    lines = []
    lines.append(f"《{project.title}》\n")
    lines.append(f"类型: {project.genre or '未知'}\n")
    lines.append("=" * 40 + "\n\n")

    for vol in volumes:
        result = await db.execute(
            select(Chapter)
            .where(Chapter.volume_id == vol.id)
            .order_by(asc(Chapter.order_no))
        )
        chapters = result.scalars().all()

        lines.append(f"\n{vol.title}\n")
        lines.append("-" * 30 + "\n\n")

        for ch in chapters:
            lines.append(f"\n{ch.title}\n\n")
            lines.append((ch.content or "(空)") + "\n\n")

    content = "".join(lines)
    buffer = BytesIO(content.encode("utf-8"))

    filename = quote(f"{project.title}.txt")

    return StreamingResponse(
        buffer,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}"
        }
    )


@router.get("/chapters/{chapter_id}/export/txt")
async def export_chapter_txt(
    *,
    db: AsyncSession = Depends(deps.get_db),
    chapter_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Export a single chapter as TXT."""
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == chapter_id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    content = f"{chapter.title}\n\n{chapter.content or '(空)'}\n"
    buffer = BytesIO(content.encode("utf-8"))

    filename = quote(f"{chapter.title}.txt")

    return StreamingResponse(
        buffer,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}"
        }
    )
