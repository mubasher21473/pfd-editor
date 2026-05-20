# AGENTS.md — PDF Object Editor

## Monorepo structure

```
apps/web/       Next.js 15 frontend (pnpm, Tailwind, shadcn/ui, Konva, Zustand, NextAuth)
apps/api/       FastAPI backend (SQLAlchemy async, Alembic, Celery, pikepdf, pdfminer.six)
packages/shared-types/   Shared TS types (only exports SubscriptionTier currently)
docker/         Postgres 16, Redis 7, MinIO (S3-compatible) for local dev
```

- `apps/api/app/main.py` — FastAPI entrypoint, mounts router at `/api/v1`, CORS, `/health`
- `apps/web/src/app/page.tsx` — landing page (static), route groups: `(auth)`, `(dashboard)`, `(billing)`
- `apps/web/src/lib/api.ts` — single `apiFetch<T>()` wrapper around fetch with token/Bearer header

## Quickstart

```bash
# One-time setup (copies .env, installs deps, starts infra)
pnpm setup

# Start all dev servers (API + worker + frontend)
pnpm dev        # infra must already be running
pnpm dev:all    # includes infra in foreground
```

## Commands

| Scope | Action | Command |
|-------|--------|---------|
| backend lint | Ruff | `cd apps/api && ruff check .` |
| backend typecheck | mypy strict | `cd apps/api && mypy app` |
| backend test | pytest | `cd apps/api && pytest --cov=app --cov-report=xml` |
| frontend lint | Next lint | `cd apps/web && pnpm lint` |
| frontend typecheck | tsc --noEmit | `cd apps/web && pnpm type-check` |
| frontend build | Next build | `cd apps/web && pnpm build` |
| root lint | pnpm recursive | `pnpm lint` (aliased to web lint) |
| Alembic migration | cd apps/api | `alembic upgrade head` |

**Test env:** `conftest.py` sets env defaults. Requires Postgres running (docker compose). pytest in `asyncio_mode=auto` mode. Tests use `TestClient` (httpx).

## Current state (real pipeline)

Core upload→parse→inspect→edit→export pipeline is implemented:
- **Celery** — broker/backend wired to `REDIS_URL` in `app/tasks/celery_app.py`
- **Storage** — `StorageService` uses real boto3 against MinIO (put, get, delete, presigned URLs)
- **Upload** (`POST /files/upload`) — validates PDF header + size, persists `PdfFile` row, uploads to MinIO, enqueues Celery parse task
- **Parse task** — sync session, downloads from storage, runs `PdfParserService` (pdfminer.six text extraction), persists `PdfObject` rows, sets `parse_status`
- **Object retrieval** (`GET /objects/{file_id}`) — returns typed object tree with bbox, font, color, text fields
- **Edit ops** (`POST /edits/{file_id}`) — typed `BulkEditIn` schema with operation validation, persists `EditOperation` rows
- **Export** (`POST /export/{file_id}` + `GET /export/{export_id}/status`) — creates `Export` row, enqueues Celery export task that replays edits via `PdfEditorService` (pikepdf), uploads result, returns presigned download URL
- **Auth dev bypass** — `get_current_user` auto-provisions a dev user (`dev@localhost`) when no token is present in development mode

What's placeholder: frontend screens, auth/me real lookup, detailed error types, pagination/filters on objects, full operation replay in editor service.

The SRS coverage matrix in `docs/IMPLEMENTATION_PLAN.md` tracks every requirement's status.

## What needs work next

Frontend is the biggest gap — the dashboard and editor still render static placeholders. Wire them to the real API endpoints.

## Key conventions

- **Backend**: FastAPI async routes, SQLAlchemy async sessions, `sessionmaker` from `app/db/session.py`
- **Models**: SQLAlchemy declarative `Base` in `app/models/base.py`. Alembic migrations in `app/db/migrations/`
- **DB schema source of truth**: `docker/postgres/init.sql` and Alembic should be aligned. Currently both exist — `init.sql` bootstraps Postgres on first start
- **API versioning**: all routes under `/api/v1/`, router in `app/api/router.py`
- **Frontend path alias**: `@/` maps to `src/` (tsconfig paths)
- **Frontend stores**: Zustand in `src/store/` (editorStore, userStore)
- **Package manager**: pnpm 9, frozen lockfile in CI (`pnpm install --frozen-lockfile`)
- **Ruff**: line-length 100, select `E,F,I,N,UP`
- **mypy**: strict mode, some modules ignored (`app.tasks.*`, `app.db.migrations.*`, `app.config`, `app.core.security`, `app.services.*`)

## Data models (for quick reference)

- **User**: id(UUID), email, hashed_password, tier(free|pro|team), provider, stripe_customer_id, upload counters
- **PdfFile**: id, user_id(FK), original_name, s3_key, file_size_bytes, page_count, parse_status(pending|processing|parsed|failed)
- **PdfObject**: id, file_id(FK), page_index, object_type(text|path|image|form_xobject), bbox(x,y,w,h), colors, font data, text_content, raw_attrs(JSONB)
- **EditOperation**: id, file_id(FK), user_id(FK), operation(JSONB), applied_at
- **Export**: id, file_id(FK), s3_key, status(pending|processing|done|failed), download_url, expires_at

## Deployment (stub)

- Web → Vercel, API/Worker → Railway/Render. CI in `.github/workflows/ci.yml`. Deploy workflow is a placeholder.

## Docs (read these)

- `docs/SRS.md` — functional/non-functional requirements
- `docs/IMPLEMENTATION_PLAN.md` — phased delivery plan, SRS coverage matrix, milestones, immediate next tasks
- `docs/architecture.md` — high-level architecture and data flow
