# PDF Object Editor Feature Plan

This plan is only for the local MVP feature flow:

1. Upload a PDF.
2. Parse PDF objects.
3. Inspect objects in the editor.
4. Edit selected objects.
5. Export the edited PDF.

Everything outside this flow is intentionally excluded from this plan.

## Current State

The full upload→parse→inspect→edit→export pipeline is working end-to-end.

Backend current state:

- `POST /api/v1/files/upload` validates PDF header + size, persists `PdfFile` row, uploads to MinIO, enqueues Celery parse task.
- `GET /api/v1/files` returns all files for the authenticated user from the database.
- `DELETE /api/v1/files/{file_id}` deletes the database row and removes the file from storage.
- `GET /api/v1/files/{id}/content` streams the raw PDF bytes from MinIO.
- Parse Celery task downloads PDF from storage, extracts text objects (bbox, font, color) via pdfminer.six, and extracts path colors (fill + stroke) and image XObject names. Persists `PdfObject` rows, updates `parse_status`.
- `GET /api/v1/objects/{file_id}` returns the full typed object tree (text, path, image) with bbox, font, fill/stroke color, and raw_attrs.
- `POST /api/v1/objects/{file_id}/upload-image` accepts a multipart image upload and stores it in MinIO for later use in a `replace_image` op.
- `POST /api/v1/edits/{file_id}` validates and persists `BulkEditIn` operations: `replace_text`, `set_font_size`, `set_fill_color`, `set_stroke_color`, `move`, `resize`, `hide`, `delete`, `replace_image`.
- `POST /api/v1/export/{file_id}` creates an `Export` row and enqueues Celery export task.
- Export Celery task replays edit operations through `PdfEditorService` (pikepdf), pre-loads replacement image bytes for `replace_image` ops, uploads output PDF, returns a presigned download URL.

Frontend current state:

- Dashboard: drag-drop upload with progress, file list with parse-status polling, delete action.
- Editor loads file metadata + parsed objects and sets up the PDF.js canvas render.
- PDF.js renders the active page with zoom and page navigation controls.
- Parsed objects (text, path, image) render as interactive overlays on top of the canvas.
- Click selects an object; double-click opens inline text editing.
- Selected objects can be dragged to move (real-time visual feedback) or resized via a corner handle.
- Keyboard Delete/Backspace deletes all selected objects.
- Property Panel shows text, font-size, fill-color, stroke-color (path/image), and image-replacement controls for the selected object. Multi-select shows bulk fill-color change.
- Toolbar: undo/redo (50-step history), Save (posts pending edits to API), Export (polls status, shows Download link).

What is not yet implemented:

- Auth hardening: real JWT lookup (dev bypass is still active).
- Stripe billing and subscription tier enforcement.
- Landing page, onboarding flow, and deployment pipeline.

## Feature Flow

The product is complete for this plan when this works locally:

`upload -> parse -> inspect -> edit -> export`

## Phase 1: Upload

Goal: a user can upload a PDF and see it listed in the dashboard.

Backend tasks:

1. Implement real file upload in `apps/api/app/api/v1/files.py`.
2. Validate the uploaded file is a PDF.
3. Create a `PdfFile` database row.
4. Store the uploaded PDF through `StorageService`.
5. Return file metadata: id, original name, size, parse status, created timestamp.
6. Implement `GET /api/v1/files` from the database.
7. Implement `DELETE /api/v1/files/{file_id}` from the database and storage.

Storage tasks:

1. Replace the `StorageService` stub with local MinIO/S3-compatible upload, download, delete, and URL helpers.
2. Use predictable keys such as `files/{file_id}/source.pdf`.

Frontend tasks:

1. Replace static `DropZone` with real drag/drop and file picker upload.
2. Show upload progress and errors.
3. Fetch and display uploaded files on the dashboard.
4. Add a delete action for files.
5. Link uploaded files to the editor page.

Done when:

- A PDF can be uploaded from the dashboard.
- The uploaded file appears in the file list.
- The file record exists in the database.
- The original PDF exists in storage.
- A listed file can be deleted.

## Phase 2: Parse

Goal: uploaded PDFs are parsed into object records.

Backend tasks:

1. Configure Celery to use `REDIS_URL`.
2. Enqueue `parse_pdf_task` after upload.
3. Implement `parse_pdf_task`.
4. Download the source PDF from storage inside the task.
5. Parse text objects first with page index, text content, coordinates, font name, and font size where available.
6. Add path and image object extraction after text parsing works.
7. Save parsed objects in `pdf_objects`.
8. Update `PdfFile.parse_status` to `processing`, `parsed`, or `failed`.
9. Save page count on `PdfFile` when available.

Parser tasks:

1. Implement `PdfParserService.parse`.
2. Return normalized object dictionaries that match the backend schema.
3. Preserve raw attributes needed later for editing/export.
4. Add sample PDFs for parser checks.

