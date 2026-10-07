"""
FinSight AI -- LLM access (Groq)
================================
Single place that talks to Groq. Every caller gets the same lazily-created
async client, the same model choice, and a clear `LLMUnavailable` error to
fall back on.
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator

from groq import AsyncGroq

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncGroq | None = None


USAGE = {"calls": 0, "prompt_tokens": 0, "completion_tokens": 0}


def _log_usage(model: str, kind: str, result) -> None:
    """Token accounting for cost monitoring (logged, and summed per process)."""
    usage = getattr(result, "usage", None)
    if not usage:
        return
    USAGE["calls"] += 1
    USAGE["prompt_tokens"] += usage.prompt_tokens or 0
    USAGE["completion_tokens"] += usage.completion_tokens or 0
    logger.info("llm %s model=%s prompt=%s completion=%s", kind, model, usage.prompt_tokens, usage.completion_tokens)


class LLMUnavailable(RuntimeError):
    """Raised when no API key is configured or the provider call fails."""


def get_client() -> AsyncGroq | None:
    """Return the shared client, picking up a key added to the env after startup."""
    global _client
    if _client is None:
        api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
        if api_key:
            _client = AsyncGroq(api_key=api_key)
    return _client


def is_configured() -> bool:
    return get_client() is not None


def _model_kwargs(model: str) -> dict:
    """gpt-oss models reason before answering; keep that short so replies stay fast."""
    return {"reasoning_effort": "low"} if model.startswith("openai/gpt-oss") else {}


async def complete(messages: list[dict], *, temperature: float = 0.3, max_tokens: int = 1200) -> str:
    client = get_client()
    if client is None:
        raise LLMUnavailable("GROQ_API_KEY is not configured")
    last_error: Exception | None = None
    for model in (settings.GROQ_CHAT_MODEL, settings.GROQ_FAST_MODEL):
        try:
            result = await client.chat.completions.create(
                messages=messages, model=model, temperature=temperature, max_tokens=max_tokens,
                **_model_kwargs(model),
            )
            _log_usage(model, "complete", result)
            text = (result.choices[0].message.content or "").strip()
            if text:
                return text
        except Exception as exc:  # provider errors, rate limits, decommissioned models
            last_error = exc
            logger.warning("Groq completion failed on %s: %s", model, exc)
    raise LLMUnavailable(str(last_error or "empty response"))


async def stream(messages: list[dict], *, temperature: float = 0.3, max_tokens: int = 1400) -> AsyncIterator[str]:
    """Yield text deltas. Raises LLMUnavailable before the first token if the call can't start."""
    client = get_client()
    if client is None:
        raise LLMUnavailable("GROQ_API_KEY is not configured")
    response = None
    for model in (settings.GROQ_CHAT_MODEL, settings.GROQ_FAST_MODEL):
        try:
            response = await client.chat.completions.create(
                messages=messages, model=model, temperature=temperature, max_tokens=max_tokens, stream=True,
                **_model_kwargs(model),
            )
            break
        except Exception as exc:
            logger.warning("Groq stream failed to start on %s: %s", model, exc)
    if response is None:
        raise LLMUnavailable("Could not start a completion stream")
    async for chunk in response:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta


# ── Structured output, vision, speech and tool calling ─────────────────────

async def complete_json(messages: list[dict], *, max_tokens: int = 1500) -> dict:
    """JSON-mode completion parsed into a dict. Raises LLMUnavailable on any failure."""
    import json

    client = get_client()
    if client is None:
        raise LLMUnavailable("GROQ_API_KEY is not configured")
    last_error: Exception | None = None
    for model in (settings.GROQ_FAST_MODEL, settings.GROQ_CHAT_MODEL):
        try:
            result = await client.chat.completions.create(
                messages=messages, model=model, temperature=0, max_tokens=max_tokens,
                response_format={"type": "json_object"}, **_model_kwargs(model),
            )
            _log_usage(model, "json", result)
            return json.loads(result.choices[0].message.content or "{}")
        except Exception as exc:
            last_error = exc
            logger.warning("Groq JSON completion failed on %s: %s", model, exc)
    raise LLMUnavailable(str(last_error))


async def vision_json(prompt: str, image_b64: str, mime: str = "image/jpeg", *, max_tokens: int = 1200) -> dict:
    """Ask the vision model about an image and parse its JSON reply."""
    import json
    import re

    client = get_client()
    if client is None or not settings.GROQ_VISION_MODEL:
        raise LLMUnavailable("No vision model configured")
    try:
        result = await client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL, temperature=0, max_tokens=max_tokens,
            messages=[{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
            ]}],
        )
        text = result.choices[0].message.content or ""
        match = re.search(r"\{.*\}", text, re.S)  # vision models may wrap JSON in prose or fences
        return json.loads(match.group(0) if match else text)
    except Exception as exc:
        logger.warning("Vision request failed: %s", exc)
        raise LLMUnavailable(str(exc)) from exc


async def transcribe(audio: bytes, filename: str, language: str | None = None) -> str:
    client = get_client()
    if client is None:
        raise LLMUnavailable("GROQ_API_KEY is not configured")
    try:
        kwargs = {"language": language} if language else {}
        result = await client.audio.transcriptions.create(
            file=(filename, audio), model=settings.GROQ_SPEECH_MODEL, temperature=0, **kwargs,
        )
        return (result.text or "").strip()
    except Exception as exc:
        logger.warning("Transcription failed: %s", exc)
        raise LLMUnavailable(str(exc)) from exc


async def stream_with_tools(messages: list[dict], tools: list[dict], *, max_tokens: int = 1600):
    """
    One streaming round. Yields ("token", text) for answer text as it arrives and,
    at the end, ("tool_calls", [{id, name, arguments}]) if the model asked for tools.
    """
    client = get_client()
    if client is None:
        raise LLMUnavailable("GROQ_API_KEY is not configured")
    response = None
    for model in (settings.GROQ_CHAT_MODEL, settings.GROQ_FAST_MODEL):
        try:
            response = await client.chat.completions.create(
                messages=messages, model=model, temperature=0.3, max_tokens=max_tokens, stream=True,
                tools=tools, tool_choice="auto", **_model_kwargs(model),
            )
            break
        except Exception as exc:
            logger.warning("Groq tool stream failed to start on %s: %s", model, exc)
    if response is None:
        raise LLMUnavailable("Could not start a completion stream")

    calls: dict[int, dict] = {}
    async for chunk in response:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        if delta.content:
            yield ("token", delta.content)
        for tc in delta.tool_calls or []:
            slot = calls.setdefault(tc.index, {"id": None, "name": "", "arguments": ""})
            if tc.id:
                slot["id"] = tc.id
            if tc.function and tc.function.name:
                slot["name"] += tc.function.name
            if tc.function and tc.function.arguments:
                slot["arguments"] += tc.function.arguments
    if calls:
        yield ("tool_calls", [
            {"id": c["id"] or f"call_{i}", "name": c["name"], "arguments": c["arguments"] or "{}"}
            for i, c in sorted(calls.items())
        ])
