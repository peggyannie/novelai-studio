from openai import AsyncOpenAI
from app.core.config import settings
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class AIClient:
    _instance = None
    client: Optional[AsyncOpenAI] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the OpenAI client with settings."""
        if settings.AI_API_KEY:
            self.client = AsyncOpenAI(
                api_key=settings.AI_API_KEY,
                base_url=settings.AI_BASE_URL,
                timeout=settings.AI_TIMEOUT
            )
            logger.info(f"AI Client initialized with base_url: {settings.AI_BASE_URL} and model: {settings.AI_MODEL_NAME}")
        else:
            logger.warning("AI_API_KEY not set. AI features will be disabled.")

    async def generate_response(
        self, 
        prompt: str, 
        system_role: str = "You are a helpful creative writing assistant.",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Generate a response from the LLM.
        
        Args:
            prompt: The user prompt.
            system_role: The system instruction.
            temperature: Creativity control.
            max_tokens: Max tokens to generate.
            response_format: Optional JSON schema for structured output (if supported by provider).
        
        Returns:
            The generated text content or None if failed.
        """
        if not self.client:
            logger.error("AI Client not initialized.")
            return None

        try:
            kwargs = {
                "model": settings.AI_MODEL_NAME,
                "messages": [
                    {"role": "system", "content": system_role},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            
            # Add response_format if provided (OpenAI specific, but some others might support)
            if response_format:
                kwargs["response_format"] = response_format

            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return None

    async def generate_stream(
        self, 
        prompt: str, 
        system_role: str = "You are a helpful creative writing assistant.",
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        """
        Generate a streaming response from the LLM.
        """
        if not self.client:
            logger.error("AI Client not initialized.")
            yield "AI Client not initialized."
            return

        try:
            kwargs = {
                "model": settings.AI_MODEL_NAME,
                "messages": [
                    {"role": "system", "content": system_role},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True
            }
            
            stream = await self.client.chat.completions.create(**kwargs)
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"Error generating AI stream: {str(e)}")
            yield f"Error: {str(e)}"

# Global instance
ai_client = AIClient()
