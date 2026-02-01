"""Voice preference service for managing teacher voice selections."""

import os
import logging
from datetime import datetime
from typing import Optional

import httpx
from uuid_extensions import uuid7

from app.database import get_db

logger = logging.getLogger(__name__)

# Default voice (Rachel) used as fallback
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"

# Supported languages
SUPPORTED_LANGUAGES = ["en", "es", "fr", "de", "zh"]

# Cache for voice list (refreshed on app restart)
_voice_cache: Optional[list[dict]] = None


async def fetch_elevenlabs_voices() -> list[dict]:
    """Fetch available voices from ElevenLabs API."""
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        logger.warning("ELEVENLABS_API_KEY not configured, returning empty voice list")
        return []

    url = "https://api.elevenlabs.io/v2/voices"
    headers = {"xi-api-key": api_key}
    params = {"voice_type": "default", "page_size": 100}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)

        if response.status_code != 200:
            logger.error(f"Failed to fetch voices: {response.status_code}")
            return []

        data = response.json()
        voices = data.get("voices", [])

        # Transform to our format
        result = []
        for v in voices:
            result.append({
                "voice_id": v.get("voice_id"),
                "name": v.get("name"),
                "description": v.get("description"),
                "preview_url": v.get("preview_url"),
                "labels": v.get("labels", {}),
            })

        return result

    except Exception as e:
        logger.exception(f"Error fetching voices from ElevenLabs: {e}")
        return []


async def get_available_voices(teacher_id: Optional[str] = None) -> list[dict]:
    """
    Get the list of available voices.
    Fetches from ElevenLabs and includes any custom voices the teacher has added.
    """
    global _voice_cache

    if _voice_cache is None:
        voices = await fetch_elevenlabs_voices()
        voices.sort(key=lambda x: x.get("name", "").lower())
        _voice_cache = voices

    result = list(_voice_cache)

    # Add teacher's custom voices at the top
    if teacher_id:
        custom_voices = get_custom_voices(teacher_id)
        # Filter out any custom voices that are already in the list
        existing_ids = {v["voice_id"] for v in result}
        for cv in custom_voices:
            if cv["voice_id"] not in existing_ids:
                result.insert(0, cv)

    return result


def get_custom_voices(teacher_id: str) -> list[dict]:
    """Get custom voices added by a teacher."""
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT voice_id, voice_name
            FROM teacher_custom_voices
            WHERE teacher_id = ?
            ORDER BY created_at DESC
            """,
            [teacher_id],
        ).fetchall()

    return [
        {
            "voice_id": row[0],
            "name": row[1] or "Custom Voice",
            "description": "Custom voice",
            "preview_url": None,
            "is_custom": True,
        }
        for row in result
    ]


def add_custom_voice(teacher_id: str, voice_id: str, voice_name: Optional[str] = None) -> dict:
    """Add a custom voice ID for a teacher."""
    now = datetime.utcnow()
    custom_id = str(uuid7())

    with get_db() as conn:
        # Check if already exists
        existing = conn.execute(
            """
            SELECT id FROM teacher_custom_voices
            WHERE teacher_id = ? AND voice_id = ?
            """,
            [teacher_id, voice_id],
        ).fetchone()

        if existing:
            # Update name if provided
            if voice_name:
                conn.execute(
                    """
                    UPDATE teacher_custom_voices
                    SET voice_name = ?, updated_at = ?
                    WHERE teacher_id = ? AND voice_id = ?
                    """,
                    [voice_name, now, teacher_id, voice_id],
                )
            return {
                "id": existing[0],
                "voice_id": voice_id,
                "voice_name": voice_name,
            }

        conn.execute(
            """
            INSERT INTO teacher_custom_voices
            (id, teacher_id, voice_id, voice_name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [custom_id, teacher_id, voice_id, voice_name, now],
        )

    return {
        "id": custom_id,
        "voice_id": voice_id,
        "voice_name": voice_name,
    }


def remove_custom_voice(teacher_id: str, voice_id: str) -> bool:
    """Remove a custom voice for a teacher."""
    with get_db() as conn:
        result = conn.execute(
            """
            DELETE FROM teacher_custom_voices
            WHERE teacher_id = ? AND voice_id = ?
            """,
            [teacher_id, voice_id],
        )
        return result.rowcount > 0


def get_voice_preferences(teacher_id: str) -> dict[str, dict]:
    """
    Get all voice preferences for a teacher.
    Returns dict mapping language_code -> preference details.
    """
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT language_code, voice_id, voice_name
            FROM teacher_voice_preferences
            WHERE teacher_id = ?
            """,
            [teacher_id],
        ).fetchall()

    preferences = {}
    for row in result:
        preferences[row[0]] = {
            "language_code": row[0],
            "voice_id": row[1],
            "voice_name": row[2],
        }

    return preferences


def get_voice_for_language(teacher_id: str, language_code: str) -> str:
    """
    Get the voice_id for a specific teacher and language.
    Returns the teacher's preference if set, otherwise the default voice.
    """
    with get_db() as conn:
        result = conn.execute(
            """
            SELECT voice_id
            FROM teacher_voice_preferences
            WHERE teacher_id = ? AND language_code = ?
            """,
            [teacher_id, language_code],
        ).fetchone()

    if result:
        return result[0]

    return DEFAULT_VOICE_ID


def update_voice_preference(
    teacher_id: str,
    language_code: str,
    voice_id: str,
    voice_name: Optional[str] = None,
) -> dict:
    """
    Create or update a voice preference for a teacher and language.
    Uses upsert logic.
    """
    now = datetime.utcnow()

    with get_db() as conn:
        # Check if preference exists
        existing = conn.execute(
            """
            SELECT id FROM teacher_voice_preferences
            WHERE teacher_id = ? AND language_code = ?
            """,
            [teacher_id, language_code],
        ).fetchone()

        if existing:
            # Update existing
            conn.execute(
                """
                UPDATE teacher_voice_preferences
                SET voice_id = ?, voice_name = ?, updated_at = ?
                WHERE teacher_id = ? AND language_code = ?
                """,
                [voice_id, voice_name, now, teacher_id, language_code],
            )
            pref_id = existing[0]
        else:
            # Insert new
            pref_id = str(uuid7())
            conn.execute(
                """
                INSERT INTO teacher_voice_preferences
                (id, teacher_id, language_code, voice_id, voice_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [pref_id, teacher_id, language_code, voice_id, voice_name, now],
            )

    return {
        "id": pref_id,
        "teacher_id": teacher_id,
        "language_code": language_code,
        "voice_id": voice_id,
        "voice_name": voice_name,
    }


def update_voice_preferences_bulk(
    teacher_id: str,
    preferences: list[dict],
) -> dict[str, dict]:
    """
    Update multiple voice preferences at once.
    Each preference dict should have: language_code, voice_id, voice_name (optional)
    """
    result = {}
    for pref in preferences:
        updated = update_voice_preference(
            teacher_id=teacher_id,
            language_code=pref["language_code"],
            voice_id=pref["voice_id"],
            voice_name=pref.get("voice_name"),
        )
        result[pref["language_code"]] = {
            "language_code": pref["language_code"],
            "voice_id": pref["voice_id"],
            "voice_name": pref.get("voice_name"),
        }

    return result
