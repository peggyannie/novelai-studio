from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.models.project import Project, Volume, Chapter
from app.models.outline import Outline
from app.models.lore import LoreItem
from app.schemas import outline as outline_schemas
from app.core.ai_client import ai_client
from app.core.prompts import OUTLINE_GENERATION_PROMPT, SYSTEM_WRITING_ASSISTANT
import json

router = APIRouter()

@router.post("/generate", response_model=outline_schemas.Outline)
async def generate_outline(
    request: outline_schemas.OutlineGenerateRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Generate an outline for a project using AI.
    """
    # 1. Fetch Project
    result = await db.execute(select(Project).where(Project.id == request.project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. Check if outline exists (optional: overwrite or error)
    # For now, we allow overwriting or creating new
    result = await db.execute(select(Outline).where(Outline.project_id == project.id))
    existing_outline = result.scalars().first()

    # 3. Fetch LoreItems for context
    result = await db.execute(select(LoreItem).where(LoreItem.project_id == project.id))
    lore_items = result.scalars().all()
    lore_context = ""
    if lore_items:
        lore_texts = [f"- {item.category}: {item.name}: {item.description}" for item in lore_items]
        lore_context = "\n".join(lore_texts)
    else:
        lore_context = "暂无设定库信息。"

    # 4. Prepare Prompt
    instruction = request.prompt if request.prompt else "无特殊指令，请根据作品类型自由发挥。"
    
    volumes_data = []
    previous_context = "这是小说的开局部分，当前没有前文大纲。"
    
    # Generate 3 volumes sequentially using Sliding Window Chunking
    for vol_no in range(1, 4):
        prompt = OUTLINE_GENERATION_PROMPT.format(
            title=project.title,
            genre=project.genre,
            target_words=project.target_words,
            description=project.description or "无特别简介",
            lore_context=lore_context,
            previous_context=previous_context,
            target_volume_no=vol_no,
            instruction=instruction
        )

        ai_response = await ai_client.generate_response(
            prompt=prompt,
            system_role=SYSTEM_WRITING_ASSISTANT,
            response_format={"type": "json_object"}
        )

        if not ai_response:
            raise HTTPException(status_code=500, detail=f"AI generation failed at volume {vol_no}")

        try:
            vol_content = json.loads(ai_response)
            vol_node = vol_content.get("volume")
            if not vol_node: # Fallback just in case
                vol_node = vol_content.get("volumes", [{}])[0]
            if vol_node:
                volumes_data.append(vol_node)
                # Compress into previous context for the next chunk
                previous_context += f"\n第{vol_no}卷: {vol_node.get('title', '无题')} (共{len(vol_node.get('chapters', []))}章)"
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail=f"AI returned invalid JSON at volume {vol_no}")

    content = {"volumes": volumes_data}
    # 5. Save/Update Outline
    if existing_outline:
        existing_outline.content = content
        existing_outline.status = "generated"
        db.add(existing_outline)
        await db.commit()
        await db.refresh(existing_outline)
        return existing_outline
    else:
        new_outline = Outline(
            project_id=project.id,
            title=f"{project.title} 大纲",
            content=content,
            status="generated"
        )
        db.add(new_outline)
        await db.commit()
        await db.refresh(new_outline)
        return new_outline

@router.get("/{project_id}", response_model=outline_schemas.Outline)
async def get_outline(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Get the outline for a specific project.
    """
    # Verify project ownership first
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(select(Outline).where(Outline.project_id == project_id))
    outline = result.scalars().first()
    if not outline:
        raise HTTPException(status_code=404, detail="Outline not found")
    return outline

@router.put("/{project_id}", response_model=outline_schemas.Outline)
async def update_outline(
    project_id: int,
    request: outline_schemas.OutlineUpdateRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Update the outline content for a specific project.
    """
    # Verify project ownership
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(select(Outline).where(Outline.project_id == project_id))
    outline = result.scalars().first()
    if not outline:
        raise HTTPException(status_code=404, detail="Outline not found")

    if outline.version != request.version:
        raise HTTPException(
            status_code=409, 
            detail="大纲内容已被其他终端修改（版本过时），请刷新以防出现内容覆盖！(Outline has been modified elsewhere, version mismatch.)"
        )

    outline.content = request.content
    outline.version += 1
    db.add(outline)
    await db.commit()
    await db.refresh(outline)
    return outline

@router.post("/{project_id}/apply")
async def apply_outline(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Apply the outline to the project structure (create volumes and chapters).
    """
    # Verify project ownership
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(select(Outline).where(Outline.project_id == project_id))
    outline = result.scalars().first()
    if not outline:
        raise HTTPException(status_code=404, detail="Outline not found")

    content = outline.content
    if not content or "volumes" not in content:
        raise HTTPException(status_code=400, detail="Invalid outline content")

    try:
        # Fetch existing volumes to avoid duplication (simple check by order_no)
        # Note: A more robust approach would be ensuring uniqueness by title or keeping track of sync status
        # For this MVP, we will simpler check: if volume with order_no exists, skip creation but check chapters.
        
        # Get all existing volumes
        vol_result = await db.execute(select(Volume).where(Volume.project_id == project_id))
        existing_volumes = {v.order_no: v for v in vol_result.scalars().all()}

        volumes_data = content.get("volumes", [])
        
        for vol_data in volumes_data:
            vol_order = vol_data.get("order_no")
            raw_title = vol_data.get("title")
            vol_title = raw_title if raw_title and str(raw_title).strip() else f"卷 {vol_order}"
            
            if vol_order in existing_volumes:
                volume = existing_volumes[vol_order]
                # Optional: update title? Let's skip updating title to preserve user edits
            else:
                volume = Volume(
                    project_id=project_id,
                    title=vol_title,
                    order_no=vol_order
                )
                db.add(volume)
                await db.flush() # flush to get ID
                existing_volumes[vol_order] = volume # Add to local cache

            # Process Chapters
            chapters_data = vol_data.get("chapters", [])
            
            # Get existing chapters for this volume
            chap_result = await db.execute(select(Chapter).where(Chapter.volume_id == volume.id))
            existing_chapters = {c.order_no: c for c in chap_result.scalars().all()}

            for chap_data in chapters_data:
                chap_order = chap_data.get("order_no")
                chap_title = chap_data.get("title", f"第 {chap_order} 章")
                chap_summary = chap_data.get("summary", "")

                if chap_order not in existing_chapters:
                    new_chapter = Chapter(
                        project_id=project_id,
                        volume_id=volume.id,
                        title=chap_title,
                        order_no=chap_order,
                        content=f"大纲简介：{chap_summary}\n\n" # Pre-fill with summary
                    )
                    db.add(new_chapter)
        
        await db.commit()
        return {"message": "Outline applied successfully"}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to apply outline: {str(e)}")
