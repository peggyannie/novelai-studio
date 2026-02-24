from typing import Any, List
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.user import User
from app.models.project import Project, Chapter
from app.models.lore import LoreItem
from app.schemas.consistency import (
    ConsistencyCheckResponse, ConsistencyIssue,
    ConsistencyFixRequest, ConsistencyFixResponse,
)
from app.core import prompts
from app.core.ai_client import ai_client

router = APIRouter()

@router.post("/{chapter_id}/check", response_model=ConsistencyCheckResponse)
async def check_consistency(
    *,
    db: AsyncSession = Depends(deps.get_db),
    chapter_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Check chapter consistency against lore and outline.
    """
    # 1. Fetch Chapter
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == chapter_id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    project = await db.get(Project, chapter.project_id)

    # 2. Fetch Lore (All active lore for now)
    result = await db.execute(
        select(LoreItem)
        .where(LoreItem.project_id == project.id)
    )
    lore_items = result.scalars().all()
    
    lore_context = ""
    for item in lore_items:
        lore_context += f"- {item.name} ({item.category}): {item.content}\n"
    
    if not lore_context:
        lore_context = "No specific lore defined yet."

    # 3. Call LLM
    prompt = prompts.CONSISTENCY_CHECK_PROMPT.format(
        title=project.title,
        chapter_title=chapter.title,
        lore_context=lore_context,
        chapter_content=chapter.content or "(Empty Chapter)"
    )

    try:
        response_text = await ai_client.generate_response(
            prompt=prompt,
            temperature=0.3, # Lower temperature for analysis
            response_format={"type": "json_object"}
        )
        
        # Parse JSON
        data = json.loads(response_text)
        issues = data.get("issues", [])
        
        return {"issues": issues}

    except Exception as e:
        print(f"AI Consistency Check Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform consistency check.")


@router.post("/{chapter_id}/fix", response_model=ConsistencyFixResponse)
async def fix_consistency_issue(
    *,
    db: AsyncSession = Depends(deps.get_db),
    chapter_id: int,
    fix_in: ConsistencyFixRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a fixed version of the problematic text using AI.
    """
    # Fetch chapter
    result = await db.execute(
        select(Chapter)
        .join(Project)
        .where(Chapter.id == chapter_id, Project.user_id == current_user.id)
    )
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Extract surrounding context (up to 200 chars before/after the quote)
    chapter_content = chapter.content or ""
    quote_pos = chapter_content.find(fix_in.quote)
    if quote_pos >= 0:
        ctx_start = max(0, quote_pos - 200)
        ctx_end = min(len(chapter_content), quote_pos + len(fix_in.quote) + 200)
        context = chapter_content[ctx_start:ctx_end]
    else:
        context = chapter_content[:500]

    prompt = prompts.CONSISTENCY_FIX_PROMPT.format(
        description=fix_in.description,
        original_text=fix_in.quote,
        suggestion=fix_in.suggestion,
        context=context,
    )

    try:
        fixed_text = await ai_client.generate_response(
            prompt=prompt,
            temperature=0.3,
        )
        fixed_text = fixed_text.strip().strip('"').strip("'")

        return {
            "original_text": fix_in.quote,
            "fixed_text": fixed_text,
        }

    except Exception as e:
        print(f"AI Consistency Fix Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate fix.")

