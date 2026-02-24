from typing import List
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class ProjectStatus(str, enum.Enum):
    SERIALIZING = "serializing"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, index=True, nullable=False)
    genre = Column(String, nullable=False)
    status = Column(String, default=ProjectStatus.SERIALIZING)
    target_words = Column(Integer, default=100000)
    update_frequency = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="projects")
    volumes = relationship("Volume", back_populates="project", cascade="all, delete-orphan", lazy="selectin")

class Volume(Base):
    __tablename__ = "volumes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    order_no = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="volumes")
    chapters = relationship("Chapter", back_populates="volume", cascade="all, delete-orphan", lazy="selectin")

class ChapterStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    volume_id = Column(Integer, ForeignKey("volumes.id"), nullable=False)
    title = Column(String, nullable=False)
    order_no = Column(Integer, nullable=False)
    status = Column(String, default=ChapterStatus.DRAFT)
    content = Column(Text, nullable=True)
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    volume = relationship("Volume", back_populates="chapters")
    project = relationship("Project", viewonly=True) # Direct access if needed, but volume is parent
