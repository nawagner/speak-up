# Speak-Up Web App (Next.js)

Single web app for Speak-Up with **role selection** on the opening screen: users choose **Teacher** or **Student**, then follow the appropriate flow. Uses the FastAPI backend (see [README](../README.md)).

## Flows

- **Teacher**: Role selection → Sign in → Dashboard (rubrics, start exam, monitor, transcripts, analytics). Uses internal API + JWT.
- **Student**: Role selection → Enter room code, name, student ID → Join exam → Answer questions (type or paste transcript) → Submit until complete.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` if the backend is not at `http://localhost:8000`.

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Ensure the FastAPI backend is running (e.g. `uvicorn app.main:app --reload` from the repo root). The opening screen is the role selection (Teacher / Student).

## Adding the v0 component

From this directory run:

```bash
npx shadcn@latest add "https://v0.app/chat/b/b_CeobxKCVFXU"
```

Then see [INTEGRATION.md](./INTEGRATION.md) to wire the new component to the backend schema and pages.

## Tech

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (Radix)
- API types in `lib/types.ts` aligned with backend `app/api/schemas.py`
- Student API (join, submit response, get question, leave) in `lib/api.ts`
