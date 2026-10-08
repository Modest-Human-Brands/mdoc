<p align="center">
  <img src="./public/logo.png" alt="MDoc Logo" width="75" />
</p>

# MDoc

![Landing](public/previews/landing.webp)

> A high-performance, structured document generation and cryptographic signing service designed for automated business deliverables, legal agreements, and contract workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Engine: Bun](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node%2022+-fbf0df?logo=bun)](https://bun.sh)
[![Nitro](https://img.shields.io/badge/Framework-Nitro%20v3-ea580c?logo=nuxt)](https://nitro.unjs.io)
[![PDF Engine](https://img.shields.io/badge/PDF-MuPDF%20%2B%20Vue--PDF-0284c7)](https://mupdf.com)

---

## Overview

**MDoc** is an enterprise-grade document engine built on [Nitro](https://nitro.unjs.io) and [Vue](https://vuejs.org). It bridges the gap between structured business data and court-admissible, cryptographically sealed PDF documents.

Unlike headless browser-based PDF generators that suffer from high memory footprints and unpredictable page splits, MDoc uses declarative, native PDF layout compilation paired with raw byte-level cryptographic signature injection.

### Core Capabilities

- **Declarative PDF Compilation**: Templates built with Vue components via `@ceereals/vue-pdf` compile directly to vector PDF primitives with accurate page wrapping and layout flow.
- **Dual Signing Engine**:
  - **Client Hardware DSC**: Client-side signing via USB tokens, SmartCards, and WebCrypto adhering to Adobe Acrobat-compatible **CMS / PKCS#7** and standard `/ByteRange` padding.
  - **Server-Side P12 Automation**: Automated corporate seal execution using software `.p12` certificates.
- **Visual Stamp Placement**: Exact point-and-coordinate placement of visual signature stamps, initials, dates, and dynamic text fields using MuPDF and `@napi-rs/canvas`.
- **Zero-Setup Local Dev Mode**: Development uses an offline file-backed Notion mock (`.data/notion-mock.json`), removing live Notion API dependencies during local testing.
- **Workflow State Machine**: Supports sequential multi-party routing queues, status advancement (`Draft` &rarr; `Sent` &rarr; `Partially Signed` &rarr; `Completed`), and visual watermark invalidation (`Void`).
- **Live PDF Studio**: Built-in visual development workbench (`/dev/document/:id`) with hot-reloading parameters and real-time layout introspection.
- **Agent-Ready**: Native **MCP (Model Context Protocol)** support via `nitro-mcp-toolkit` for autonomous AI agents to inspect nodes and monitor health.

---

## API Consumer & Integration Guide

### 1. Dynamic Form Generation via Standard JSON Schema

Querying `GET /api/document/template/:id` returns an industry-standard JSON Schema under `schema` enriched with layout hints for dynamic form engines:

```json
{
  "id": "internship-completion-certificate",
  "label": "Internship Completion Certificate",
  "schema": {
    "type": "object",
    "properties": {
      "recipient": {
        "type": "object",
        "title": "Recipient Details",
        "x-section": "Recipient Information",
        "properties": {
          "name": { "type": "string", "title": "Full Name", "x-column": 1 },
          "email": { "type": "string", "format": "email", "title": "Email Address", "x-column": 1 }
        },
        "required": ["name", "email"]
      }
    }
  }
}
```

- **`title`**: Humanized field label.
- **`x-section`**: High-level accordion/grouping header.
- **`x-column`**: Suggested grid column span (`1` = half-width/standard, `2` = full-width).
- **`x-order`**: Field sequence index for consistent top-to-bottom rendering.
- **`x-auto`**: Server-generated field (e.g. `invoiceNumber`, `quoteNumber`). Render read-only and prefill from `GET /api/document/numbering/next`.
- **`default`**: Only emitted for numbers, booleans, enums and financial labels (e.g. `taxRate: 18`). Never fake client or project text.
- **`format: "date"`**: Date fields are strings; send ISO-8601 (`"2025-06-01"`).
- The `organization` object is **not** part of the form schema (it is owned by the client's brand step) but is still accepted in the payload.

The response also carries `shortLabel`, `category` and `signerFields`.

---

### 2. Lightweight Preview with Organization Presets

When calling `POST /api/document/template/preview`, avoid sending raw base64 logo assets on every keystroke. Send `organizationId` instead:

```json
{
  "templateId": "internship-completion-certificate",
  "variables": {
    "organizationId": "modest-human-brands",
    "recipient": {
      "name": "Alex Mercer"
    }
  }
}
```

The server resolves preset branding, colors, typography, and logos, reducing payload sizes by ~95%. You can also send a full `organization` object to override the preset (partial objects are merged). The response is `{ "pdfBase64": "...", "pageCount": 2 }`.

For live typing, call it with **`?draft=true`**: it never returns 400. Invalid or missing fields fall back to the template placeholders and are reported as `warnings: [{ field, message, code }]`. Nested objects you send (e.g. `project`) replace the placeholder object as a whole, so send complete nested objects.

---

### 3. Unified Error Contract

Payload validation errors return a clean `400 Bad Request` with exact field paths:

```json
{
  "error": true,
  "status": 400,
  "statusText": "Bad Request",
  "message": "Bad Request",
  "data": {
    "errors": [
      {
        "field": "recipient.email",
        "message": "Invalid recipient email",
        "code": "invalid_format"
      }
    ]
  }
}
```

Error responses never include server file paths. In dev mode h3 still adds a `stack` array containing only the status text; in production it is omitted. Full stack traces for 500s are logged to the server terminal only.

**Date contract:** date fields (e.g. `startDate`, `dueDate`) are sent as ISO-8601 strings (`"2025-06-01"` or full datetime). The JSON schema advertises them as `{ "type": "string", "format": "date" }`.

**Defaults & required fields:** both `preview` and create merge the template's placeholder values under your payload before validating, so partial payloads succeed. The `required` list in the schema describes the fields a client should collect; enforce it client-side before "Review & send".

---

### 4. Wizard Helpers

| Route                                                 | Purpose                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/document/template`                          | Cards: `id`, `label`, `shortLabel`, `category` (Billing / Contracts / Certificates / Marketing), `description`, `sampleUrl`.                                           |
| `GET /api/document/template/:id/sample.pdf`           | Sample PDF (placeholder data) for the template picker preview.                                                                                                         |
| `POST /api/document/template/preview?draft=true`      | Live preview while typing: never returns 400; invalid fields fall back to placeholders and are listed in `warnings[{field,message,code}]`. Always returns `pageCount`. |
| `GET /api/document/numbering/next?templateId=invoice` | Peek the next number, e.g. `MHB-I-26-014` (not reserved). Fields marked `x-auto` in the schema should be prefilled from it.                                            |
| `GET /api/document?templateId=quotation&status=Draft` | Filter documents (e.g. the "From quotation" list); `GET /api/document/:id` returns the stored `rawData` for prefill.                                                   |

Creating a document (`POST /api/document/template`) accepts `template` or `templateId`, and `data` or `variables` (aliases that match the preview payload). Like preview, it fills missing fields from the template placeholders, so enforce the schema's `required` list on the client.

### 5. Endpoint Reference

| Method          | Route                                                                            | Description                                                   |
| --------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET`           | `/api/health`                                                                    | Service health.                                               |
| `GET`           | `/api/document/template`                                                         | Template cards (`shortLabel`, `category`, `sampleUrl`).       |
| `GET`           | `/api/document/template/:id`                                                     | JSON Schema + `signerFields`.                                 |
| `GET`           | `/api/document/template/:id/sample.pdf`                                          | Sample PDF with placeholder data.                             |
| `POST`          | `/api/document/template/preview[?draft=true]`                                    | Render `{ pdfBase64, pageCount[, warnings] }`.                |
| `POST`          | `/api/document/template`                                                         | Generate the PDF and save a draft record.                     |
| `GET`           | `/api/document/numbering/next?templateId=`                                       | Peek the next document number (not reserved).                 |
| `GET`           | `/api/document?limit=&offset=&templateId=&status=`                               | Paginated, filterable document list.                          |
| `GET` / `PATCH` | `/api/document/:id`                                                              | Document details (incl. stored `rawData`) / update metadata.  |
| `GET`           | `/api/document/:id/content`                                                      | PDF (or `?type=image` thumbnail, `?download` for attachment). |
| `POST`          | `/api/document/:id/session`, `/session/verify`                                   | Signer magic-link sessions.                                   |
| `POST`          | `/api/document/:id/sign/prepare`, `/sign/client`, `/sign/server`, `/sign/verify` | Signing pipeline and signature verification.                  |
| `POST`          | `/api/document/:id/envelope`, `/void`                                            | Routing envelope and void.                                    |

A ready-made [Postman collection](./postman) covers the template, document, session and signing routes with request and response schema tests (the routing `envelope` route is not in it yet).

### 6. Decor (illustrations, patterns, frames)

Templates can expose decorative images as a **picker** instead of a hard-coded asset. A decor reference is one string:

| Reference       | Meaning                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `builtin:<id>`  | Shipped with the server (source files in `public/decor/`, listed by `GET /api/decor`)                                |
| `upload:<hash>` | A user upload (`POST /api/decor/upload`, content-addressed, PNG/JPG/WebP/SVG up to 2 MB, normalised to PNG)          |
| `https://...`   | An external image; fetched server-side (https only, private/loopback hosts blocked, 5 MB / 5 s limits, no redirects) |
| `none` / empty  | No decor                                                                                                             |

Schema hints on a field: `x-widget: "decor"` (a decor picker) or `"image"` (a plain image field that accepts the same references), plus `x-decor-slot` (e.g. `panel-corner`) to filter `GET /api/decor?slot=`. Built-ins marked `tintable` can be recoloured with a `tint` enum (`none | primary | accent`). Templates resolve references with `resolveDecor()` from `server/utils/decor.ts`, which never throws: an unreachable or rejected image is simply omitted.

| Route                             | Purpose                                                                    |
| --------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/decor[?slot=]`          | Built-in catalogue: `id`, `label`, `kind`, `tintable`, `slots`, `thumbUrl` |
| `GET /api/decor/builtin/:id.png`  | Thumbnail / preview                                                        |
| `POST /api/decor/upload`          | `multipart/form-data` with `file`; returns `{ id, url }`                   |
| `GET /api/decor/upload/:hash.png` | Serves an upload                                                           |

### 7. Preview Variants & Sample Images

Every template has three looks, selected with `variant` on `POST /api/document/template/preview` (default `filled`):

| Variant   | Organisation                                                  | Fields                                                | Used in the wizard              |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------- |
| `sample`  | Neutral (grey "LOGO" circle, "Your Company")                  | Every dynamic field shows its `{{Field Label}}` token | Step 1, as static images        |
| `branded` | The client's organisation (`organizationId` / `organization`) | Tokens                                                | Step 2 (Brand), live            |
| `filled`  | The client's organisation                                     | The user's data; anything still empty shows its token | Steps 3-4, live (`?draft=true`) |

Tokens use the same label as the Details form (the schema `title`). Short or ambiguous labels are prefixed with their section so each token maps to exactly one field: `{{Recipient Name}}`, `{{Project Title}}`, `{{Deliverable Rate}}`, while specific ones stay as is (`{{Invoice Number}}`, `{{Due Date}}`). Computed values (subtotal, totals) show an em dash until their inputs are filled. `sample` and `branded` never return 400; in `filled` + `?draft=true`, invalid values are dropped (the field shows its token again) and reported in `warnings`. Strict `filled` (no `draft`) is unchanged: placeholders backfill missing fields and invalid input is a 400.

**Static sample images.** The `sample` variant of every template is pre-rendered to `public/templates/<id>/sample-<n>.png` (2x, all pages) with a `manifest.json`, so step 1 needs no PDF rendering. The PNGs are tracked with **Git LFS** (`.gitattributes`); run `git lfs install` once and `git lfs pull` in CI/Docker builds before `nitro build`.

```bash
npx nitro dev                                            # in one terminal
npx nitro task run templates:sample-images               # regenerate after changing a template
npx nitro task run templates:sample-images --payload '{"check":true}'   # CI: fails if the images are stale
```

`GET /api/document/template` returns `thumbnailUrl`, `pageCount`, `version` and `pages[{url,width,height}]` (empty / `null` until the task has run). The URLs point at `GET /api/document/template/:id/sample/:page.png?v=<hash>` (immutable cache), which serves the files from `public/templates` through the API so dev proxies work.

### 8. Fonts

Fonts are resolved on demand instead of being added to `asset/` by hand. A template declares families and weights:

```ts
fonts: [{ name: 'Exo2', family: 'Exo 2', weights: [400], path: './asset/Exo2-Regular.ttf' }]
```

- `name` is the value used as `fontFamily` in the component (and in `organization.branding.font`); `family` is the Google Fonts family; `weights` lists the weights to make available (default `[400]`); `path` is an optional bundled file used only as offline fallback for weight 400.
- On first render the server resolves the family with [`unifont`](https://github.com/unjs/unifont) (Google provider), downloads a **full TTF/WOFF** file once, caches it in the `data` storage (`.data/fonts/`) and registers it with the PDF engine. WOFF2 is never used (it breaks in the PDF engine) and CDN subset files are avoided (they lose glyphs such as the rupee sign).
- The organisation's `branding.font` is resolved the same way, so any Google font works (`Inter`, `Poppins`, `OpenSans`...). If it cannot be resolved the render falls back to `Exo2`; it never fails.
- **Weights are global per `name`.** Only weight 400 is registered by the current templates, so `fontWeight: 'bold'` renders as regular, as designed. Registering 600/700 under a name affects every template that uses that name; give a template its own `name` if it needs a real bold.
- `GET /api/fonts[?q=&limit=]` lists available families as `{ family, name }` (`name` is what to store in `branding.font`); without `q` it returns a short featured list.
- `npx nitro task run fonts:warm` pre-downloads every template font (add brand fonts with `--payload '{"families":["Inter"]}'`). Run it at deploy time, and keep `.data` on a persistent volume.

## Getting Started

### Prerequisites

- **Bun** `>= 1.2.9` (recommended) or **Node.js** `>= 22.11.0`
- System build dependencies for native modules (`mupdf`, `@napi-rs/canvas`):
  - On Ubuntu/Debian: `sudo apt-get install build-essential python3`
  - On macOS: Xcode Command Line Tools (`xcode-select --install`)

### Installation & Development

```bash
# Install dependencies
bun install

# Start local server with hot module replacement
bun run dev
```

The service will start at `http://localhost:3000`.

_Note: In `NODE_ENV=development`, document data stores locally in `.data/notion-mock.json`. You do not need live Notion API credentials to develop or test._

---

## License

Published under the [MIT License](https://github.com/Modest-Human-Brands/mdoc/blob/main/LICENSE).
