from pydantic import BaseModel, Field

class BibleGenerateRequest(BaseModel):
    protagonist: str = Field(..., description="主角设定", example="林动，一个平凡少年")
    cheat: str = Field(..., description="金手指/系统", example="祖石，能提纯丹药")
    power_system: str = Field(..., description="力量/升级体系", example="淬体、地元、天元、元丹...")
    
class BibleGenerateResponse(BaseModel):
    task_id: str = Field(..., description="异步任务的ID，用于轮询状态")
    message: str = Field("Bible generation started")
