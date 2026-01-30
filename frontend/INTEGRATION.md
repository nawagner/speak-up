# Integrating the v0 Frontend with Speak-Up

This Next.js app is the **teacher dashboard** and talks to the existing FastAPI backend. It reuses the backend schema and API from the repo (see [README.md](../README.md)).

## 1. Add your v0 component

From the **frontend** directory, run:

```bash
npx shadcn@latest add "https://v0.app/chat/b/b_CeobxKCVFXU"
```

This installs the v0-generated component (e.g. into `components/ui/` or a named file under `components/`). Note the added file path.

## 2. Align with the backend schema

- **Types** are in `lib/types.ts` and mirror `app/api/schemas.py` (auth, rubrics, exams, sessions, analytics).
- **API client** is in `lib/api.ts`: all internal routes (`/internal/*`) and response shapes match the backend.

When wiring the v0 component:

1. **Fields**: Rename or drop any v0 fields that don’t exist in the backend. Use the names in `lib/types.ts` and the [README API section](../README.md#student-api-reference) (and internal routes).
2. **Auth**: Use `getToken()` from `lib/auth.ts` and pass it into `api.*` calls (e.g. `rubrics.list(getToken())`).
3. **Forms**: Map form values to the types in `lib/types.ts` (e.g. `RubricCreate`: `title`, `content`; `TeacherLogin`: `username`, `password`).

## 3. Where to use the v0 component

- **Dashboard** → `app/dashboard/page.tsx`
- **Rubrics** → `app/dashboard/rubrics/page.tsx`
- **Start Exam** → `app/dashboard/start-exam/page.tsx`
- **Monitor** → `app/dashboard/monitor/page.tsx`
- **Transcripts** → `app/dashboard/transcripts/page.tsx`
- **Analytics** → `app/dashboard/analytics/page.tsx`
- **Login/Register** → `app/page.tsx`, `app/register/page.tsx`, `components/login-form.tsx`

Replace or wrap the existing UI in the right page with your v0 component, then connect props/state to the types and API calls above.

## 4. Run the stack

1. **Backend** (from repo root):

   ```bash
   uvicorn app.main:app --reload
   ```

2. **Frontend** (from repo root):

   ```bash
   cd frontend && npm install && npm run dev
   ```

3. Open the teacher dashboard at **http://localhost:3000**. Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if the backend is not at `http://localhost:8000`.

## 5. Optional: keep Streamlit

The existing Streamlit app (`streamlit_app/app.py`) is unchanged. You can keep using it at port 8501 or switch to this Next.js dashboard; both use the same backend and schema.
