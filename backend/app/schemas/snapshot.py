from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class SnapshotCreate(BaseModel):
    label: Optional[str] = None

class Snapshot(BaseModel):
    id: int
    chapter_id: int
    content: Optional[str] = None
    word_count: int
    label: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SnapshotList(BaseModel):
    id: int
    chapter_id: int
    word_count: int
    label: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
