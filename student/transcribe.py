"""Transcribe audio via ElevenLabs Speech-to-Text API."""

from __future__ import annotations

import os
from pathlib import Path

import requests

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
DEFAULT_MODEL_ID = "scribe_v1"


def transcribe(audio_path: str | Path, *, api_key: str | None = None) -> str:
    """
    Send an audio file to ElevenLabs Speech-to-Text and return the transcript text.
    Raises on missing API key or API errors.
    """
    key = api_key or os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise ValueError(
            "ELEVENLABS_API_KEY is not set. Set it in the environment or pass api_key=."
        )

    path = Path(audio_path)
    if not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {path}")

    with open(path, "rb") as f:
        files = {"file": (path.name, f, "audio/wav")}
        data = {"model_id": DEFAULT_MODEL_ID}
        headers = {"xi-api-key": key}

        response = requests.post(
            ELEVENLABS_STT_URL,
            headers=headers,
            data=data,
            files=files,
            timeout=60,
        )

    if response.status_code != 200:
        msg = response.text or response.reason
        raise RuntimeError(f"ElevenLabs STT failed ({response.status_code}): {msg}")

    body = response.json()
    text = body.get("text")
    if text is None:
        raise RuntimeError("ElevenLabs response missing 'text' field")
    return text.strip()
