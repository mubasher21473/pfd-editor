# PDF Object Editor Implementation Plan

This plan is based on `docs/SRS.md`, `docs/architecture.md`, and the current codebase state on 2026-05-20.

## Current Priority

The immediate focus is development, not production hardening.

For now, the main goal is to make the core product work locally:

1. Upload a PDF.
2. Parse and persist PDF objects.
3. Inspect objects in the editor.
4. Submit object-level edits.
5. Export and download an edited PDF.

Production concerns such as Stripe billing, CI hardening, deployment readiness, advanced observability, and strict entitlement enforcement are intentionally deferred unless they are needed to keep the local development flow moving.

## Current State Summary

The repository has the intended monorepo shape and most module names are already present:

- `apps/web`: Next.js app with auth, dashboard, upload, editor, and billing route scaffolds.
- `apps/api`: FastAPI app with route, schema, model, service, Celery, migration, and test scaffolds.
- `packages/shared-types`: currently only exports `SubscriptionTier`.
- `docker`: Postgres, Redis, and MinIO local infrastructure.
- `.github/workflows`: CI and deployment workflow skeletons.

The implementation is currently mostly placeholder behavior:

- API endpoints return static data and do not persist real records.
- Auth token verification exists as a helper, but route-level auth and user lookup are not wired.
- Storage, Stripe, parser, editor, exporter, and Celery task services are stubs.
- Frontend screens render static placeholders and do not perform the full upload, inspect, edit, export flow.
- Tests mostly verify placeholder HTTP success responses.

## SRS Coverage Matrix

| Requirement | Current Status | Gap |
| --- | --- | --- |
| FR-1 Auth and `/me` | Partial scaffold | `/auth/me` returns `{"status":"todo"}`; no persisted user profile lookup or frontend session bridge. |
| FR-2 Upload under tier constraints | Stub | Upload returns filename only; no auth, file validation, tier policy, storage, DB row, or parse job. |
| FR-3 List/delete owned files | Stub | List returns `[]`; delete returns input id; no ownership check, DB, storage delete, or cascade behavior. |
| FR-4 Retrieve parsed object data | Stub | Returns empty object list; parser and persistence not implemented. |
| FR-5 Submit single/bulk edits | Stub | Accepts generic dicts; no operation validation, ownership check, object validation, persistence, or editor state handling. |
| FR-6 Export and download URL | Stub | Returns example URL; no export job, output persistence, signed URL, status endpoint, or failure handling. |
| FR-7 Stripe webhook entitlement updates | Deferred | Webhook signature helper exists, but billing is not part of the current development-first MVP. |
| NFR-1 JSON schema consistency | Partial | Pydantic schemas exist but routes do not consistently use them. |
| NFR-2 Async parse/export jobs | Partial scaffold | Celery app exists but has no broker config and tasks only echo ids. |
| NFR-3 Structured logging/failures | Partial scaffold | Logging/exceptions modules exist but are not integrated into route/task paths. |
| NFR-4 Tier policy enforcement | Deferred | Keep only simple local file-size guards for now; full free/pro/team policy comes later. |
| NFR-5 CI lint/type/test/build | Later | Basic local checks matter now; CI hardening is deferred. |

## Delivery Plan

### Phase 0: Development Contract Baseline

Goal: lock down the API/frontend contract before implementing feature logic.

Tasks:

1. Define canonical API response models.
   - Expand backend schemas for users, files, objects, edits, exports, errors, and job status.
   - Add matching TypeScript types in `packages/shared-types` or `apps/web/src/types`.
   - Normalize naming between backend `page_index`/`object_type` and frontend `pageIndex`/`objectType`.

2. Define supported edit operations.
   - Text: replace text, set font size, set fill color, move, hide/delete.
   - Path: set fill color, set stroke color, move, hide/delete.
   - Image: replace image, move, resize, hide/delete.
   - Bulk: apply one operation to multiple object ids.

3. Define status values.
   - File parse status: `pending`, `processing`, `parsed`, `failed`.
   - Export status: `pending`, `processing`, `done`, `failed`.
   - Edit validation result: accepted/rejected with structured errors.

Acceptance checks:

- OpenAPI docs show response/request schemas for every route.
- Frontend imports or mirrors the same field names and enums.
- Tests fail when an unsupported operation or invalid status is used.

