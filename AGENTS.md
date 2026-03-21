# AGENTS.md

## Project Overview

- Project: `AT-tenta-app`
- Stack: Next.js App Router, React, TypeScript, Tailwind CSS
- Purpose: Practice AT exams, import exam PDFs into structured JSON, track progress, and show a dashboard

## Core Directories

- `app/`: Next.js routes and UI
- `components/`: shared UI components
- `data/exams/`: normalized exam JSON files
- `public/images/exams/`: extracted images referenced by exam JSON
- `lib/`: shared app logic, scoring, storage, Supabase integration
- `scripts/`: import utilities for converting PDFs into exam JSON
- `supabase/`: SQL schema/setup files
- `Tentor PDF/`: source PDFs for questions and answer keys

## Current Architecture

- Exams are discovered automatically from `data/exams/*.json`
- App routes must not hardcode individual exams
- Local browser state still exists, but authenticated users persist progress to Supabase
- Dashboard on the home page is computed from persisted progress

## Exam Data Rules

- One exam file per exam: `data/exams/YYYY-MM.json`
- Images for an exam go under `public/images/exams/YYYY-MM/`
- Image paths in JSON must use `/images/exams/...`
- Keep exam JSON compatible with `types/exam.ts`
- Prefer importing new exams via `scripts/import_exam_pdf.py`, not by hand

## Auth And Access Rules

- Supabase is used for auth and persistence
- Only emails in `allowed_users` should be able to use the app fully
- Unknown emails may create rows in `access_requests`
- Do not re-open unrestricted signup behavior
- `ADMIN123` is a development-only shortcut and must remain development-only

## Environment Variables

Expected in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never commit `.env.local`.

## Database Notes

Main SQL setup lives in:

- `supabase/user_exam_progress.sql`

Current tables expected:

- `user_exam_progress`
- `allowed_users`
- `access_requests`

## Development Workflow

Run locally:

```bash
npm run dev
```

Validate before finishing work:

```bash
npm run lint
npm run build
```

## Code Change Guidelines

- Preserve automatic exam discovery
- Avoid reintroducing hardcoded `examMap` lists
- Keep UI changes consistent with existing layout unless explicitly redesigning
- Prefer small, composable changes over broad rewrites
- Keep new logic in `lib/` or route handlers instead of bloating page components

## Git And Repo Hygiene

- Do not commit `node_modules/` or `.next/`
- Do not commit temporary extraction folders
- Be careful with source PDFs if repo visibility changes

## If Adding New Features

- Progress/history features should build on Supabase persistence
- Dashboard features should derive from stored attempts, not transient local state
- Admin workflows should prefer simple internal tooling over manual SQL when practical
