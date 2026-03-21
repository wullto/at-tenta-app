# AT-tenta-app

A Swedish medical exam simulator for AT (läkarvikariat) physicians to practice past certification exams. Two modes: exam simulation (no answer keys) and practice mode (answer keys visible per question).

## Tech Stack

- **Next.js** (App Router, static generation)
- **React 19** with TypeScript (strict mode)
- **TailwindCSS 4** for all styling
- **Supabase** for auth (magic link OTP) and PostgreSQL database
- Exam data stored as JSON files in `/data/exams/`

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEV_LOGIN_CODE=   # optional, defaults to "ADMIN123"
```

App works without Supabase — progress is stored in localStorage only.

## Architecture

### Key directories

- `app/` — Next.js App Router pages and API routes
- `app/tenta/[examId]/prov/` — Exam-taking interface
- `app/tenta/[examId]/resultat/` — Results review
- `app/api/` — Backend routes (auth, progress saving, access requests)
- `lib/` — Shared utilities (exams, storage, progress, auth, Supabase clients)
- `components/` — Shared React components
- `data/exams/` — JSON files for 16 exams (2015–2018)
- `supabase/` — Database schema SQL

### Data flow

- Exam sessions are persisted to **both** localStorage (always) and Supabase (if authenticated)
- Exam pages are statically pre-rendered using `generateStaticParams()`
- `lib/exams.ts` loads and validates JSON exam files, cached with React `cache()`

### Domain types (`types/exam.ts`)

Core entities: `Exam`, `Case`, `Page`, `Question`

### Auth / Authorization

- Google OAuth via Supabase (→ `/auth/callback`)
- Users must be in the `allowed_users` table with `is_active=true` to save progress to DB and access 2016+ exams
- **Access tiers**: 2015 exams are free for all users; 2016/2017/2018 exams require an approved account — unapproved users see them greyed out and are redirected if they navigate directly
- Unauthorized users are logged to `access_requests` table
- Dev login: use code `ADMIN123` (or `DEV_LOGIN_CODE`) — sets a cookie for a virtual dev user, bypasses allowed_users check

### Database (Supabase PostgreSQL)

Schema in `supabase/user_exam_progress.sql`:

- `user_exam_progress` — exam sessions per user, RLS: users only see their own rows
- `allowed_users` — email whitelist, managed by admins
- `access_requests` — tracks unauthorized login attempts

### Exam modes

Controlled by the `showFacitPerQuestion` prop in `ExamFlow.tsx`:
- `false` → exam simulation (no answers shown)
- `true` → practice mode (answer key + self-scoring per question)

Self-scoring uses 0.5-point steps when `question.maxPoints` is non-integer (e.g. 2.5 → buttons 0, 0.5, 1 … 2.5), otherwise whole-number steps.

## Conventions

- UI text is in Swedish throughout
- No CSS modules — Tailwind only
- No external state management — React `useState`/`useTransition`
- Validate only at system boundaries (user input, external APIs)