### Phase 1: Backend Foundation

Goal: make the API capable of real local-development persistence.

Tasks:

1. Database setup.
   - Verify SQLAlchemy models match Alembic migration column types and enum names.
   - Add missing relationships if useful for queries.
   - Add `updated_at` handling where needed.
   - Decide whether `docker/postgres/init.sql` remains a bootstrap helper or migrations become the only schema source.

2. Session and repository helpers.
   - Create small query helpers for user, file ownership, object lookup, edit operations, and exports.
   - Use `AsyncSession` consistently in routes and tasks.
   - Add transaction boundaries for upload, delete, edit submission, and export creation.

3. Auth integration.
   - Add a development-friendly current-user path so core features can be built without waiting on final auth.
   - Wire `get_current_user` into protected routes where it does not slow the local MVP.
   - Load or provision the `User` row from JWT subject and email claims when auth is available.
   - Implement `/api/v1/auth/me` to return `UserOut`.
   - Add focused tests for the chosen development auth path.

4. Error and logging baseline.
   - Add simple consistent JSON errors for not found, validation, and background job failure states.
   - Add enough logging to debug upload, parse, edit, and export failures locally.

Acceptance checks:

- A valid token can retrieve `/auth/me`.
- Ownership checks prevent one user from reading or changing another user's files.
- `ruff`, `mypy`, and backend tests pass.

### Phase 2: Storage and File Pipeline

Goal: implement upload, list, delete, parse job creation, and object persistence.

Tasks:

1. Storage service.
   - Replace `StorageService` stub with boto3 S3/R2/MinIO implementation.
   - Implement upload, download, delete, and presigned URL generation.
   - Use deterministic keys such as `users/{user_id}/files/{file_id}/source.pdf`.
   - Add unit tests with mocked S3 client.

2. Tier policy service.
   - For development, implement only a simple max file size check if needed to prevent very large local uploads.
   - Defer monthly upload counters and free/pro/team enforcement to the billing/backlog phase.

3. Upload endpoint.
   - Validate content type and PDF header.
   - Enforce tier limits before upload.
   - Create `PdfFile` DB row with `pending` or `processing` status.
   - Upload original bytes to storage.
   - Enqueue parse job.
   - Return file id, parse status, original name, size, and created timestamp.

4. File list/delete endpoints.
   - List only owned files with parse status and metadata.
   - Delete owned files from storage and DB.
   - Handle missing storage objects without failing DB cleanup.

5. Parse task.
   - Configure Celery broker/backend from `REDIS_URL`.
   - Download source PDF from storage.
   - Parse objects and page count.
   - Persist `PdfObject` rows.
   - Update file status to `parsed` or `failed`.
   - Make task retryable for transient storage/parser errors.

6. Parser implementation.
   - Use `pdfminer.six` for text extraction with coordinates.
   - Use `pikepdf` for object and stream-level metadata where possible.
   - Capture paths/images as best-effort metadata in MVP.
   - Store raw attrs needed for later editing/export.

Acceptance checks:

- Upload creates a DB row and storage object.
- Parse task populates object rows for a sample PDF.
- List shows uploaded file and parse status.
- Delete removes the DB record and storage payload.
- Local file size guard works if enabled.

### Phase 3: Object Retrieval and Filtering

Goal: return useful object data for the editor.

Tasks:

1. Object endpoint.
   - Require auth and file ownership.
   - Support pagination or page filtering for large PDFs.
   - Support filters by object type, fill color, stroke color, font name, font size, and text search.
   - Return page dimensions if available.

2. Object schema enrichment.
   - Include id, page index, type, bounding box, colors, font data, text content, and raw attrs.
   - Include object tree grouping by page for frontend convenience.

3. Query performance.
   - Keep existing indexes and add indexes if filters require them.
   - Avoid returning heavy raw streams by default.

Acceptance checks:

- Object retrieval returns persisted objects for an uploaded parsed file.
- Unauthorized users cannot access another user's objects.
- Filters return expected subsets in tests.

### Phase 4: Edit Submission and History

Goal: validate and persist object-level edit operations.

Tasks:

1. Operation validation.
   - Replace generic dict validation with typed operation schemas.
   - Verify referenced object ids belong to the file and user.
   - Validate operation compatibility by object type.
   - Validate values such as colors, coordinates, font size, image payload references, and bulk target lists.

