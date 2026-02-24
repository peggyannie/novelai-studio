from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.responses import StreamingResponse
import asyncio
import uuid
import json
from app.api import deps
from app.models.project import Project
from app.models.lore import LoreItem, LoreCategory
from app.schemas.project import ProjectCreate
from app.schemas.bible import BibleGenerateRequest, BibleGenerateResponse
from app.core.ai_client import ai_client
from app.core.prompts import SYSTEM_WRITING_ASSISTANT, BIBLE_INPUTS_GENERATION_PROMPT

router = APIRouter()

class BibleInputsGenerateRequest(ProjectCreate):
    description: str = ""

# In-memory task tracker: { task_id: {"progress": int, "message": str, "completed": bool, "error": str} }
# In a real distributed system, we would use Redis for this.
generation_tasks = {}

async def generate_bible_background(task_id: str, project_id: int, request: BibleGenerateRequest, db: AsyncSession):
    generation_tasks[task_id] = {"progress": 0, "message": "Starting generation...", "completed": False}
    try:
        # Phase 1: Characters
        generation_tasks[task_id] = {"progress": 10, "message": "正在构思核心角色羁绊...", "completed": False}
        prompt_char = f"请为设定下的仙侠小说推演3个核心角色（包含主角与重要配角/反派）。\n主角设定：{request.protagonist}\n要求输出纯JSON格式列表，形如: {{\"characters\": [{{\"name\": \"\", \"description\": \"\", \"content\": \"\"}}]}}。注意：必须以完整的简体中文输出最终 JSON。不允许出现英文属性值！"
        char_res = await ai_client.generate_response(prompt_char, response_format={"type": "json_object"})
        
        # Save to DB
        char_data = json.loads(char_res).get("characters", [])
        for c in char_data:
            db.add(LoreItem(project_id=project_id, category=LoreCategory.CHARACTER, name=c["name"], description=c["description"], content=c.get("content", ""), tags=[{"AI_Generated": True}]))
        await db.commit()
        
        # Phase 2: Power System / Realms
        generation_tasks[task_id] = {"progress": 40, "message": "正在裂变力量体系与境界法则...", "completed": False}
        prompt_realms = f"请根据力量体系设定：{request.power_system}，推演并衍生5个大境界等级详细说明与突破条件。\n要求输出纯JSON格式列表，形如: {{\"realms\": [{{\"name\": \"\", \"description\": \"\", \"content\": \"\"}}]}}。注意：必须以完整的简体中文输出最终 JSON。不允许出现英文属性值！"
        realm_res = await ai_client.generate_response(prompt_realms, response_format={"type": "json_object"})
        
        realm_data = json.loads(realm_res).get("realms", [])
        for r in realm_data:
            db.add(LoreItem(project_id=project_id, category=LoreCategory.REALM, name=r["name"], description=r["description"], content=r.get("content", ""), tags=[{"AI_Generated": True}]))
        await db.commit()
        
        # Phase 3: Cheat/Items Techniques
        generation_tasks[task_id] = {"progress": 80, "message": "正在锻造至宝与伴生神功...", "completed": False}
        prompt_cheat = f"请根据金手指设定：{request.cheat}，推演并衍生出3个核心功法或气运法宝。\n要求输出纯JSON格式列表，形如: {{\"items\": [{{\"name\": \"\", \"description\": \"\", \"content\": \"\"}}]}}。注意：必须以完整的简体中文输出最终 JSON。不允许出现英文属性值！"
        cheat_res = await ai_client.generate_response(prompt_cheat, response_format={"type": "json_object"})
        
        item_data = json.loads(cheat_res).get("items", [])
        for i in item_data:
            db.add(LoreItem(project_id=project_id, category=LoreCategory.ITEM, name=i["name"], description=i["description"], content=i.get("content", ""), tags=[{"AI_Generated": True}]))
        await db.commit()

        generation_tasks[task_id] = {"progress": 100, "message": "创世圣经推演完毕！", "completed": True}
    except Exception as e:
        await db.rollback()
        generation_tasks[task_id] = {"progress": 0, "message": f"Validation Error", "error": str(e), "completed": True}

@router.post("/generate-bible-inputs", response_model=BibleGenerateRequest)
async def generate_bible_inputs(
    request: BibleInputsGenerateRequest,
    current_user = Depends(deps.get_current_user)
):
    """
    Auto-generates protagonist, cheat, and power system based on basic project info.
    """
    prompt = BIBLE_INPUTS_GENERATION_PROMPT.format(
        title=request.title,
        genre=request.genre,
        target_words=request.target_words,
        description=request.description or "无特别简介"
    )

    ai_response = await ai_client.generate_response(
        prompt=prompt,
        system_role=SYSTEM_WRITING_ASSISTANT,
        response_format={"type": "json_object"}
    )

    if not ai_response:
        raise HTTPException(status_code=500, detail="AI generation failed")

    try:
        content = json.loads(ai_response)
        return BibleGenerateRequest(
            protagonist=content.get("protagonist", ""),
            cheat=content.get("cheat", ""),
            power_system=content.get("power_system", "")
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON")

@router.post("/{project_id}/generate-bible", response_model=BibleGenerateResponse)
async def start_bible_generation(
    project_id: int,
    request: BibleGenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    task_id = str(uuid.uuid4())
    # Fire and forget
    background_tasks.add_task(generate_bible_background, task_id, project.id, request, db)
    
    return BibleGenerateResponse(task_id=task_id, message="Bible generation started")

@router.get("/{project_id}/generate-bible/status")
async def get_bible_generation_status(project_id: int, task_id: str):
    """
    SSE stream endpoint for checking background generation progress.
    """
    async def event_generator():
        while True:
            task_info = generation_tasks.get(task_id)
            if not task_info:
                yield f"data: {json.dumps({'progress': 0, 'error': 'Task not found'})}\n\n"
                break
                
            yield f"data: {json.dumps(task_info)}\n\n"
            
            if task_info.get("completed") or task_info.get("error"):
                break
            # Poll interval
            await asyncio.sleep(1)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
