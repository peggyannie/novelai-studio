from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base

class ChapterSnapshot(Base):
    __tablename__ = "chapter_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=True)
    word_count = Column(Integer, default=0)
    
    # "auto" or "manual" distinction
    snapshot_type = Column(String, default="manual", nullable=False, index=True)
    
    label = Column(String, nullable=True)  # Optional user note, e.g. "Before AI rewrite"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    chapter = relationship("Chapter", backref="snapshots")
