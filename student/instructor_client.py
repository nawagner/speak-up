"""Send transcript payloads to the instructor's FastAPI server."""

import os
from urllib.parse import urljoin

import requests


def send_transcript(
    session_id: str,
    transcript: str,
    question: str = "",
    *,
    base_url: str | None = None,
) -> None:
    """
    POST a JSON payload { question, transcript } to the instructor server at
    /api/v1/session/{session_id}/response.
    Raises on missing base URL or HTTP errors.
    """
    base = base_url or os.environ.get("INSTRUCTOR_SERVER_URL")
    if not base:
        raise ValueError(
            "INSTRUCTOR_SERVER_URL is not set. Set it in the environment or pass base_url=."
        )
    path = f"api/v1/session/{session_id}/response"
    url = urljoin(base.rstrip("/") + "/", path)

    payload = {
        "question": question,
        "transcript": transcript,
    }

    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    response.raise_for_status()


def get_teacher_response(
    session_id: str,
    *,
    base_url: str | None = None,
) -> dict:
    """
    GET the teacher's response for a given session.
    Returns { question_text, question_number, is_final, is_adapted, message }.
    Raises on missing base URL or HTTP errors.
    """
    base = base_url or os.environ.get("INSTRUCTOR_SERVER_URL")
    if not base:
        raise ValueError(
            "INSTRUCTOR_SERVER_URL is not set. Set it in the environment or pass base_url=."
        )
    url = urljoin(base.rstrip("/") + "/", f"api/v1/session/{session_id}/response")

    response = requests.get(
        url,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()
