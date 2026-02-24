from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base

class Outline(Base):
    __tablename__ = "outlines"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), unique=True, nullable=False)
    title = Column(String, nullable=False)
    
    # Store the entire outline structure (volumes, chapters, summaries) as JSON
    # Structure: { 
    #   "volumes": [ 
    #     { "title": "Vol 1", "chapters": [ { "title": "Ch 1", "summary": "..." } ] } 
    #   ] 
    # }
    content = Column(JSONB, nullable=False, server_default='{}')
    
    status = Column(String, default="generated") # generated, approved
    
    # Version for optimistic locking against concurrent edits
    version = Column(Integer, default=1, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", backref="outline")
