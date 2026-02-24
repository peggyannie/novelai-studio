from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, constr

# Chapter Schemas
class ChapterBase(BaseModel):
    title: str
    order_no: int
    status: Optional[str] = "draft"
    content: Optional[str] = ""

class ChapterCreate(ChapterBase):
    pass

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    order_no: Optional[int] = None
    status: Optional[str] = None
    content: Optional[str] = None

class Chapter(ChapterBase):
    id: int
    project_id: int
    volume_id: int
    word_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Volume Schemas
class VolumeBase(BaseModel):
    title: str
    order_no: int

class VolumeCreate(VolumeBase):
    pass

class VolumeUpdate(BaseModel):
    title: Optional[str] = None
    order_no: Optional[int] = None

class Volume(VolumeBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    chapters: List[Chapter] = []

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    title: str
    genre: str
    target_words: Optional[int] = 100000
    update_frequency: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    status: Optional[str] = None
    target_words: Optional[int] = None
    update_frequency: Optional[str] = None

class Project(ProjectBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    volumes: List[Volume] = []

    class Config:
        from_attributes = True
