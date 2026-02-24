import asyncio
import os
from dotenv import load_dotenv

# Load env before importing settings
load_dotenv()

from app.core.ai_client import AIClient
from app.core.config import settings

async def test_ai():
    print(f"Testing AI Client connecting to: {settings.AI_BASE_URL}")
    print(f"Model: {settings.AI_MODEL_NAME}")
    
    # Initialize client manually if needed or rely on singleton
    client = AIClient()
    
    if not client.client:
        print("ERROR: Client not initialized. Check API Key.")
        return

    prompt = "Hello! Please reply with 'AI is working!' if you receive this."
    print(f"\nSending prompt: {prompt}")
    
    response = await client.generate_response(prompt)
    
    print(f"\nResponse:\n{response}")

if __name__ == "__main__":
    asyncio.run(test_ai())
