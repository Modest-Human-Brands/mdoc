<p align="center">
  <img src="./public/logo.png" lt="Logo" width="65" />
<p>

# MDoc

![Landing](public/previews/landing.webp)

> A structured document management service for creating, storing, and collaborating on business documents and deliverables.

# Specs

## 0. Health Layer

### `GET /api/health`

**Description:** Verification ping to check system readiness and isolate active compute infrastructure nodes.

**Input:** _(None)_

**Output (JSON):**

```json
{
  "status": "OK",
  "node": "Gigabyte"
}
```

---

## 1. Template Management

### `GET /api/document/template`

**Description:** Fetch a list of all available dynamic document templates.

**Output (JSON):**

```json
[
  {
    "id": "quotation",
    "name": "Standard Client Quotation",
    "requiredFields": ["clientName", "totalAmount"]
  },
  {
    "id": "internship-completion-certificate",
    "name": "Internship Completion Certificate",
    "requiredFields": ["recipientName", "startDate", "endDate"]
  }
]
```

### `POST /api/document/create`

**Description:** Generate a new document in `DRAFT` status by merging payload data with a predefined template.

**Input (JSON):**

```json
{
  "template": "internship-completion-certificate",
  "data": {
    "recipientName": "Shreeja Sarkar",
    "recipientRole": "Marketing Intern",
    "scopeOfWork": "writing blogs/articles, client handling, client lead researching",
    "startDate": "Sept 8, 2025",
    "endDate": "Dec 8, 2025",
    "dataOfIssue": "April 22, 2026",
    "signerName": "Aratrik Nandy",
    "signerTitle": "Chief Executive Officer",
    "companyName": "RED CAT PICTURES",
    "companylogoUrl": "https://redcatpictures.com/logo-dark.svg"
  }
}
```

**Output (JSON):**

```json
{
  "success": true,
  "message": "Document cleanly rendered and saved as draft.",
  "documentId": "c0e6ccef-71fe-4849-99bd-616d3545f2e1",
  "status": "DRAFT",
  "fileName": "internship-completion-certificate_1779008723212.pdf"
}
```

---

## 2. Document Core (Query, Retrieval & Drafts)

### `GET /api/document`

**Description:** Retrieve metadata for all documents accessible to the authenticated user. Supports pagination and status filtering (`?status=DRAFT|SENT|COMPLETED|VOID`).

**Output (JSON):**

```json
[
  {
    "id": "c0e6ccef-71fe-4849-99bd-616d3545f2e1",
    "name": "Internship Completion Certificate",
    "fileName": "internship-completion-certificate__c0e6ccef.pdf",
    "extension": "pdf",
    "sizeBytes": 896601,
    "status": "COMPLETED",
    "templateId": "internship-completion-certificate",
    "previewUrl": "/api/documents/preview/internship-completion-certificate__c0e6ccef.png",
    "createdAt": "2026-04-27T12:11:26.733Z",
    "updatedAt": "2026-04-27T12:11:26.733Z"
  }
]
```

### `GET /api/document/:id`

**Description:** Get exhaustive metadata for a specific document, including its current signature workflow status and signer queue.

**Output (JSON):** _(Standard Document Metadata Object)_

### `PATCH /api/document/:id`

**Description:** Update a `DRAFT` document before sending it. Allows modification of custom variables or file renaming.

**Input (JSON):**

```json
{
  "name": "Updated Internship Certificate - Shreeja",
  "customData": {
    "endDate": "Dec 15, 2025"
  }
}
```

### `GET /api/document/:id/content`

**Description:** Returns the raw binary PDF file of the document.

**Output:** `application/pdf` (Binary Stream)

---

## 3. Envelope Routing & Signer Access

### `POST /api/document/:id/envelope`

**Description:** Locks a draft document and creates a routing envelope. Dictates who needs to sign it, in what order, and transitions the status to `SENT`.

**Input (JSON):**

```json
{
  "expiresInDays": 7,
  "routingType": "SEQUENTIAL",
  "signers": [
    {
      "order": 1,
      "name": "Shreeja Sarkar",
      "email": "shreeja@example.com",
      "role": "Recipient",
      "authMethod": "EMAIL_OTP",
      "requiresAttachments": ["ID_PROOF"]
    },
    {
      "order": 2,
      "name": "Aratrik Nandy",
      "email": "aratrik@redcatpictures.com",
      "role": "Issuer",
      "authMethod": "SSO"
    }
  ],
  "message": "Please review and sign your completion certificate."
}
```

**Output (JSON):**

```json
{
  "success": true,
  "envelopeId": "env_88f9a2b1",
  "status": "SENT",
  "nextSigner": "shreeja@example.com"
}
```

