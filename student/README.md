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

## Future GUI integration

A teammate will build a GUI that controls this flow. The app is structured so that:

- **Same pipeline**: `audio.record_audio()`, `transcribe.transcribe()`, and `instructor_client.send_transcript()` can be imported and called from another process (e.g. a GUI app).
- **CLI args**: Running `python main.py --student-id X --test-id Y` allows the GUI to launch the script with IDs pre-filled and drive the session (e.g. start/stop recording via stdin or a simple protocol later).
