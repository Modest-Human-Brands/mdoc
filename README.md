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
- **Headless Notion Sync**: Stores metadata, relational associations (Users, Contacts, Projects, Organizations), and raw payloads directly in Notion databases.
- **Workflow State Machine**: Supports sequential multi-party routing queues, status advancement (`Draft` &rarr; `Sent` &rarr; `Partially Signed` &rarr; `Completed`), and visual watermark invalidation (`Void`).
- **Live PDF Studio**: Built-in visual development workbench (`/dev/document/:id`) with hot-reloading parameters and real-time layout introspection.
- **Agent-Ready**: Native **MCP (Model Context Protocol)** support via `nitro-mcp-toolkit` for autonomous AI agents to inspect nodes and monitor health.

---

## System Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                        MDoc Service                         │
 │                                                             │
 │  ┌─────────────────┐   ┌────────────────────────────────┐   │
 │  │ Document Studio │   │         Nitro Engine           │   │
 │  │  (Vue DevTools) │   │     (H3 Event Handlers)        │   │
 │  └────────┬────────┘   └───────────────┬────────────────┘   │
 └───────────┼────────────────────────────┼────────────────────┘
             │                            │
             ▼                            ▼
 ┌──────────────────────┐     ┌───────────────────────┐
 │   PDF Construction   │     │  Cryptographic Core   │
 │  ──────────────────  │     │  ───────────────────  │
 │  • @ceereals/vue-pdf │     │  • RFC 5652 CMS / PKCS#7
 │  • Sharp & Grayscale │     │  • PKI.js & ASN1.js   │
 │  • MuPDF Vector Ops  │     │  • ByteRange Injector │
 │  • pdf-lib (Watermark│     │  • @signpdf P12 Engine│
 └───────────┬──────────┘     └───────────┬───────────┘
             │                            │
             └─────────────┬──────────────┘
                           ▼
              ┌────────────────────────┐
              │    Persistence Layer   │
              │  ───────────────────   │
              │  • Notion CMS Records  │
              │  • Unstorage (/static) │
              │  • Local Session Cache │
              └────────────────────────┘
```

---

## Tech Stack

| Domain                | Technologies                                                                                                    |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Server Framework**  | [Nitro v3](https://nitro.unjs.io), [H3](https://github.com/unjs/h3)                                             |
| **Runtime & Tooling** | [Bun](https://bun.sh), Node.js (v22+), TypeScript                                                               |
| **PDF Rendering**     | `@ceereals/vue-pdf`, `mupdf`, `pdfjs-dist`, `pdf-lib`                                                           |
| **Canvas & Imaging**  | `@napi-rs/canvas`, `sharp`                                                                                      |
| **Cryptography**      | `pkijs`, `asn1js`, `@signpdf/signpdf`, `@signpdf/signer-p12`, Node WebCrypto                                    |
| **Data Validation**   | [Zod v4](https://zod.dev)                                                                                       |
| **Storage & Backend** | [Unstorage](https://github.com/unjs/unstorage), [@notionhq/client](https://github.com/makenotion/notion-sdk-js) |
| **Security & Auth**   | `jsonwebtoken` (Time-boxed Signer Magic Links)                                                                  |

---

## Project Structure

```text
mdoc/
├── asset/                   # Fonts (Exo2, Oxanium, IslandMoments) & base vector art
├── postman/                 # Git-native Postman workspace & collections
│   ├── collections/         # Executable API requests, dual schemas & examples
│   ├── environments/        # Development & production environment configurations
│   └── globals/             # Global runtime variables
├── public/                  # Static web preview assets & branding
├── server/
│   ├── api/                 # Application controllers & signing pipelines
│   ├── mcp/                 # Model Context Protocol tools for AI runtime inspection
│   ├── routes/dev/          # Browser-based live PDF Studio playground
│   ├── types/               # TypeScript interfaces (Notion models, signatures)
│   └── utils/               # Cryptographic engines, byte patchers, Notion connectors
├── static/                  # Generated binary storage (.pdf, .png thumbnails)
├── templates/
│   └── document/            # Registered document templates & layout components
│       ├── InternshipCompletionCertificateV1/
│       ├── InvoiceV1/
│       ├── QuotationV1/
│       ├── RetainerContractV1/
│       └── ShootContractV1/
├── Dockerfile               # Production multi-stage container file
├── nitro.config.ts          # Server, storage driver, and rollup configuration
└── package.json
```

---

## Template Registry

MDoc includes pre-built, strongly-typed templates configured with dynamic variable validation and signer coordinates:

1. **Internship Completion Certificate (`internship-completion-certificate`)**
   - High-resolution vector-rendered certificate with tint-adjusted backgrounds.
   - Configured with signature, authority title, and issue date stamping.
2. **Standard Quotation (`quotation`)**
   - Multi-page project commercial estimate with dynamic deliverable rows and financial calculation blocks.
   - Dual-party acceptance signatures with per-page tracking.
3. **Billing Invoice (`invoice`)**
   - Computer-generated tax invoice with discount, tax, subtotal, and banking metadata.
   - Watermarked with automatic dynamic payment status stamps (`PAID`, `PARTIALLY PAID`, `UNPAID`).
4. **Retainer Contract (`retainer-contract`)**
   - Monthly service agreement with configurable flat or target-based compensation models.
   - Evaluates conditional Markdown terms (Auto-renew, Manual, Fixed Term) with multi-signer flow.
5. **Production Shoot Contract (`shoot-contract`)**
   - Media production agreement including call times, advance breakdowns, deliverables, and copyright protections.

---

## Getting Started

### Prerequisites

- **Bun** `>= 1.2.9` (recommended) or **Node.js** `>= 22.11.0`
- System build dependencies for native modules (`mupdf`, `@napi-rs/canvas`):
  - On Ubuntu/Debian: `sudo apt-get install build-essential python3`
  - On macOS: Xcode Command Line Tools (`xcode-select --install`)

### Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server Runtime
NODE_ENV=development
HOSTNAME=local-node

# Public Routing
NITRO_PUBLIC_DOC_URL=http://localhost:3000

# Security Secrets
NITRO_PRIVATE_JWT_SECRET=your_jwt_signing_secret_here
NITRO_PRIVATE_CERTIFICATE_SECRET=your_p12_certificate_passphrase_here

# Notion Integration
NOTION_API_KEY=ntn_your_notion_integration_token
NITRO_PRIVATE_NOTION_DB_ID='{"document":"your_notion_data_source_id","user":"...","contact":"...","project":"..."}'
```

_(Note: For automated server signing, place a valid `certificate.p12` file inside `./static/certificate.p12`.)_

### Installation & Development

```bash
# Install dependencies
bun install

# Start local server with hot module replacement
bun run dev
```

The service will start at `http://localhost:3000`.

---

## PDF Studio (Developer Playground)

MDoc includes an in-browser PDF Studio that allows you to inspect layouts, tweak variables in real time, and verify signer field overlays:

```text
http://localhost:3000/dev/document/:templateId
```

_Example:_ `http://localhost:3000/dev/document/internship-completion-certificate`

### Studio Features

- **Live Form Sync**: Automatically parses the template's Zod schema and generates editable form fields.
- **Client-Side Vector Render**: Renders PDF pages using PDF.js without file downloads.
- **Signer Coordinate Grid**: Displays visual bounding boxes for signature fields, initials, names, and date positions per signer order.

---

## API & Integration Testing

All API endpoints, schemas, validation rules, and live request examples are maintained in the **Postman Git-Native Collection** located under `/postman`:

```text
postman/collections/MDoc RESTful API/
├── 01-Health/
├── 02-Templates/
├── 03-Documents/
├── 04-Signer-Sessions/
├── 05-Signing-Pipeline/
└── 06-Audit-And-Control/
```

Import the collection directly into Postman or link the repository to your Postman workspace to access:

- Pre-request script schema validations (AJV).
- Post-response contract assertions.
- Saved examples for all success and error codes (`200`, `400`, `401`, `403`, `404`, `409`, `500`).

---

## Docker Deployment

MDoc can be built and deployed as a standalone container:

```bash
# Build production Docker image
bun run docker:build

# Run container
docker run -d \
  --name mdoc \
  --env-file .env.prod \
  -p 3000:3000 \
  mdoc:dev
```

---

## Contributing

1. Clone the repository: `git clone https://github.com/Modest-Human-Brands/mdoc.git`
2. Create a feature branch: `git checkout -b feature/new-template`
3. Run code linting and formatting:
   ```bash
   bun run lint
   bun run format
   ```
4. Verify commits adhere to conventional specifications:
   ```bash
   bun run detect
   ```
5. Submit a pull request.

---

## License

Published under the [MIT License](https://github.com/Modest-Human-Brands/mdoc/blob/main/LICENSE).

<br>
<p align="center">
  <a href="https://github.com/Modest-Human-Brands/mdoc/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Modest-Human-Brands/mdoc" alt="Contributors" />
  </a>
</p>
