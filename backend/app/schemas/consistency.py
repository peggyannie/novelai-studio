from typing import List, Optional
from pydantic import BaseModel

class ConsistencyIssue(BaseModel):
    type: str  # character, plot, setting, other
    description: str
    quote: Optional[str] = None
    suggestion: Optional[str] = None

class ConsistencyCheckResponse(BaseModel):
    issues: List[ConsistencyIssue]

class ConsistencyFixRequest(BaseModel):
    quote: str          # The problematic text from the chapter
    description: str    # What the issue is
    suggestion: str     # How to fix it

class ConsistencyFixResponse(BaseModel):
    original_text: str
    fixed_text: str