### `POST /api/document/:id/session`

**Description:** Generates a secure, time-limited Magic Link/Session Token for an external signer to access the signing UI without an MHB account.

**Input (JSON):**

```json
{
  "signerEmail": "shreeja@example.com",
  "expiresInMinutes": 60
}
```

**Output (JSON):**

```json
{
  "success": true,
  "sessionToken": "jwt_token_xyz",
  "magicLink": "https://app.redcatpictures.com/sign/env_88f9a2b1?token=jwt_token_xyz"
}
```

---

## 4. Execution & Attachments

### `POST /api/document/:id/sign`

**Description:** Executes a signature block on the document. Captures visual signature data alongside deep telemetry for the audit trail.

**Input (JSON):**

```json
{
  "sessionToken": "jwt_token_xyz",
  "signatureData": "data:image/png;base64,iVBORw0KGgo...",
  "telemetry": {
    "ipAddress": "192.168.1.45",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "location": "22.4309° N, 88.4230° E"
  }
}
```

**Output (JSON):**

```json
{
  "success": true,
  "message": "Signature successfully applied.",
  "documentStatus": "PARTIALLY_SIGNED",
  "nextSigner": "aratrik@redcatpictures.com"
}
```

### `POST /api/document/:id/attachments`

**Description:** Allows a signer to upload supplementary files (e.g., ID proof) required for the contract.

**Input (JSON):**

```json
{
  "sessionToken": "jwt_token_xyz",
  "attachmentType": "ID_PROOF",
  "fileName": "passport_scan.pdf",
  "fileBase64": "JVBERi0xLjQKJcOkw7zDts..."
}
```

**Output (JSON):**

```json
{
  "success": true,
  "attachmentId": "att_91238xa"
}
```

---

## 5. Workflow Interruption & Control

### `POST /api/document/:id/remind`

**Description:** Forces a manual nudge (via email or MCoordinate matrix chat) to the person currently holding up the queue.

**Input (JSON):**

```json
{
  "message": "Hi Shreeja, friendly reminder to sign this certificate before Friday!"
}
```

**Output (JSON):**

```json
{
  "success": true,
  "message": "Reminder dispatched to shreeja@example.com"
}
```

### `POST /api/document/:id/void`

**Description:** Cancels an active envelope. No further signatures can be collected. Permanently watermarks the document as "VOID".

**Input (JSON):**

```json
{
  "reason": "Contract terms renegotiated, issuing a new version."
}
```

**Output (JSON):**

```json
{
  "success": true,
  "status": "VOID",
  "message": "Envelope voided successfully."
}
```

---

## 6. Audit & Compliance

### `GET /api/document/:id/audit-trail`

**Description:** Generates and returns a secure, tamper-evident PDF Certificate of Completion detailing the entire lifecycle of the document (creation, views, signature timestamps, IPs).

**Output:** `application/pdf` (Binary Stream)

### `GET /api/document/:id/verify`

**Description:** Verifies the cryptographic hash of a completed document to ensure it has not been tampered with since the final signature was applied.

**Output (JSON):**

