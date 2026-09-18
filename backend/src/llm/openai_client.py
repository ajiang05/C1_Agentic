"""
OpenAI one-shot helper.

Architecture rule (locked):
  Each pipeline stage makes exactly ONE OpenAI completion.
  Assemble that stage's context pack + prompt → call once → parse structured output.
  Do NOT chain LLM calls, tool loops, or re-prompts inside a stage.

Agent owners (Persons 4–6) call `complete_json` from their agent.py modules.
When OPENAI_API_KEY is missing, callers should use their demo stub fallbacks.
"""

from __future__ import annotations

import json
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from src.config import get_settings

T = TypeVar("T", bound=BaseModel)


def is_openai_available() -> bool:
    return get_settings().openai_enabled


def complete_json(
    *,
    system: str,
    user: str,
    schema_hint: str | None = None,
) -> dict[str, Any]:
    """
    Single OpenAI chat completion that must return JSON.

    Parameters
    ----------
    system:
        Stage role + output contract (one prompt, no follow-ups).
    user:
        Assembled context pack for this stage only (materials, concept, answer, etc.).
    schema_hint:
        Optional JSON shape reminder appended to the system message.
    """
    settings = get_settings()
    if not settings.openai_enabled:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Agent stubs should fall back to demo data."
        )

    system_full = system
    if schema_hint:
        system_full = f"{system}\n\nReturn ONLY valid JSON matching:\n{schema_hint}"

    client = OpenAI(api_key=settings.openai_api_key)
    # ONE call per stage — do not add retries that re-invoke the model for "better" answers.
    response = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_full},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )
    content = response.choices[0].message.content or "{}"
    return json.loads(content)


def complete_model(
    *,
    system: str,
    user: str,
    model_type: type[T],
    schema_hint: str | None = None,
) -> T:
    """One-shot completion parsed into a Pydantic model."""
    hint = schema_hint or model_type.model_json_schema()
    raw = complete_json(system=system, user=user, schema_hint=str(hint))
    return model_type.model_validate(raw)
