# PDF Object Editor

SaaS platform for granular editing of PDF content at the object level (text, paths, images) using Next.js, FastAPI, pikepdf, S3/R2, Stripe, and more.

This monorepo is scaffolded for production SaaS development with pnpm workspaces and Python best practices.

## Structure

- `apps/web`: Next.js 14 frontend (TypeScript, App Router)
- `apps/api`: FastAPI backend (Python 3.11+)
- `packages/shared-types`: (optional) Shared TypeScript types
- `docker/`: Compose services (Postgres, Redis, Minio)
- `docs/`: Specs and architecture

## Local Setup

1. `docker compose -f docker/docker-compose.yml up -d`
2. `pnpm install`
3. `pnpm --filter web dev` (frontend)
4. `cd apps/api && uvicorn app.main:app --reload` (backend)

For details, see the SRS and architecture documentation.
