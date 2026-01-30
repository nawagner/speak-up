import json
import httpx
from typing import Optional

from app.config import get_settings


class LLMClient:
    """Client for interacting with OpenRouter/Gemini API."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.openrouter_base_url
        self.api_key = settings.openrouter_api_key
        self.model = settings.llm_model

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """
        Send a completion request to the LLM.

        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt for context
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response

        Returns:
            The LLM's response text
        """
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://speak-up.app",
                    "X-Title": "Speak-Up Oral Exam",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

        return data["choices"][0]["message"]["content"]

    async def complete_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> dict:
        """
        Send a completion request expecting JSON response.

        Args:
            prompt: The user prompt (should request JSON output)
            system_prompt: Optional system prompt for context
            temperature: Lower temperature for more deterministic JSON
            max_tokens: Maximum tokens in response

        Returns:
            Parsed JSON dict from the response
        """
        response_text = await self.complete(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # Try to extract JSON from the response
        # Handle cases where response might have markdown code blocks
        text = response_text.strip()

        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]

        if text.endswith("```"):
            text = text[:-3]

        return json.loads(text.strip())


# Singleton instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get the LLM client singleton."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client