```json
{
  "isValid": true,
  "sealTimestamp": "2026-04-27T12:15:00.000Z",
  "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## 7. Cross-Service Integration & Archival

### `POST /api/webhooks/subscriptions`

**Description:** Registers a webhook listener (e.g., MCoordinate) to receive real-time event pushes when document statuses change.

**Input (JSON):**

```json
{
  "targetUrl": "https://api.redcatpictures.com/coordinate/webhooks/ingest",
  "events": ["document.sent", "document.viewed", "document.signed", "document.completed", "document.voided"],
  "secret": "........."
}
```

### `POST /api/document/:id/export/s3`

**Description:** Pushes a completed, cryptographically sealed MDoc PDF payload (and associated attachments) directly into a specified S3 bucket for immutable, compliant cold storage.

**Input (JSON):**

```json
{
  "storageProfile": "production-contracts-secure",
  "s3Prefix": "2026/clients/redcat-pictures/",
  "applyKmsEncryption": true,
  "metadataTags": {
    "client": "Red Cat Pictures",
    "documentType": "Internship Certificate",
    "retentionPolicy": "7_years"
  }
}
```

**Output (JSON):**

```json
{
  "success": true,
  "message": "Document and attachments successfully written to S3.",
  "s3Details": {
    "bucket": "mhb-secure-contracts-prod",
    "objectKey": "2026/clients/redcat-pictures/internship-completion-certificate_1779008723212.pdf",
    "eTag": "\"6805f2cfc46c0f04559748bb039d69ae\"",
    "versionId": "3/L4kqtJlcpXroDTDmJ+rmSpjOSezUm"
  }
}
```

---

### Roadmap

| Order  | Route                                | Module                                  | Complexity Profile                                                                                                                                                                      | Status         |
| ------ | ------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **1**  | `GET /api/health`                    | 0. Health & Discovery                   | **Trivial**: Simple hardcoded static JSON response checking node availability.                                                                                                          | ✅ **Done**    |
| **2**  | `GET /api/document/template`         | 1. Template Management                  | **Very Low**: Basic database read returning a static or simple list of available templates.                                                                                             | ✅ **Done**    |
| **3**  | `POST /api/document/create`          | 1. Template Management                  | **Medium**: Requires a PDF rendering engine (like Puppeteer/PDFKit) to merge JSON payload with a visual template and save the output.                                                   | ✅ **Done**    |
| **4**  | `GET /api/document`                  | 2. Document Core                        | **Low**: Standard CRUD read with pagination and basic query parameters (filtering by status).                                                                                           | ✅ **Done**    |
| **5**  | `GET /api/document/:id`              | 2. Document Core                        | **Low**: Standard CRUD single-record lookup for document metadata.                                                                                                                      | ✅ **Done**    |
| **6**  | `PATCH /api/document/:id`            | 2. Document Core                        | **Low**: Standard CRUD update with simple validation (only allowing edits if status is `DRAFT`).                                                                                        | ✅ **Done**    |
| **7**  | `GET /api/document/:id/content`      | 2. Document Core                        | **Low**: Requires reading a binary stream from local storage or S3 and piping it to the HTTP response.                                                                                  | ✅ **Done**    |
| **8**  | `POST /api/document/:id/session`     | 3. Envelope Routing & Signer Access     | **Low**: Pure compute. Generates a time-boxed JWT and formats a Magic Link. No file I/O required.                                                                                       | ✅ **Done**    |
| **9**  | `POST /api/document/:id/remind`      | 5. Workflow Interruption & Control      | **Low-Medium**: Requires integration with an outbound notification service (SMTP or MCoordinate webhook).                                                                               | ⏳ **Pending** |
| **10** | `POST /api/document/:id/envelope`    | 3. Envelope Routing & Signer Access     | **Medium**: State machine initialization. Validates signer arrays, builds the routing queue, locks the document, and transitions state to `SENT`.                                       | ✅ **Done**    |
| **11** | `POST /api/webhooks/subscriptions`   | 7. Cross-Service Integration & Archival | **Medium**: Database writes coupled with registering jobs in a background worker queue (e.g., BullMQ) for future async dispatch.                                                        | ⏳ **Pending** |
| **12** | `POST /api/document/:id/void`        | 5. Workflow Interruption & Control      | **Medium-High**: Halts the state machine queue and requires manipulating an existing PDF in-memory to stamp a visual "VOID" watermark across pages.                                     | ✅ **Done**    |
| **13** | `POST /api/document/:id/attachments` | 4. Execution & Attachments              | **High**: Handles `multipart/form-data`, file sanitization/malware checks, limits file sizing, and manages secure temporary uploads.                                                    | ⏳ **Pending** |
| **14** | `POST /api/document/:id/export/s3`   | 7. Cross-Service Integration & Archival | **High**: Complex networking and security. Requires AWS SDK integration, handling KMS encryption, piping large streams, and applying custom S3 metadata tags.                           | ⏳ **Pending** |
| **15** | `POST /api/document/:id/sign`        | 4. Execution & Attachments              | **Very High**: The core engine. Requires token validation, loading the PDF into memory, mapping X/Y coordinates, image scaling/flattening, DB telemetry logging, and queue advancement. | ✅ **Done**    |
| **16** | `GET /api/document/:id/audit-trail`  | 6. Audit & Compliance                   | **Expert**: Requires dynamic PDF generation from database event logs, drawing structured tables, and safely appending those new pages to the _existing_ signed PDF binary.              | ⏳ **Pending** |
| **17** | `GET /api/document/:id/verify`       | 6. Audit & Compliance                   | **Expert**: Pure cryptography. Requires hashing the final PDF binary, extracting existing X.509 digital certificates, and comparing checksums to definitively prove immutability.       | ⏳ **Pending** |

Progress = 11/17 = 64%

## License

Published under the [MIT](https://github.com/Modest-Human-Brands/mdoc/blob/main/LICENSE) license.
<br><br>
<a href="https://github.com/Modest-Human-Brands/mdoc/graphs/contributors">
<img src="https://contrib.rocks/image?repo=Modest-Human-Brands/mdoc" />
</a>
