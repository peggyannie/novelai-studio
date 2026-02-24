from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api import deps
from app.db.session import get_db
from app.models.project import Project, Chapter
from app.schemas import writing as writing_schemas
from app.core.ai_client import ai_client
from app.core.prompts import CONTINUE_WRITING_PROMPT, REWRITE_PROMPT, SYSTEM_WRITING_ASSISTANT

router = APIRouter()

@router.post("/continue")
async def continue_writing(
    request: writing_schemas.WritingContinueRequest,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Continue writing the story based on context (Streaming).
    """
    # 1. Fetch Project and Chapter
    result = await db.execute(select(Project).where(Project.id == request.project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(select(Chapter).where(Chapter.id == request.chapter_id))
    chapter = result.scalars().first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # 2. Prepare Prompt
    context_text = request.context
    if not context_text and chapter.content:
        context_text = chapter.content[-2000:]

    prompt = CONTINUE_WRITING_PROMPT.format(
        title=project.title,
        genre=project.genre,
        chapter_title=chapter.title,
        context=context_text,
        instruction=request.instruction or "Advance the plot."
    )

    # 3. Stream Response
    return StreamingResponse(
        ai_client.generate_stream(
            prompt=prompt,
            system_role=SYSTEM_WRITING_ASSISTANT,
            temperature=0.8
        ),
        media_type="text/event-stream"
    )

@router.post("/rewrite", response_model=writing_schemas.WritingResponse)
async def rewrite_text(
    request: writing_schemas.WritingRewriteRequest,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Rewrite a specific section of text.
    """
    # Verify project ownership
    result = await db.execute(select(Project).where(Project.id == request.project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    prompt = REWRITE_PROMPT.format(
        instruction=request.instruction,
        text=request.text
    )

    content = await ai_client.generate_response(
        prompt=prompt,
        system_role=SYSTEM_WRITING_ASSISTANT,
        temperature=0.7
    )

    if not content:
        raise HTTPException(status_code=500, detail="AI generation failed")

    return writing_schemas.WritingResponse(content=content)