Frontend tasks:

1. Show parse status in the dashboard file list.
2. Poll file status after upload until parsed or failed.
3. Disable editor entry or show a pending state while parsing.

Done when:

- Upload starts a parse job.
- Parse status changes from pending/processing to parsed.
- Parsed objects are persisted in the database.
- At least text objects are available for a sample PDF.

## Phase 3: Inspect

Goal: a user can open a parsed PDF and inspect its objects visually.

Backend tasks:

1. Implement `GET /api/v1/objects/{file_id}` from persisted objects.
2. Return file id, page metadata, and object list.
3. Include object fields needed by the frontend:
   - id
   - page index
   - object type
   - x/y/width/height
   - text content
   - fill color
   - stroke color
   - font name
   - font size
   - raw attrs
4. Add basic filters only if needed for the editor:
   - page
   - object type
   - text search

Frontend tasks:

1. Load file objects in `apps/web/src/app/(dashboard)/editor/[fileId]/page.tsx`.
2. Implement PDF.js rendering in `usePdfRenderer`.
3. Render the active PDF page in `EditorCanvas`.
4. Render object overlays on top of the PDF page.
5. Implement page thumbnails or simple page navigation.
6. Implement object selection.
7. Show selected object details in `PropertyPanel`.
8. Add object filtering in `FilterPanel` if object volume requires it.

Done when:

- Opening a parsed file shows the PDF page.
- Text/path/image overlays are visible where parsed data exists.
- Clicking an overlay selects the object.
- The property panel shows selected object data.

## Phase 4: Edit

Goal: selected objects can be modified and saved.

Backend tasks:

1. Define supported edit operation schemas.
2. Implement edit validation in `POST /api/v1/edits/{file_id}`.
3. Verify target objects exist for the file.
4. Persist edit operations in `edit_operations`.
5. Return saved operation ids and updated object preview data if available.

Supported MVP operations:

1. Text object:
   - replace text
   - change font size
   - change fill color
   - move
2. Path object:
   - change fill color
   - change stroke color
   - move
3. Image object:
   - move
   - resize
4. Bulk operation:
   - apply color or move operation to multiple selected objects.

Frontend tasks:

1. Expand `editorStore` to track:
   - current file id
   - loaded objects
   - selected object ids
   - pending operations
   - undo stack
   - redo stack
   - save status
2. Implement editable controls in `PropertyPanel`.
3. Implement bulk edits in `BulkActionBar`.
4. Implement toolbar actions:
   - apply/save
   - undo
   - redo
   - zoom
5. Apply edits optimistically in the canvas.
6. Roll back local state if save fails.

Done when:

- A selected text object can be changed and saved.
- A selected object can be moved and saved.
- A color edit can be saved where supported.
- Bulk edit works for multiple selected objects.
- Saved operations exist in the database.

## Phase 5: Export

Goal: saved edits can be applied to the original PDF and downloaded.

Backend tasks:

1. Change `POST /api/v1/export/{file_id}` to create an export job.
2. Add an export status response with:
   - export id
   - status
   - download URL when complete
3. Implement `export_pdf_task`.
4. Download the original PDF from storage.
5. Load saved edit operations in order.
6. Apply operations through `PdfEditorService`.
7. Validate the output PDF is readable and non-empty.
8. Upload the exported PDF to storage.
9. Return or expose a download URL.

PDF editing tasks:

1. Implement `PdfEditorService.apply_operations`.
2. Start with text replacement and simple coordinate/color changes where feasible.
3. Preserve the original PDF structure as much as possible.
4. Make unsupported operations fail clearly instead of silently producing wrong output.

Frontend tasks:

1. Add export button to `Toolbar`.
2. Trigger export for the current file.
3. Show export progress.
4. Poll export status if export is async.
5. Show download/open action when export is complete.
6. Show export failure message if export fails.

Done when:

- A user can click export after saving edits.
- An edited PDF is generated.
- The exported PDF can be downloaded.
- The exported PDF opens in a PDF viewer.

## Build Order

1. File upload backend.
2. Storage implementation.
3. Dashboard upload and file list.
4. Parse task and parser service.
5. Object retrieval endpoint.
6. Editor data loading.
7. PDF rendering and object overlays.
8. Object selection and property panel.
9. Edit operation validation and persistence.
10. Canvas optimistic edit updates.
11. Export endpoint and export task.
12. Frontend export flow.

## Immediate Next Tasks

Start here:

1. Implement storage upload/download/delete for local MinIO.
2. Implement real `POST /api/v1/files/upload`.
3. Implement real `GET /api/v1/files`.
4. Wire dashboard upload to the API.
5. Configure Celery with Redis.
6. Implement text-object parsing and persistence.

