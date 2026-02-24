from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.user import User
from app.models.project import Project, Volume
from app.schemas.project import Volume as VolumeSchema, VolumeCreate, VolumeUpdate

router = APIRouter()

@router.post("/projects/{project_id}/volumes", response_model=VolumeSchema, status_code=201)
async def create_volume(
    *,
    db: AsyncSession = Depends(deps.get_db),
    project_id: int,
    volume_in: VolumeCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new volume for a project.
    """
    # Verify project exists and belongs to user
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    volume = Volume(
        **volume_in.dict(),
        project_id=project_id
    )
    db.add(volume)
    await db.commit()
    await db.refresh(volume)
    return volume

@router.put("/volumes/{id}", response_model=VolumeSchema)
async def update_volume(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    volume_in: VolumeUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update volume.
    """
    # Need to join project to verify user ownership
    result = await db.execute(
        select(Volume)
        .join(Project)
        .where(Volume.id == id, Project.user_id == current_user.id)
    )
    volume = result.scalars().first()
    if not volume:
        raise HTTPException(status_code=404, detail="Volume not found")
    
    update_data = volume_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(volume, field, value)
    
    db.add(volume)
    await db.commit()
    await db.refresh(volume)
    return volume

@router.delete("/volumes/{id}", response_model=VolumeSchema)
async def delete_volume(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete volume.
    """
    result = await db.execute(
        select(Volume)
        .join(Project)
        .where(Volume.id == id, Project.user_id == current_user.id)
    )
    volume = result.scalars().first()
    if not volume:
        raise HTTPException(status_code=404, detail="Volume not found")
    
    await db.delete(volume)
    await db.commit()
    return volume
