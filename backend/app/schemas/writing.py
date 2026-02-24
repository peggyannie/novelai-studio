from pydantic import BaseModel
from typing import Optional

class WritingContinueRequest(BaseModel):
    project_id: int
    chapter_id: int
    context: str # The text preceding the cursor
    instruction: Optional[str] = None

class WritingRewriteRequest(BaseModel):
    project_id: int
    text: str
    instruction: str

class WritingResponse(BaseModel):
    content: str
