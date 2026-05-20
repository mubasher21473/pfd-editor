# Software Requirements Specification — PDF Object Editor

## 1. Product Vision

**Tagline:** *Precision PDF object editing without rasterization.*

**One-liner:** A web tool that lets users select individual text, path, and image objects inside a PDF and edit their content, color, position, and size — all without converting the document to images or losing vector fidelity.

## 2. The Niche

### Problem (validated by Stack Overflow, Reddit, Product Hunt)

Existing PDF editing tools fall into two broken categories:

| Category | Examples | Failure |
|----------|----------|---------|
| Enterprise suites | Adobe Acrobat Pro DC, Foxit PDF Editor | Expensive ($25+/mo), heavy, slow for granular object-level edits |
| Free converters | Gimp, Inkscape, Scribus, LibreOffice | Import PDF as **raster image** (Gimp/Inkscape) or **mangle fonts/layout** (Scribus/LibreOffice) when re-exporting |
| Developer libraries | pikepdf, pdf-lib, pdfbox | Powerful but no UI — require programming |

Real user complaints (from Stack Overflow):

> *"I want to change the color of all text and paths with a specific color in a PDF, or delete them, but no free tools satisfy me."*
>
> *"Existing tools import PDFs as images, and Scribus/LibreOffice mess up fonts when importing text."*
>
> *"Many PDF tools manage pages, but **none can manipulate objects like text boxes and paths directly** while preserving settings."*

### Our Angle

**Non-destructive, object-level PDF editing** — you pick individual PDF objects (text, paths, images) by clicking on them, edit their properties (content, color, font, position, size), and export a still-vector PDF with your changes applied — **without** rasterizing the rest of the document.

### Target Audiences

| Persona | Use Case | Key Need |
|---------|----------|----------|
| **Graphic Designer** | Redline PDF proofs, swap placeholder text, recolor vector elements | Object selection + color/font editing without losing vector quality |
| **Technical Writer** | Edit text in PDF documentation, fix typos before final release | Precise text replacement preserving font and layout |
| **Legal Professional** | Redact sensitive text objects, highlight specific paragraphs | Object-level deletion/redaction (not just white rectangles) |
| **Academic** | Edit figure captions in published papers, correct minor text errors | Quick inline text editing without expensive tools |
| **Developer** | Automate PDF object manipulation via API (CI/CD pipelines) | Programmatic edit operations with predictable output |

### Differentiators vs Competitors

| Competitor | Weakness | Our Advantage |
|------------|----------|---------------|
| Adobe Acrobat Pro | $25/mo, no batch object-level ops, slow startup | Free tier, batch edit, lightweight web UI |
| Foxit PDF Editor | $15/mo, desktop-only, complex UI | Browser-based, zero install, API-first |
| Gimp / Inkscape | Rasterizes PDF, loses text/searchability | Preserves PDF structure, keeps text selectable |
| pikepdf / pdf-lib | No UI, requires coding | Visual object selection + code-free editing |
| Canva PDF editor | Cloud-only, limited PDF fidelity, exports as image | Native PDF output, vector fidelity preserved |

## 3. MVP Features (v1.0)

### Must-Have (P0)

Feature | Backend | Frontend | Status
--------|---------|----------|-------
FR-1: PDF Upload + validation | ✅ `POST /files/upload` validates header + size, stores in MinIO | ✅ DropZone with drag/drop + progress | Done
FR-2: PDF Parse (text objects) | ✅ Celery task, pdfminer.six extraction, persists to DB | ✅ Poll parse status, show banner | Done
FR-3: PDF Rendering in Browser | ✅ `GET /files/{id}/content` streams PDF bytes | ✅ PDF.js canvas render with zoom + page nav | Done
FR-4: Object Tree Retrieval | ✅ `GET /objects/{file_id}` returns typed objects with bbox/font/color | ✅ Objects loaded into store | Done
FR-5: Text Object Selection | — | ✅ Click-to-select with visual highlight | Done
FR-6: Inline Text Editing | ✅ `POST /edits/{file_id}` persists replace_text ops | ✅ Double-click → textarea → Apply → optimistic update | Done
FR-7: Property Panel | — | Requires wiring | **To build**
FR-8: Color Editing | ✅ `set_fill_color` op schema exists | Requires UI | **To build**
FR-9: Font Size Editing | ✅ `set_font_size` op schema exists | Requires UI | **To build**
FR-10: Undo / Redo | — | Store fields exist, need wiring | **To build**
FR-11: Export Modified PDF | ✅ `POST /export/{file_id}` → Celery task → pikepdf replay → download URL | ✅ Export button + poll + download link | Done
FR-12: Move / Resize Objects | ✅ `move` op, `resize` op schemas exist | Requires drag handles | **To build**