2. Edit persistence.
   - Store operations in `edit_operations` with user id, file id, operation JSON, and timestamps.
   - Consider adding sequence/order column so export replay is deterministic.
   - Add undo/redo support at API or frontend state level; for MVP, persisted operations can be append-only.

3. Frontend history model.
   - Expand `editorStore` to track loaded file, objects, selected ids, staged operations, undo/redo stacks, save status, and export status.
   - Implement optimistic UI updates with rollback on failed submission.

Acceptance checks:

- Invalid operations are rejected with structured errors.
- Valid single and bulk operations are persisted in order.
- Frontend can select objects, change a property, submit the edit, and see updated local state.

### Phase 5: Export Pipeline

Goal: apply saved edit operations and generate downloadable PDFs.

Tasks:

1. Export endpoint.
   - Require auth and ownership.
   - Create an `Export` row in `pending` state.
   - Enqueue export task and return export id/status.
   - Add export status endpoint such as `GET /api/v1/export/{export_id}`.
   - Return presigned download URL only when export is done.

2. PDF editor/exporter implementation.
   - Download original PDF.
   - Replay persisted operations in deterministic order.
   - Apply MVP modifications with `pikepdf` where feasible.
   - Validate generated PDF is non-empty and readable.
   - Upload result to storage key such as `users/{user_id}/files/{file_id}/exports/{export_id}.pdf`.

3. Failure handling.
   - Mark export failed with a failure reason.
   - Log traceable errors.
   - Let frontend show failed and retry states.

Acceptance checks:

- Export task creates a downloadable PDF for a sample edited file.
- Download URL expires and is generated from storage service.
- Failed exports are visible through status endpoint.

### Phase 6: Frontend Product Flow

Goal: turn current placeholder screens into the MVP user journey.

Tasks:

1. Auth/session flow.
   - Configure NextAuth provider(s) and session callbacks.
   - Ensure API token is available to `apiFetch`.
   - Protect dashboard and editor routes only as much as needed for local development.
   - Show useful unauthenticated and error states.

2. Dashboard.
   - Implement drag/drop and file picker upload using `react-dropzone`.
   - Show upload progress, policy errors, parse status, and retry affordances.
   - Fetch and display owned files.
   - Add delete action with confirmation.
   - Link parsed files to editor.

3. Editor data loading.
   - Load file metadata and objects by file id.
   - Render loading, empty, parse pending, parse failed, and not found states.
   - Poll parse status when file is still processing.

4. PDF rendering and overlays.
   - Implement PDF.js page rendering in `usePdfRenderer`.
   - Render object overlays with Konva or equivalent.
   - Support page thumbnails and active page navigation.
   - Keep coordinate transforms accurate between PDF space and canvas space.

5. Selection and property editing.
   - Implement click, multi-select, rectangle select, and object hover.
   - Populate property panel from selected object(s).
   - Enable type-specific controls for text, paths, and images.
   - Implement bulk action bar for shared properties.

6. Toolbar and export.
   - Add save/apply, undo, redo, zoom, page navigation, and export controls.
   - Trigger export, poll status, and open/download the completed file.
   - Keep buttons disabled when action is not valid.

Acceptance checks:

- User can upload a PDF from dashboard.
- User can open parsed file in editor.
- User can inspect/select objects and submit an edit.
- User can export and download the edited PDF.
- UI handles loading, error, empty, pending, and permission states.

### Phase 7: Development Quality Pass

Goal: make the local MVP stable enough to continue feature development without wasting time on production infrastructure.

Tasks:

1. Backend behavior tests.
   - Replace placeholder endpoint tests for the core path: upload, list/delete, object retrieval, edits, and export.
   - Mock storage and Celery enqueue where that keeps tests fast.
   - Add parser/exporter sample PDF fixtures.

2. Frontend sanity checks.
   - Keep TypeScript checks passing.
   - Add only targeted tests if they directly protect the editor or upload flow.
   - Avoid adding a broad frontend testing setup until the UI behavior settles.

3. Local developer workflow.
   - Document exact commands to run Postgres, Redis, MinIO, API, worker, and web.
   - Add seed/sample PDF notes if helpful.
   - Keep `.env.example` files aligned with what local development needs.

