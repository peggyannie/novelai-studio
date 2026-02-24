from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.user import User
from app.models.project import Project
from app.models.lore import LoreItem
from app.schemas.lore import LoreItem as LoreItemSchema, LoreItemCreate, LoreItemUpdate, LoreGenerateRequest
from app.core.ai_client import ai_client
from app.core.prompts import LORE_GENERATION_PROMPT, SYSTEM_WRITING_ASSISTANT
import json

router = APIRouter()

@router.post("/projects/{project_id}/lore/generate", response_model=LoreItemSchema)
async def generate_lore_item(
    *,
    db: AsyncSession = Depends(deps.get_db),
    project_id: int,
    request: LoreGenerateRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a lore item using AI.
    """
    # Verify project ownership
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = project_result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Prepare Prompt
    prompt = LORE_GENERATION_PROMPT.format(
        title=project.title,
        genre=project.genre,
        category=request.category,
        instruction=request.prompt
    )

    # Call AI
    ai_response = await ai_client.generate_response(
        prompt=prompt,
        system_role=SYSTEM_WRITING_ASSISTANT,
        response_format={"type": "json_object"}
    )

    if not ai_response:
        raise HTTPException(status_code=500, detail="AI generation failed")

    try:
        content = json.loads(ai_response)
        # Ensure minimal fields present
        if "name" not in content:
            raise ValueError("AI response missing name")
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=500, detail="AI returned invalid data")

    # Create Lore Item
    lore_item = LoreItem(
        project_id=project_id,
        category=request.category,
        name=content.get("name", "Unknown"),
        description=content.get("description", ""),
        content=content.get("content", ""),
        attributes=content.get("attributes", {})
    )
    
    db.add(lore_item)
    await db.commit()
    await db.refresh(lore_item)
    return lore_item

@router.get("/projects/{project_id}/lore", response_model=List[LoreItemSchema])
async def read_lore_items(
    project_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    category: Optional[str] = None,
) -> Any:
    """
    Retrieve lore items for a project.
    """
    # Verify project ownership
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not project_result.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(LoreItem).where(LoreItem.project_id == project_id)
    if category:
        query = query.where(LoreItem.category == category)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/projects/{project_id}/lore", response_model=LoreItemSchema, status_code=201)
async def create_lore_item(
    *,
    db: AsyncSession = Depends(deps.get_db),
    project_id: int,
    lore_in: LoreItemCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new lore item.
    """
    # Verify project ownership
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    if not project_result.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

    lore_item = LoreItem(
        **lore_in.model_dump(),
        project_id=project_id
    )
    db.add(lore_item)
    await db.commit()
    await db.refresh(lore_item)
    return lore_item

@router.get("/lore/{id}", response_model=LoreItemSchema)
async def read_lore_item(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get lore item by ID.
    """
    result = await db.execute(
        select(LoreItem)
        .join(Project)
        .where(LoreItem.id == id, Project.user_id == current_user.id)
    )
    lore_item = result.scalars().first()
    if not lore_item:
        raise HTTPException(status_code=404, detail="Lore item not found")
    return lore_item

@router.put("/lore/{id}", response_model=LoreItemSchema)
async def update_lore_item(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    lore_in: LoreItemUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update lore item.
    """
    result = await db.execute(
        select(LoreItem)
        .join(Project)
        .where(LoreItem.id == id, Project.user_id == current_user.id)
    )
    lore_item = result.scalars().first()
    if not lore_item:
        raise HTTPException(status_code=404, detail="Lore item not found")
    
    update_data = lore_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lore_item, field, value)
    
    db.add(lore_item)
    await db.commit()
    await db.refresh(lore_item)
    return lore_item

@router.delete("/lore/{id}", response_model=LoreItemSchema)
async def delete_lore_item(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete lore item.
    """
    result = await db.execute(
        select(LoreItem)
        .join(Project)
        .where(LoreItem.id == id, Project.user_id == current_user.id)
    )
    lore_item = result.scalars().first()
    if not lore_item:
        raise HTTPException(status_code=404, detail="Lore item not found")
    
    await db.delete(lore_item)
    await db.commit()
    return lore_item