### Should-Have (P1)

- FR-13: Image object replacement
- FR-14: Path object color editing (fill + stroke)
- FR-15: Object deletion / hiding
- FR-16: Bulk edit (select multiple objects → apply color/position change)
- FR-17: Search/filter objects by text content

### Nice-to-Have (P2)

- FR-18: Text formatting toolbar (bold, italic, font family)
- FR-19: Page reordering / deletion
- FR-20: Real-time collaborative editing
- FR-21: OCR for scanned PDFs (out of scope v1 — non-goal)

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | PDF upload time (10 MB) | < 5s on typical connection |
| NFR-2 | Parse time (50-page text PDF) | < 30s |
| NFR-3 | Export time (50-page, 10 edits) | < 15s |
| NFR-4 | API response time (object retrieval) | < 500ms P95 |
| NFR-5 | Frontend time-to-interactive | < 3s on fast connection |
| NFR-6 | Max file size (free tier) | 10 MB |
| NFR-7 | Max file size (pro tier) | 50 MB |
| NFR-8 | Browser support | Chrome, Firefox, Safari (latest 2 versions) |

## 5. Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Next.js 15  │────▶│  FastAPI      │────▶│  Celery Worker  │
│  (Frontend)   │     │  (API)        │     │  (parse/export) │
└─────────────┘     └──────┬───────┘     └───────┬────────┘
                           │                     │
                    ┌──────▼───────┐     ┌───────▼────────┐
                    │  PostgreSQL   │     │  MinIO (S3)    │
                    │  (Metadata)   │     │  (PDF Storage) │
                    └──────────────┘     └────────────────┘
```

**Data flow:** Upload → MinIO → Celery parse → DB objects → Edit ops → Celery export → MinIO → Download

## 6. API Endpoints

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| POST | `/api/v1/files/upload` | Upload PDF | ✅ |
| GET | `/api/v1/files` | List user files | ✅ |
| GET | `/api/v1/files/{id}` | File detail | ✅ |
| DELETE | `/api/v1/files/{id}` | Delete file | ✅ |
| GET | `/api/v1/files/{id}/content` | Stream raw PDF | ✅ |
| GET | `/api/v1/objects/{file_id}` | Get parsed objects | ✅ |
| POST | `/api/v1/edits/{file_id}` | Save edit operations | ✅ |
| POST | `/api/v1/export/{file_id}` | Trigger export | ✅ |
| GET | `/api/v1/export/{id}/status` | Poll export status | ✅ |

## 7. Success Metrics

- **Weekly active users** using the editor (> 30 min of edit time)
- **Average edit-to-export time** < 2 min per PDF
- **Export success rate** > 95% (edits applied without corruption)
- **Free → Pro conversion** > 3%
- **NPS** > 40

## 8. Constraints

- Frontend: Next.js 15, TypeScript, Tailwind, shadcn/ui, Zustand, React Konva (future)
- Backend: FastAPI, SQLAlchemy async, Alembic, Celery, pikepdf, pdfminer.six
- Storage: S3-compatible (MinIO local, R2/CloudFlare production)
- Auth: JWT (NextAuth frontend, python-jose backend)
- Billing: Stripe
- Monorepo: pnpm workspaces
