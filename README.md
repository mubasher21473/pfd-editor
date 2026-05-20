# PDF Object Editor

Production-ready SaaS monorepo for object-level PDF manipulation.

## Monorepo Structure

- `apps/web`: Next.js 14 frontend
- `apps/api`: FastAPI backend
- `packages/shared-types`: shared TypeScript package
- `docker`: local infrastructure (Postgres, Redis, MinIO)
- `docs`: SRS and architecture docs

## MVP Scope

- Authentication and user identity
- Upload and manage PDF files
- Parse and inspect object-level PDF content
- Apply object-level edits and export modified PDFs
- Subscription gating and billing integration

## Non-goals for v1

- Real-time collaborative editing
- OCR-heavy document understanding workflows
- Plugin marketplace and third-party extension SDK

## Local Development

1. Start infra:
   - `docker compose -f docker/docker-compose.yml up -d`
2. Frontend:
   - `cd apps/web && pnpm install && pnpm dev`
3. Backend:
   - `cd apps/api && python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt -r requirements-dev.txt`
   - `uvicorn app.main:app --reload`
4. Worker:
   - `cd apps/api && celery -A app.tasks.celery_app.celery_app worker -l info`

## Testing & Quality

- Backend lint: `cd apps/api && ruff check .`
- Backend type-check: `cd apps/api && mypy app`
- Backend tests: `cd apps/api && pytest --cov=app --cov-report=xml`
- Frontend lint: `cd apps/web && pnpm lint`
- Frontend type-check: `cd apps/web && pnpm type-check`
- Frontend build: `cd apps/web && pnpm build`

## Deployment

- Frontend: Vercel
- Backend + worker: Railway or Render
- CI and deploy workflows in `.github/workflows`
