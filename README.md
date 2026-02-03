# Speak-Up

An AI-powered oral exam platform for teachers that uses LLM technology to dynamically generate questions, track student progress, and provide real-time support.

**Live Demo**: [https://speak-up-26i.pages.dev](https://speak-up-26i.pages.dev)

## Overview

Speak-Up enables teachers to conduct oral examinations where:
- Questions are dynamically generated based on uploaded rubrics
- Student responses are analyzed for rubric criteria coverage
- The system detects when students are struggling and adapts questions
- Exams automatically complete when all criteria are covered
- Teachers can monitor multiple students in real-time

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 15 Frontend                          │
│               Cloudflare Pages (speak-up-26i.pages.dev)         │
│  ┌──────────────────┐    ┌───────────────────────┐             │
│  │   Student UI     │    │   Teacher Dashboard   │             │
│  │ (Audio Recording)│    │  (Exam Monitoring)    │             │
│  └──────────────────┘    └───────────────────────┘             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                            │
│                        Railway.app                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │   Student    │  │    Internal   │  │       DuckDB         │ │
│  │     API      │  │  Teacher API  │  │      Database        │ │
│  └──────────────┘  └───────────────┘  └──────────────────────┘ │
│          │                 │                                    │
│          ▼                 ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   External Services                        │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────────┐ │ │
│  │  │  OpenRouter/Gemini  │  │        ElevenLabs           │ │ │
│  │  │   (LLM Services)    │  │   (Text-to-Speech / STT)    │ │ │
│  │  └─────────────────────┘  └─────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### For Teachers
- **Rubric Management**: Upload rubrics in Markdown format, automatically parsed into structured criteria
- **Live Exam Monitoring**: Real-time dashboard showing all active students
- **Struggle Alerts**: Automatic notifications when students need help
- **Full Intervention**: Send messages, override questions, or terminate sessions
- **Analytics**: Detailed metrics on coverage, duration, and common struggle points
- **Voice Customization**: Select different voices per language for TTS

### LLM-Powered Intelligence
- **Parallel Analysis**: Coverage and struggle detection run simultaneously for speed
- **Dynamic Questions**: Questions generated based on uncovered criteria and conversation flow
- **Adaptive Support**: Questions automatically simplified when struggles detected
- **Smart Completion**: Exam ends when all rubric criteria sufficiently covered

### Audio & Multi-Language Support
- **Voice Recording**: Students record audio responses directly in browser
- **Speech-to-Text**: Audio transcribed via ElevenLabs Scribe
- **Text-to-Speech**: Questions read aloud using ElevenLabs voices
- **Multi-Language**: Support for English, Spanish, French, German, and Chinese
- **Voice Selection**: Teachers can choose different voices per language
- **Question Skipping**: Two-stage skip (adapt question first, then move to new topic)

## Installation

### Prerequisites
- Python 3.12+
- Node.js 18+ (for frontend)
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- OpenRouter API key ([get one here](https://openrouter.ai/keys))
- ElevenLabs API key ([get one here](https://elevenlabs.io)) - for audio features

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nawagner/speak-up.git
   cd speak-up
   ```

2. **Create virtual environment and install dependencies**

   Using uv (recommended):
   ```bash
   uv venv
   uv pip install -r requirements.txt
   ```

   Or using pip:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your API keys:
   ```env
   OPENROUTER_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   ```

4. **Initialize the database**

   The database will be created automatically on first run at `./data/speak_up.duckdb`

## Running the Application

### Start Backend (FastAPI)

Using uv:
```bash
uv run uvicorn app.main:app --reload
```

Or with activated venv:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### Start Frontend (Next.js)

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

## Teacher Workflow

1. **Register/Login** at http://localhost:3000/teacher/login
2. **Create a Rubric**
   - Navigate to "Rubrics"
   - Enter title and content in Markdown format
   - System automatically parses criteria using LLM
3. **Start an Exam**
   - Navigate to "Start Exam"
   - Select a parsed rubric
   - Click "Start Exam" to generate a room code
4. **Share Room Code** with students
5. **Monitor Exam**
   - Navigate to "Monitor Exam"
   - View real-time student progress
   - Receive struggle alerts
   - Send messages or intervene as needed
6. **Review Results**
   - Navigate to "Transcripts" for full conversation history
   - Navigate to "Analytics" for metrics and insights

## Student API Reference

### Join an Exam

```bash
POST /api/v1/join
Content-Type: application/json

{
  "room_code": "ABC123",
  "student_name": "John Doe",
  "student_id": "S12345"
}

Response:
{
  "session_id": "uuid",
  "exam_title": "Biology Midterm",
  "first_question": "Can you explain the process of photosynthesis?"
}
```

### Submit a Text Response

```bash
POST /api/v1/session/{session_id}/response
Content-Type: application/json

{
  "transcript": "Photosynthesis is the process by which plants..."
}

Response:
{
  "question_text": "How does cellular respiration differ from photosynthesis?",
  "question_number": 2,
  "is_final": false,
  "is_adapted": false,
  "message": null
}
```

### Submit an Audio Response

```bash
POST /api/v1/session/{session_id}/audio
Content-Type: multipart/form-data

Form fields:
- audio: Audio file (WAV, WebM, MP4, or OGG)
- question: Current question text

Response: Same as Submit Response
```

### Get Current Question

```bash
GET /api/v1/session/{session_id}/question

Response:
{
  "question_text": "Can you explain...",
  "question_number": 1,
  "is_final": false,
  "is_adapted": false,
  "message": null
}
```

### Get Question Audio (TTS)

```bash
GET /api/v1/session/{session_id}/tts?text=...&language=en

Query parameters:
- text: Question text to convert
- language: Language code (en, es, fr, de, zh)

Response: audio/mpeg (MP3 data)
```

### Translate Question

```bash
GET /api/v1/session/{session_id}/translate?text=...&language=es

Response:
{
  "original_text": "...",
  "translated_text": "...",
  "language": "es"
}
```

### Skip Question

```bash
POST /api/v1/session/{session_id}/skip

Response: Same as Submit Response
Note: Must submit at least one response before skipping. First skip adapts question; second skip moves to new topic.
```

### Leave Exam

```bash
POST /api/v1/session/{session_id}/leave
```

## Database Schema

### Core Tables
- `teachers` - Teacher accounts with bcrypt-hashed passwords
- `rubrics` - Rubric content and LLM-parsed criteria
- `exams` - Active and completed exams with room codes
- `student_sessions` - Student participation records
- `transcript_entries` - Full conversation history

### Analysis Tables
- `coverage_analyses` - LLM coverage evaluations
- `struggle_events` - Detected struggles with reasoning
- `analytics_snapshots` - Aggregated metrics

### Voice Preference Tables
- `teacher_voice_preferences` - Voice selection per language per teacher
- `teacher_custom_voices` - Custom ElevenLabs voice IDs

## LLM Services

The application uses **Gemini 3 Flash Preview** (`google/gemini-3-flash-preview`) via OpenRouter. The model is configurable via the `LLM_MODEL` environment variable.

LLM capabilities:

1. **Rubric Parsing** (`coverage.py`)
   - Extracts structured criteria from Markdown

2. **Coverage Analysis** (`coverage.py`)
   - Evaluates which criteria responses address
   - Runs in parallel with struggle detection

3. **Struggle Detection** (`struggle.py`)
   - Identifies confusion, off-topic responses, silence, etc.
   - Runs in parallel with coverage analysis

4. **Question Generation** (`questions.py`)
   - Creates dynamic questions targeting uncovered criteria

5. **Question Adaptation** (`struggle.py`)
   - Simplifies questions when struggles detected

6. **Text Translation** (`tts.py`)
   - Translates questions to supported languages

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (TTS/STT) | Required for audio |
| `ELEVENLABS_VOICE_ID` | Default voice ID | `21m00Tcm4TlvDq8ikWAM` (Rachel) |
| `LLM_MODEL` | LLM model identifier | `google/gemini-3-flash-preview` |
| `DUCKDB_PATH` | Database file location | `./data/speak_up.duckdb` |
| `JWT_SECRET` | Secret for JWT tokens | Change in production |
| `JWT_EXPIRE_MINUTES` | Token expiration | `1440` (24 hours) |
| `ROOM_CODE_LENGTH` | Length of room codes | `6` |
| `MAX_STUDENTS_PER_EXAM` | Max concurrent students | `30` |

## Project Structure

```
speak-up/
├── app/                      # FastAPI backend
│   ├── api/
│   │   ├── routes/
│   │   │   ├── student.py    # Student API (join, response, audio, tts)
│   │   │   └── internal.py   # Teacher API (auth, rubrics, exams, voice)
│   │   └── schemas.py        # Pydantic models
│   ├── services/
│   │   ├── auth.py           # Authentication
│   │   ├── exam.py           # Exam management
│   │   ├── rubric.py         # Rubric CRUD
│   │   ├── coverage.py       # Coverage analysis (LLM)
│   │   ├── struggle.py       # Struggle detection (LLM)
│   │   ├── questions.py      # Question generation (LLM)
│   │   ├── transcript.py     # Transcript storage
│   │   ├── orchestrator.py   # Response processing
│   │   ├── llm_client.py     # OpenRouter client
│   │   ├── tts.py            # Text-to-speech (ElevenLabs)
│   │   └── voice.py          # Voice preference management
│   ├── models/
│   │   └── domain.py         # Domain models
│   ├── config.py             # Configuration
│   ├── database.py           # DuckDB setup
│   └── main.py               # FastAPI app
├── frontend/                  # Next.js 15 frontend
│   ├── app/
│   │   ├── student/          # Student exam UI
│   │   │   ├── join/         # Room code entry
│   │   │   └── exam/         # Audio recording interface
│   │   └── teacher/          # Teacher dashboard
│   │       ├── login/        # Authentication
│   │       ├── dashboard/    # Overview
│   │       ├── rubrics/      # Rubric management
│   │       ├── exam/         # Exam start & monitor
│   │       └── settings/     # Voice preferences
│   ├── components/           # React components
│   │   ├── ui/               # Radix UI components
│   │   └── audio-recorder.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── use-audio-recorder.ts
│   │   └── use-question-audio.ts
│   └── lib/                  # API client and utilities
├── data/
│   └── rubrics/              # Sample rubric files
├── scripts/
│   └── seed_rubrics.py       # Database seeding script
├── tests/                    # Backend tests
├── railway.toml              # Railway deployment config
├── requirements.txt          # Python dependencies
└── .env                      # Environment configuration
```

## Development

### Running Tests

```bash
uv run pytest
```

### API Documentation

FastAPI provides automatic API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Database Inspection

The DuckDB database can be inspected using any DuckDB client or the CLI:

```bash
duckdb data/speak_up.duckdb
```

### Seed Sample Rubrics

The repository includes sample rubrics in `data/rubrics/`. To import them:

```bash
python scripts/seed_rubrics.py
```

This creates a demo teacher account (`demo_teacher`/`demo123`) and imports:
- French Oral Exam Rubric
- Ernest Hemingway Literature Oral Exam Rubric
- World War II Oral Exam Rubric

## Deployment

### Production Architecture
- **Frontend**: Cloudflare Pages (Next.js with `@cloudflare/next-on-pages`)
- **Backend**: Railway.app (FastAPI with uvicorn)
- **Database**: DuckDB (file-based, deployed with backend)

### Deploy Frontend (Cloudflare Pages)

```bash
cd frontend
npm run pages:build
npx wrangler pages deploy
```

### Deploy Backend (Railway)

The backend is configured via `railway.toml`:
- Build: Nixpacks (auto-detects Python)
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

### Environment Variables for Production

Set these in your deployment platform:
- `OPENROUTER_API_KEY` - Required
- `ELEVENLABS_API_KEY` - Required for audio features
- `JWT_SECRET` - Use a strong random value
- `DUCKDB_PATH` - Persistent storage path

## Example Rubric Format

```markdown
# Biology Exam - Photosynthesis

## Understanding of Process (30 points)
- Explain the light-dependent reactions
- Describe the Calvin cycle
- Identify the role of chlorophyll

## Application (20 points)
- Compare photosynthesis and cellular respiration
- Explain the importance in the ecosystem

## Critical Thinking (10 points)
- Analyze what would happen if photosynthesis stopped
```

## Limitations

- One active exam per teacher at a time
- Manual refresh for live monitoring (no WebSockets)
- Requires OpenRouter API credits for LLM calls
- Requires ElevenLabs API credits for audio features

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with FastAPI, Next.js 15, React 19, DuckDB, Gemini 3 Flash Preview via OpenRouter, and ElevenLabs for audio.
