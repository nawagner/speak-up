"""
Backend for the UI (TypeScript/Node.js): record + transcribe, and text-to-speech playback.

- Library: import record_and_transcribe, speak.
- FastAPI: run with uvicorn; call POST /record/start, POST /record/stop, POST /speak.
- CLI: python ui_backend.py record | speak (stdin/stdout JSON).
"""

from __future__ import annotations

import io
import json
import os
import sys
import threading
from pathlib import Path

import numpy as np
import requests
import sounddevice as sd

# Reuse student modules; load .env for API keys
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from audio import record_audio
from transcribe import transcribe

# ---------------------------------------------------------------------------
# FastAPI app (local endpoints for the UI)
# ---------------------------------------------------------------------------

_record_lock = threading.Lock()
_record_stop_event: threading.Event | None = None
_record_thread: threading.Thread | None = None
_record_result: dict | None = None  # {"transcript": "..."} or {"error": "..."}


def _record_worker(stop_event: threading.Event) -> None:
    global _record_result
    try:
        transcript = record_and_transcribe(stop_event)
        _record_result = {"transcript": transcript}
    except Exception as e:
        _record_result = {"error": str(e)}


def _create_app():
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel

    app = FastAPI(
        title="Student UI Backend",
        description="Local FastAPI endpoints for record/transcribe and text-to-speech.",
    )

    class SpeakBody(BaseModel):
        text: str

    @app.post("/record/start")
    def record_start():
        """Start recording. Call POST /record/stop to stop and get the transcript."""
        global _record_stop_event, _record_thread, _record_result
        with _record_lock:
            if _record_thread is not None and _record_thread.is_alive():
                raise HTTPException(status_code=409, detail="Recording already in progress")
            _record_result = None
            _record_stop_event = threading.Event()
            _record_thread = threading.Thread(
                target=_record_worker,
                args=(_record_stop_event,),
            )
            _record_thread.start()
        return {"status": "recording"}

    @app.post("/record/stop")
    def record_stop():
        """Stop recording, transcribe via ElevenLabs, and return the transcript."""
        global _record_stop_event, _record_thread, _record_result
        with _record_lock:
            if _record_thread is None or not _record_thread.is_alive():
                raise HTTPException(status_code=409, detail="No recording in progress")
            stop_ev = _record_stop_event
            thread = _record_thread
        stop_ev.set()
        thread.join(timeout=120)
        with _record_lock:
            result = _record_result
            _record_thread = None
            _record_stop_event = None
            _record_result = None
        if result is None:
            raise HTTPException(status_code=504, detail="Transcription timed out")
        if "error" in result:
            raise HTTPException(status_code=502, detail=result["error"])
        return {"transcript": result["transcript"]}

    @app.post("/speak")
    def speak_endpoint(body: SpeakBody):
        """Convert text to speech with ElevenLabs TTS and play the audio. Blocks until done."""
        try:
            speak(body.text)
            return {"status": "ok"}
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return app


app = _create_app()

# ElevenLabs TTS
ELEVENLABS_TTS_URL_TEMPLATE = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
DEFAULT_TTS_MODEL = "eleven_multilingual_v2"


def record_and_transcribe(stop_event: threading.Event) -> str:
    """
    Record from the microphone until stop_event is set, then transcribe via ElevenLabs STT.
    Returns the transcript text. Raises on recording or API errors.
    """
    wav_path = record_audio(stop_event)
    try:
        return transcribe(wav_path)
    finally:
        Path(wav_path).unlink(missing_ok=True)


def speak(
    text: str,
    *,
    api_key: str | None = None,
    voice_id: str | None = None,
) -> None:
    """
    Convert text to speech with ElevenLabs TTS and play the audio. Blocks until playback finishes.
    """
    key = api_key or os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise ValueError(
            "ELEVENLABS_API_KEY is not set. Set it in the environment or pass api_key=."
        )
    voice = voice_id or os.environ.get("ELEVENLABS_VOICE_ID") or DEFAULT_VOICE_ID
    url = ELEVENLABS_TTS_URL_TEMPLATE.format(voice_id=voice)

    headers = {
        "xi-api-key": key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": DEFAULT_TTS_MODEL,
    }
    params = {"output_format": "mp3_44100_128"}

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        params=params,
        timeout=60,
    )
    response.raise_for_status()
    audio_bytes = response.content

    # Decode MP3 and play with sounddevice
    try:
        from pydub import AudioSegment
    except ImportError as e:
        raise ImportError(
            "pydub is required for TTS playback. Install with: pip install pydub. "
            "For MP3 support you also need ffmpeg installed. "
            f"Original error: {e}"
        ) from e

    try:
        seg = AudioSegment.from_mp3(io.BytesIO(audio_bytes))
    except Exception as e:
        raise RuntimeError(
            f"Failed to decode TTS audio. If pydub is installed, ensure ffmpeg is on your PATH. Original error: {e}"
        ) from e

    samples = np.array(seg.get_array_of_samples())
    if seg.channels == 2:
        samples = samples.reshape(-1, 2)
    samples = (samples.astype(np.float32) / 32768.0)
    sd.play(samples, seg.frame_rate)
    sd.wait()


def _cli_record() -> None:
    """Start recording; wait for 'stop' line on stdin; transcribe and print JSON to stdout."""
    stop_event = threading.Event()
    result: list[str] = []
    err: list[str] = []

    def run() -> None:
        try:
            transcript = record_and_transcribe(stop_event)
            result.append(transcript)
        except Exception as e:
            err.append(str(e))

    t = threading.Thread(target=run)
    t.start()
    # Wait for "stop" on stdin, then signal recording to stop
    for line in sys.stdin:
        if line.strip().lower() == "stop":
            break
    stop_event.set()
    t.join(timeout=120)

    if err:
        print(json.dumps({"error": err[0]}), flush=True)
    else:
        print(json.dumps({"transcript": result[0] if result else ""}), flush=True)


def _cli_speak(text: str) -> None:
    """Play TTS for text; print JSON status to stdout."""
    try:
        speak(text)
        print(json.dumps({"status": "ok"}), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)


def main() -> None:
    if len(sys.argv) < 2:
        print(
            "Usage: python ui_backend.py record   (then send 'stop' on stdin)",
            file=sys.stderr,
        )
        print(
            "       python ui_backend.py speak <text>",
            file=sys.stderr,
        )
        sys.exit(1)
    cmd = sys.argv[1].lower()
    if cmd == "record":
        _cli_record()
    elif cmd == "speak":
        text = " ".join(sys.argv[2:]).strip() if len(sys.argv) > 2 else ""
        if not text:
            # Read from stdin
            text = sys.stdin.read().strip()
        if not text:
            print(json.dumps({"error": "No text provided"}), flush=True)
            sys.exit(1)
        _cli_speak(text)
    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1].lower() == "serve":
        import uvicorn
        uvicorn.run(
            "ui_backend:app",
            host="127.0.0.1",
            port=8001,
            reload=False,
        )
    else:
        main()
