from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class OutlineBase(BaseModel):
    title: str
    content: Dict[str, Any] = {}
    status: Optional[str] = "generated"

class OutlineCreate(BaseModel):
    project_id: int
    title: Optional[str] = None # Defaults to Project Title + " Outline"

class OutlineGenerateRequest(BaseModel):
    project_id: int
    prompt: Optional[str] = None

class OutlineUpdateRequest(BaseModel):
    content: Dict[str, Any]

class OutlineUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class Outline(OutlineBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
