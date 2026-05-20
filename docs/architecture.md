# Architecture — PDF Object Editor

## High-level Components
- **Web App (Next.js)**: auth UI, dashboard, editor canvas, billing views.
- **API (FastAPI)**: domain endpoints, auth verification, validation, orchestration.
- **Worker (Celery + Redis)**: background parse/export jobs.
- **Database (Postgres)**: users, files, objects, operations, exports.
- **Object Storage (S3/R2/MinIO)**: source and exported PDFs.
- **Stripe**: checkout and subscription lifecycle events.

## Data Flow
1. User uploads PDF through web app.
2. API stores file metadata and object storage payload.
3. Parse task extracts object metadata and persists to DB.
4. Editor fetches object tree and submits edit operations.
5. Export task applies operations and stores output PDF.
6. API returns signed/public download URL.

## Deployment Topology
- Web: Vercel project.
- API + Worker + Redis + Postgres: Railway/Render managed services.
- Secrets managed via environment variables.

## Reliability & Security
- JWT verification at API boundaries.
- Ownership checks for all file/object/edit/export access.
- Retryable background jobs for parse/export with failure status reporting.
- Structured logs for observability.
