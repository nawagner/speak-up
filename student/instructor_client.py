"""Send transcript payloads to the instructor's FastAPI server."""

import os
from urllib.parse import urljoin

import requests

DEFAULT_ENDPOINT_PATH = "/transcripts"


def send_transcript(
    student_id: str,
    test_id: str,
    transcript: str,
    *,
    base_url: str | None = None,
    path: str | None = None,
) -> None:
    """
    POST a JSON payload { student_id, test_id, transcript } to the instructor server.
    Raises on missing base URL or HTTP errors.
    """
    base = base_url or os.environ.get("INSTRUCTOR_SERVER_URL")
    if not base:
        raise ValueError(
            "INSTRUCTOR_SERVER_URL is not set. Set it in the environment or pass base_url=."
        )
    endpoint_path = path or DEFAULT_ENDPOINT_PATH
    url = urljoin(base.rstrip("/") + "/", endpoint_path.lstrip("/"))

    payload = {
        "student_id": student_id,
        "test_id": test_id,
        "transcript": transcript,
    }

    response = requests.post(
        url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
