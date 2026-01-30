# Speak-Up 🎤

An AI-powered oral exam platform for teachers that uses LLM technology to dynamically generate questions, track student progress, and provide real-time support.

## Overview

Speak-Up enables teachers to conduct oral examinations where:
- Questions are dynamically generated based on uploaded rubrics
- Student responses are analyzed for rubric criteria coverage
- The system detects when students are struggling and adapts questions
- Exams automatically complete when all criteria are covered
- Teachers can monitor multiple students in real-time

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Teacher Dashboard                       │
│                   (Streamlit)                            │
│                 http://localhost:8501                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                         │
│                 http://localhost:8000                    │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Student    │  │    Internal   │  │   DuckDB     │ │
│  │     API      │  │  Teacher API  │  │   Database   │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
│                         │                                │
│                         ▼                                │
│              ┌──────────────────────┐                    │
│              │  OpenRouter/Gemini   │                    │
│              │   (LLM Services)     │                    │
│              └──────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Student Application │
              │   (Not Included)     │
              └──────────────────────┘
```

## Key Features

### For Teachers
- **Rubric Management**: Upload rubrics in Markdown format, automatically parsed into structured criteria
- **Live Exam Monitoring**: Real-time dashboard showing all active students
- **Struggle Alerts**: Automatic notifications when students need help
- **Full Intervention**: Send messages, override questions, or terminate sessions
- **Analytics**: Detailed metrics on coverage, duration, and common struggle points

### LLM-Powered Intelligence
- **Parallel Analysis**: Coverage and struggle detection run simultaneously for speed
- **Dynamic Questions**: Questions generated based on uncovered criteria and conversation flow
- **Adaptive Support**: Questions automatically simplified when struggles detected
- **Smart Completion**: Exam ends when all rubric criteria sufficiently covered

### API for Students
- REST API for student applications to join exams and submit responses
- Responses expected as transcripts (from speech-to-text conversion)
- Questions returned as text (for text-to-speech conversion)

## Installation

### Prerequisites
- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- OpenRouter API key ([get one here](https://openrouter.ai/keys))

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

   Edit `.env` and set your OpenRouter API key:
   ```env
   OPENROUTER_API_KEY=your_key_here
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

### Start Teacher Dashboard (Streamlit)

In a separate terminal:

Using uv:
```bash
uv run streamlit run streamlit_app/app.py
```

Or with activated venv:
```bash
streamlit run streamlit_app/app.py
```

The dashboard will be available at http://localhost:8501

## Teacher Workflow

1. **Register/Login** at http://localhost:8501
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

### Submit a Response

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

## LLM Services

The application uses **Gemini 3 Flash** via OpenRouter for:

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

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `DUCKDB_PATH` | Database file location | `./data/speak_up.duckdb` |
| `JWT_SECRET` | Secret for JWT tokens | Change in production |
| `JWT_EXPIRE_MINUTES` | Token expiration | `1440` (24 hours) |
| `ROOM_CODE_LENGTH` | Length of room codes | `6` |
| `MAX_STUDENTS_PER_EXAM` | Max concurrent students | `30` |

## Teacher & Student App (Next.js – single entry)

The **frontend** in `frontend/` is the main web app. It opens with a **role selection** screen so users choose **Teacher** or **Student**, then follows the right flow.

- **Teacher**: Sign in → Dashboard (rubrics, start exam, monitor, transcripts, analytics). Uses the internal API and JWT auth.
- **Student**: Enter room code, name, and student ID → Join exam → Answer questions (type or paste transcript) → Submit until exam completes.

**Run locally (backend + frontend):**

1. **Backend** (from repo root):
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Frontend** (from repo root):
   ```bash
   cd frontend && npm install && npm run dev
   ```
3. Open **http://localhost:3000** → choose Teacher or Student.

Optional: copy `frontend/.env.local.example` to `frontend/.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:8000` if the backend is not on that URL.

You can still use the Streamlit dashboard at http://localhost:8501 or the v0 prototype in `speak-up-1/`; the canonical app with role selection is `frontend/`.

## Project Structure

```
speak-up/
├── frontend/                  # Next.js teacher dashboard (optional)
│   ├── app/                   # App Router pages
│   ├── components/            # UI + shadcn
│   ├── lib/                   # API client, types (aligned with backend)
│   └── INTEGRATION.md         # v0 integration steps
├── app/                       # FastAPI backend
│   ├── api/
│   │   ├── routes/
│   │   │   ├── student.py   # Student-facing endpoints
│   │   │   └── internal.py  # Teacher-facing endpoints
│   │   └── schemas.py       # Pydantic models
│   ├── services/
│   │   ├── auth.py          # Authentication
│   │   ├── exam.py          # Exam management
│   │   ├── rubric.py        # Rubric CRUD
│   │   ├── coverage.py      # Coverage analysis (LLM)
│   │   ├── struggle.py      # Struggle detection (LLM)
│   │   ├── questions.py     # Question generation (LLM)
│   │   ├── transcript.py    # Transcript storage
│   │   ├── orchestrator.py  # Response processing
│   │   └── llm_client.py    # OpenRouter client
│   ├── models/
│   │   └── domain.py        # Domain models
│   ├── config.py            # Configuration
│   ├── database.py          # DuckDB setup
│   └── main.py              # FastAPI app
├── streamlit_app/
│   └── app.py               # Teacher dashboard
├── data/                    # Database files (created on first run)
├── tests/                   # Test files
├── requirements.txt         # Python dependencies
└── .env                     # Environment configuration
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
- Student application not included (API only)
- Manual refresh for live monitoring (no WebSockets)
- Requires OpenRouter API credits for LLM calls

## Contributing

This is a teacher-facing implementation. To complete the system:
1. Build a student application that integrates with the API
2. Implement speech-to-text for student responses
3. Implement text-to-speech for questions
4. Consider ElevenLabs for voice synthesis

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with FastAPI, Streamlit, DuckDB, and Gemini 3 Flash via OpenRouter.
