"""Text-to-Speech service using ElevenLabs API."""

import os

import httpx
from fastapi import HTTPException

from app.services.llm_client import get_llm_client

# ElevenLabs TTS configuration
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
DEFAULT_MODEL = "eleven_flash_v2_5"

# Supported language codes for eleven_flash_v2_5
SUPPORTED_LANGUAGES = {"en", "es", "fr", "de", "zh"}

# Language names for translation prompts
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese (Simplified)",
}


async def translate_text(text: str, target_language: str) -> str:
    """
    Translate text to the target language using Gemini.

    Args:
        text: The text to translate.
        target_language: Target language code (es, fr, de, zh).

    Returns:
        Translated text.
    """
    if target_language == "en" or target_language not in LANGUAGE_NAMES:
        return text

    target_name = LANGUAGE_NAMES[target_language]
    llm = get_llm_client()

    prompt = f"""Translate the following text to {target_name}.
Return ONLY the translated text, nothing else. Do not include any explanations or notes.

Text to translate:
{text}"""

    translated = await llm.complete(
        prompt=prompt,
        temperature=0.3,
        max_tokens=500,
    )

    return translated.strip()


async def generate_speech(text: str, language: str = "en") -> bytes:
    """
    Generate MP3 audio from text using ElevenLabs TTS.

    If language is not English, the text is first translated to the target language
    before being converted to speech.

    Args:
        text: The text to convert to speech.
        language: Language code for TTS (en, es, fr, de, zh). Defaults to "en".

    Returns:
        Raw MP3 audio bytes.

    Raises:
        HTTPException: If TTS generation fails.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="TTS service unavailable: ELEVENLABS_API_KEY not configured",
        )

    # Validate and normalize language
    if language not in SUPPORTED_LANGUAGES:
        language = "en"

    # Translate text if not English
    if language != "en":
        text = await translate_text(text, language)

    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID)
    url = f"{ELEVENLABS_TTS_URL}/{voice_id}"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }

    payload = {
        "text": text,
        "model_id": DEFAULT_MODEL,
        "output_format": "mp3_44100_128",
        "language_code": language,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code != 200:
            detail = response.text or response.reason_phrase
            raise HTTPException(
                status_code=502,
                detail=f"ElevenLabs TTS failed ({response.status_code}): {detail}",
            )

        return response.content

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="TTS request timed out",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to ElevenLabs: {str(e)}",
        )
