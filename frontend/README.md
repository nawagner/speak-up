# Speak-Up Teacher Dashboard (Next.js)

React/Next.js teacher dashboard for Speak-Up. Uses the same backend API as the Streamlit app (see [README](../README.md)).

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

   Open [http://localhost:3000](http://localhost:3000). Ensure the FastAPI backend is running (e.g. `uvicorn app.main:app --reload` from the repo root).

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