Acceptance checks:

- The upload -> parse -> inspect -> edit -> export path has automated backend coverage.
- A developer can run the full stack locally from documented commands.
- Type checks and focused tests pass.

### Deferred: Billing, Entitlements, and Production Hardening

Goal: keep production work visible without letting it consume current development time.

Tasks:

1. Billing and entitlements.
   - Add Stripe checkout session endpoint.
   - Verify Stripe webhooks from raw body and `Stripe-Signature`.
   - Handle subscription lifecycle events.
   - Update user tiers transactionally and idempotently.
   - Add billing status endpoint and frontend upgrade/gating states.

2. Production auth hardening.
   - Finalize provider/session strategy.
   - Enforce unauthenticated/forbidden behavior consistently.
   - Review token claims and user provisioning rules.

3. CI hardening.
   - Validate pnpm cache configuration.
   - Add migrations check.
   - Ensure required test environment variables include production-adjacent config.
   - Consider service containers for Redis and MinIO or mock them at test level.

4. Deployment readiness.
   - Finalize env var documentation for web, API, worker, storage, DB, Redis, and Stripe.
   - Verify CORS origins per environment.
   - Add worker start command and health/runbook notes.
   - Confirm Alembic migration workflow for staging/prod.

Acceptance checks:

- Stripe events update user tier.
- Tier rules apply consistently across backend and frontend.
- CI passes on pull requests.
- Deployment docs list every required secret and command.

## Suggested Build Order

1. Backend auth and DB ownership.
2. Storage service and upload/list/delete.
3. Parse task and object persistence.
4. Object retrieval filters.
5. Edit operation validation and persistence.
6. Export task and status/download flow.
7. Frontend dashboard upload and file list.
8. Frontend editor rendering, selection, editing, and export.
9. Development quality pass for the full local MVP.
10. Billing, entitlement gates, CI hardening, and deployment cleanup later.

## Milestones

### Milestone 1: Local File Pipeline

Scope:

- `/auth/me`
- `/files/upload`
- `/files`
- `/files/{file_id}`
- Storage implementation
- Celery parse enqueue and file parse status

Done when:

- A development user can upload, list, and delete PDFs.
- A simple local file-size guard is enforced if enabled.
- Parse status changes are persisted.

### Milestone 2: Inspectable Parsed PDFs

Scope:

- Parser implementation
- Object persistence
- `/objects/{file_id}` with filters
- Dashboard parse status polling
- Editor object loading

Done when:

- A sample PDF produces text/path/image object metadata.
- The editor can show object overlays for parsed pages.

### Milestone 3: Editable Objects

Scope:

- Typed edit operation schemas
- Edit validation and persistence
- Editor selection, property panel, bulk actions, undo/redo

Done when:

- A user can select objects, modify supported properties, submit edits, and see the result in the editor state.

### Milestone 4: Exportable Edited PDFs

Scope:

- Export create/status/download endpoints
- Export Celery task
- PDF operation replay
- Frontend export polling and download

Done when:

- The full acceptance flow works: upload -> parse -> inspect -> edit -> export.

### Milestone 5: Development Stabilization

Scope:

- Focused backend tests for the core local flow
- Type checks
- Local setup documentation
- Sample PDF fixtures

Done when:

- A developer can run the full MVP locally.
- The core backend path has meaningful test coverage.
- The app is ready for the next feature iteration without production work blocking it.

### Later Milestone: Paid Entitlements and Production Readiness

Scope:

- Stripe checkout and webhooks
- Tier status endpoint
- Frontend upgrade/gating states
- CI/deployment hardening

Done when:

- Stripe events update user tier.
- Tier rules apply consistently across backend and frontend.
- CI and deployment docs are reliable.

## Immediate Next Tasks

Start with these small, concrete tasks:

1. Implement a development-friendly `/api/v1/auth/me` that returns a real `UserOut`.
2. Add backend tests for the current development auth path.
3. Implement real file upload persistence using DB and storage service.
4. Configure Celery with `REDIS_URL` and enqueue parse jobs from upload.
5. Implement parser persistence for text objects first.
6. Replace dashboard placeholder with API-backed file list and upload component.

These tasks create the foundation required by every later milestone.
