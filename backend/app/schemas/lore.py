from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class LoreItemBase(BaseModel):
    category: str
    name: str = Field(min_length=1)
    description: Optional[str] = None
    content: Optional[str] = None
    first_appearance_chapter_id: Optional[int] = None
    attributes: Optional[Dict[str, Any]] = {}

class LoreItemCreate(LoreItemBase):
    pass

class LoreGenerateRequest(BaseModel):
    category: str
    prompt: str

class LoreItemUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    first_appearance_chapter_id: Optional[int] = None
    attributes: Optional[Dict[str, Any]] = None

class LoreItem(LoreItemBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
