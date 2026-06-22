"""Base agent class with OpenAI chat completion."""

import json
from typing import AsyncGenerator

from openai import AsyncOpenAI

from ..config import settings


class BaseAgent:
    """Shared agent scaffolding: OpenAI client + streaming helpers."""

    SYSTEM_PROMPT: str = "You are a helpful assistant."

    def __init__(
        self,
        name: str,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
    ):
        self.name = name
        self.api_key = api_key or settings.openai_api_key
        self.base_url = base_url or settings.openai_base_url
        self.model = model or settings.openai_model
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

    def _build_messages(self, history: list[dict], user_message: str) -> list[dict]:
        return [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            *history,
            {"role": "user", "content": user_message},
        ]

    async def chat(self, history: list[dict], user_message: str) -> str:
        """Non-streaming chat. Returns full reply."""
        messages = self._build_messages(history, user_message)
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""

    async def chat_stream(
        self, history: list[dict], user_message: str
    ) -> AsyncGenerator[str, None]:
        """Streaming chat. Yields content deltas."""
        messages = self._build_messages(history, user_message)
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content
