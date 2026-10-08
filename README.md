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
| `GET /api/document/template`                          | Cards: `id`, `label`, `shortLabel`, `category` (Billing / Contracts / Certificates), `description`, `sampleUrl`.                                                       |
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
