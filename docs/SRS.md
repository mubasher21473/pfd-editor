# Software Requirements Specification (SRS) — PDF Object Editor

## 1. Purpose
PDF Object Editor provides non-rasterized, object-level editing for PDF text, paths, and images.

## 2. Scope
### MVP
- User auth
- PDF upload and listing
- Object tree retrieval
- Object-level edit submission
- Export and download URL generation
- Stripe-backed subscription status and gating

### Non-goals (v1)
- Collaborative real-time editing
- OCR-heavy analysis workflows
- Plugin marketplace

## 2.1 Delivery Epics
- Platform Setup
- Auth
- File Pipeline
- Editor
- Billing
- Ops

## 3. User Roles
- Free user
- Pro user
- Team user
- Admin/operator

## 4. Functional Requirements
- FR-1: Users can authenticate and retrieve profile (`/me`).
- FR-2: Users can upload PDF files under tier constraints.
- FR-3: Users can list and delete owned files.
- FR-4: Users can retrieve parsed object data by file.
- FR-5: Users can submit edit operations (single/bulk).
- FR-6: Users can trigger export and obtain download URLs.
- FR-7: Billing webhook updates user entitlement tier.

## 5. Non-functional Requirements
- NFR-1: API response JSON schema consistency.
- NFR-2: Async processing for parse/export jobs.
- NFR-3: Structured logging and traceable failures.
- NFR-4: Tier-based policy enforcement.
- NFR-5: CI checks for lint, type checks, tests, build.

## 6. Constraints
- Frontend: Next.js 14 + TypeScript + Tailwind + shadcn/ui.
- Backend: FastAPI + SQLAlchemy + Alembic.
- Storage: S3 or R2-compatible endpoint.
- Billing: Stripe.

## 7. Acceptance Criteria
- End-to-end flow succeeds: upload → parse → inspect → edit → export.
- Tier limits enforced for free/pro/team.
- CI passes on pull requests.
