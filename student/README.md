# Student-side oral exam client

Terminal-based client for students to record oral exam answers, transcribe via ElevenLabs, and submit transcripts to the instructor's FastAPI server.

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   cd student
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   # source .venv/bin/activate   # macOS/Linux
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and set your values:

   ```bash
   copy .env.example .env   # Windows
   # cp .env.example .env   # macOS/Linux
   ```

## Environment variables

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key (used as `xi-api-key` for Speech-to-Text). |
| `INSTRUCTOR_SERVER_URL` | Base URL of the instructor's FastAPI server (e.g. `http://localhost:8000`). |

## Running

From the `student` directory with your venv activated:

```bash
python main.py
```

You will be prompted for:

- **Student ID** (or name) – identifies the student.
- **Test ID** – identifies the exam/session.

Then for each answer:

- **Question for this answer** (optional) – the specific question the student is answering. You can press Enter to leave blank.
- Press **Enter** to start recording.
- Press **Enter** again to stop. The audio is sent to ElevenLabs for transcription, then the transcript (with student_id, test_id, and question) is POSTed to the instructor server.
- Type **q** and Enter to quit.

### Optional: CLI args (for GUI integration)

A teammate can automate by passing IDs and the question so the user does not type them:

```bash
python main.py --student-id "jane_doe" --test-id "midterm_2024" --question "Describe the water cycle."
```

If `--question` is provided, the app uses it for that recording and skips the question prompt.

## Instructor API contract

The client sends one JSON payload per recording to the instructor server:

- **Method**: `POST`
- **Path**: `/transcripts` (configurable via `INSTRUCTOR_SERVER_URL`; path is appended).
- **Body**:
  ```json
  {
    "student_id": "<string>",
    "test_id": "<string>",
    "transcript": "<string>",
    "question": "<string>"
  }
  ```
  The `question` field is the specific question the student is answering (may be empty).
- **Content-Type**: `application/json`

The instructor's FastAPI server should expose an endpoint that accepts this payload (e.g. `POST /transcripts`).

## UI backend (for TypeScript/Node.js)

A second module, `ui_backend.py`, is intended to be called by the UI (TypeScript or Node.js). It provides:

1. **Record + transcribe** – record microphone until stopped, send to ElevenLabs STT, return the transcript.
2. **Speak** – take a text string, generate speech via ElevenLabs TTS, and play the audio.

### FastAPI (recommended for the UI)

Run a local FastAPI server so the UI can call HTTP endpoints:

```bash
cd student
python ui_backend.py serve
```

By default the server listens on **http://127.0.0.1:8001**. Then call:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/record/start` | Start recording. Returns `{"status": "recording"}`. 409 if already recording. |
| `POST` | `/record/stop` | Stop recording, transcribe, and return `{"transcript": "..."}`. 409 if not recording. |
| `POST` | `/speak` | Body: `{"text": "..."}`. Play TTS for that text. Returns `{"status": "ok"}` when done. |

**Recording flow:** The UI calls `POST /record/start`, shows “Recording…”, and when the user clicks Stop calls `POST /record/stop`. The response body of `/record/stop` contains the transcript.

**Interactive API docs:** Open http://127.0.0.1:8001/docs in a browser.

### Using as a library

From Python you can import and call:

```python
from ui_backend import record_and_transcribe, speak
import threading

stop = threading.Event()
# In another thread: stop.set() when user clicks Stop
transcript = record_and_transcribe(stop)

speak("Hello, this is the question.")
```

### Calling from Node/TypeScript (CLI)

You can still spawn the script and use stdin/stdout (JSON) instead of HTTP:

- **Record:** `python ui_backend.py record`; send `stop` on stdin; read `{"transcript": "..."}` or `{"error": "..."}` from stdout.
- **Speak:** `python ui_backend.py speak "Your text here"` or pipe text; stdout gets `{"status": "ok"}` or `{"error": "..."}`.

### TTS dependency

- `speak()` uses **pydub** to decode MP3 from ElevenLabs and play it with sounddevice.
- For MP3 support, **ffmpeg** must be installed on the system (and on PATH). See [pydub setup](https://github.com/jiaaro/pydub#getting-ffmpeg-set-up).

### Environment

- `ELEVENLABS_API_KEY` is used for both STT (transcribe) and TTS (speak).
- Optional: `ELEVENLABS_VOICE_ID` – voice for TTS (default is a built-in voice ID).

## Future GUI integration

The app is structured so that:

- **Same pipeline**: `audio.record_audio()`, `transcribe.transcribe()`, and `instructor_client.send_transcript()` can be imported and called from another process (e.g. a GUI app).
- **UI backend**: `ui_backend.record_and_transcribe()` and `ui_backend.speak()` (or the CLI) let a Node/TS UI drive recording and playback without reimplementing ElevenLabs calls.
