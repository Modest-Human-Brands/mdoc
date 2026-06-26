# Changelog

## v0.1.15

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.14...v0.1.15)

### 🩹 Fixes

- Standardize date formatting to use toISOString across session and sign handlers ([ee99c85](https://github.com/Modest-Human-Brands/mdoc/commit/ee99c85))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.14

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.13...v0.1.14)

### 🩹 Fixes

- Update date formatting to use toDateString for consistency in session and sign handlers ([55222d1](https://github.com/Modest-Human-Brands/mdoc/commit/55222d1))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.13

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.12...v0.1.13)

### 🚀 Enhancements

- Add Invoice template and integrate with existing document templates ([17b4835](https://github.com/Modest-Human-Brands/mdoc/commit/17b4835))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.12

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.11...v0.1.12)

### 🚀 Enhancements

- Add pricing model to quotation schema and update deliverable handling ([8f1c69c](https://github.com/Modest-Human-Brands/mdoc/commit/8f1c69c))
- Update session handling to use expiresIn for expiration date and adjust related components ([3a8c5d2](https://github.com/Modest-Human-Brands/mdoc/commit/3a8c5d2))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.11

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.10...v0.1.11)

### 🩹 Fixes

- Update session expiration from minutes to days in session handling ([2d0ab04](https://github.com/Modest-Human-Brands/mdoc/commit/2d0ab04))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.10

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.9...v0.1.10)

### 🏡 Chore

- Remove debug logging from deliverables processing ([0143e69](https://github.com/Modest-Human-Brands/mdoc/commit/0143e69))

### 🎨 Styles

- Enhance quotation template structure and improve deliverable details ([100bf3c](https://github.com/Modest-Human-Brands/mdoc/commit/100bf3c))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.9

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.8...v0.1.9)

### 🚀 Enhancements

- Implement session verification endpoint with JWT validation ([4f7fe23](https://github.com/Modest-Human-Brands/mdoc/commit/4f7fe23))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.8

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.7...v0.1.8)

### 🩹 Fixes

- Add public site URL configuration for magic link generation ([c6f572e](https://github.com/Modest-Human-Brands/mdoc/commit/c6f572e))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.7

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.6...v0.1.7)

### 🚀 Enhancements

- Enhance document handling with improved error messages and session verification ([c605444](https://github.com/Modest-Human-Brands/mdoc/commit/c605444))
- Enhance document handling with JSON storage and session management improvements ([c545306](https://github.com/Modest-Human-Brands/mdoc/commit/c545306))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.6

### 🚀 Enhancements

- Enhance document handling and update schemas for improved data structure ([207079f](https://github.com/Modest-Human-Brands/mdoc/commit/207079f))

### 🏡 Chore

- Apply code fixes [skip ci] ([e34deb6](https://github.com/Modest-Human-Brands/mdoc/commit/e34deb6))

### ❤️ Contributors

- Shba007 ([@shba007](https://github.com/shba007))
- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.5

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.4...v0.1.5)

### 🚀 Enhancements

- **api:** Enhance document API with project and contact details ([c871ded](https://github.com/Modest-Human-Brands/mdoc/commit/c871ded))

### 🩹 Fixes

- Update CSS classes for responsive layout in document view ([d0cffee](https://github.com/Modest-Human-Brands/mdoc/commit/d0cffee))

### 🏡 Chore

- Update dependencies and improve document API response ([f66139f](https://github.com/Modest-Human-Brands/mdoc/commit/f66139f))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.4

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.3...v0.1.4)

### 🚀 Enhancements

- Enhance document template API with improved metadata structure ([5689a1d](https://github.com/Modest-Human-Brands/mdoc/commit/5689a1d))
- Add templates for quotation and internship completion certificate ([ab1b2a6](https://github.com/Modest-Human-Brands/mdoc/commit/ab1b2a6))
- Enhance document generation/siging ([683aa52](https://github.com/Modest-Human-Brands/mdoc/commit/683aa52))
- Integrate signpdf library for document signing and add certificate secret ([94f97fe](https://github.com/Modest-Human-Brands/mdoc/commit/94f97fe))
- Implement void document functionality with PDF watermarking and status update ([575f71a](https://github.com/Modest-Human-Brands/mdoc/commit/575f71a))
- Enhance document retrieval by validating path parameters with Zod ([46961ab](https://github.com/Modest-Human-Brands/mdoc/commit/46961ab))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.3

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.2...v0.1.3)

### 💅 Refactors

- Replace document storage with filesystem storage in API handlers ([113eccf](https://github.com/Modest-Human-Brands/mdoc/commit/113eccf))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.2

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.1...v0.1.2)

### 🚀 Enhancements

- Add document storage and API for internship completion certificates ([e0ab719](https://github.com/Modest-Human-Brands/mdoc/commit/e0ab719))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.1

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.1.0...v0.1.1)

### 🚀 Enhancements

- Implement templates for generating quotations and internship completion certificates ([f6ba992](https://github.com/Modest-Human-Brands/mdoc/commit/f6ba992))
- New pdfme add as pdf rendering pipeline ([b35c7d9](https://github.com/Modest-Human-Brands/mdoc/commit/b35c7d9))

### 🩹 Fixes

- Implement document retrieval and generation endpoints with CORS middleware ([64d595c](https://github.com/Modest-Human-Brands/mdoc/commit/64d595c))

### 💅 Refactors

- Quotation.vue for improved styling and structure ([8dfc3d7](https://github.com/Modest-Human-Brands/mdoc/commit/8dfc3d7))
- Migrate from Nitro to Nuxt 4, update configurations and dependencies ([fbd3aef](https://github.com/Modest-Human-Brands/mdoc/commit/fbd3aef))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.1.0

[compare changes](https://github.com/Modest-Human-Brands/mdoc/compare/v0.0.1...v0.1.0)

### 🚀 Enhancements

- ⚠️ Add Quotation.vue component for generating quotations ([efd489d](https://github.com/Modest-Human-Brands/mdoc/commit/efd489d))

#### ⚠️ Breaking Changes

- ⚠️ Add Quotation.vue component for generating quotations ([efd489d](https://github.com/Modest-Human-Brands/mdoc/commit/efd489d))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.0.1

### 🚀 Enhancements

- Implement Dockerfile, update package.json, and add PDF generation functionality ([368a9e5](https://github.com/Modest-Human-Brands/mdoc/commit/368a9e5))

### 🏡 Chore

- Initialize project with basic configuration and setup ([7a1cf39](https://github.com/Modest-Human-Brands/mdoc/commit/7a1cf39))
- Update workflow actions and improve project documentation ([1a8a3eb](https://github.com/Modest-Human-Brands/mdoc/commit/1a8a3eb))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))

## v0.0.1

### 🚀 Enhancements

- Implement Dockerfile, update package.json, and add PDF generation functionality ([368a9e5](https://github.com/Modest-Human-Brands/mdoc/commit/368a9e5))

### 🏡 Chore

- Initialize project with basic configuration and setup ([7a1cf39](https://github.com/Modest-Human-Brands/mdoc/commit/7a1cf39))
- Update workflow actions and improve project documentation ([1a8a3eb](https://github.com/Modest-Human-Brands/mdoc/commit/1a8a3eb))

### ❤️ Contributors

- Shirsendu Bairagi ([@shba007](https://github.com/shba007))
