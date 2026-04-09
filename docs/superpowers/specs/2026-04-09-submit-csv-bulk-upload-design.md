# Submit CSV Bulk Upload (Regular Users) Design Spec

Date: 2026-04-09
Owner: Codex + Vishnu
Status: Approved in chat; awaiting written-spec review

## 1. Goal
Add CSV bulk upload for regular users on the Submit page while preserving existing single-submit flow and quality controls.

This feature should let users submit many recruiter emails quickly, but still enforce the same verification standards and duplicate rules as single submit.

## 2. Confirmed Product Decisions
- Bulk upload is available to regular users (not admin-only).
- UI location: Submit page with two modes (`Single Submit` and `CSV Upload`).
- Verification policy: same verification path as single submit (not trusted import).
- Credits: +5 per verified unique row (same as single submit).
- Failure handling: partial success (verified rows accepted, failed rows reported).
- Company handling: allow new companies (auto-create when needed).
- Duplicate handling:
  - Existing DB duplicate emails are skipped.
  - Duplicate emails inside the same file: first occurrence wins, later rows are skipped.
- Limits:
  - Max 50 rows per upload.
  - Cooldown: one CSV upload per user every 10 minutes.

## 3. Scope
### In scope
- Submit page UI tabs/sections for single vs CSV workflows.
- New regular-user API route for CSV bulk upload.
- Shared CSV parsing and row normalization logic for maintainability.
- Per-row verification + per-row credit application.

### Out of scope
- Changing admin trusted import behavior in `/api/admin/bulk-upload`.
- Leaderboards/reputation or post-MVP moderation systems.
- New pricing/monetization changes.

## 4. Architecture
### 4.1 Route separation
Keep clear behavioral separation:
- Existing admin trusted import remains:
  - `POST /api/admin/bulk-upload` (admin-gated, trusted verified import)
- New regular verified import:
  - `POST /api/bulk-upload` (auth required, regular/admin allowed)

This avoids mixing trusted admin import semantics with user-verified semantics in one route.

### 4.2 UI composition
Submit page becomes a two-mode experience:
- Mode A: existing single submit form (unchanged logic)
- Mode B: new CSV upload panel for user bulk upload

The mode switch uses existing in-repo tab pattern (restyled glass tabs already in project).

### 4.3 Shared row-processing pipeline
Regular CSV route will process rows with these steps:
1. Parse and validate CSV headers.
2. Enforce file row limit (max 50).
3. Normalize each row fields (`email`, `companyName`, `domain`, etc.).
4. Skip duplicate rows inside same file using a per-request `Set<email>`.
5. Skip duplicates already in DB via exact email lookup.
6. Verify row email using same pipeline as single submit (`verifyRecruiterEmail`).
7. Upsert/create company (normalized name).
8. Create recruiter email entry (`VERIFIED` with verification note/date).
9. Award credits (+5) for each created verified row.
10. Accumulate per-row results and return summary.

## 5. Data and Duplicate Rules
### 5.1 Duplicate key
Duplicate identity is exact normalized email string only (`trim().toLowerCase()`).

### 5.2 Duplicate outcomes
- Duplicate already in database: skip row, report as duplicate.
- Duplicate later in same CSV: skip row, report as duplicate-in-file.
- First occurrence in file continues through verification pipeline.

## 6. Rate Limiting / Abuse Controls
### 6.1 Row cap
Reject upload with 400 if CSV has more than 50 data rows.

### 6.2 Cooldown
Before processing rows, check user’s latest CSV bulk-upload marker transaction:
- If last upload <10 minutes ago, return 429 with remaining wait time message.
- If window elapsed, proceed.

Implementation note:
- Add a non-credit marker transaction (`amount: 0`) with `type: SUBMISSION` and a route-specific `referenceId` convention (or explicit metadata field if added later).
- For MVP, route-specific marker convention is acceptable to avoid schema churn.

## 7. UX Behavior
### 7.1 CSV mode inputs
- File picker for `.csv`
- Format block with required header:
  - `company,domain,email,recruiter_name,title,department`
- Upload button + loading state

### 7.2 Result reporting
Show concise summary card after upload:
- total rows
- created
- skipped duplicates
- skipped duplicate-in-file
- failed verification/invalid rows
- top N error lines (bounded)

### 7.3 Partial success messaging
Copy emphasizes that some rows may succeed while others fail and that credits are only awarded for successfully verified/created rows.

## 8. Error Handling
Return typed, actionable errors:
- `400` invalid CSV/header/missing file/row limit exceeded
- `401` unauthenticated
- `429` cooldown active
- `500` unexpected processing failure

Per-row errors should include row number and concise reason.

## 9. Testing and Verification
### 9.1 Automated checks
- CSV parser handles header validation and empty rows.
- Duplicate-in-file logic skips repeated emails after first occurrence.
- Duplicate-in-DB logic skips exact matches.
- Cooldown logic blocks uploads inside 10-minute window.
- Credit grants only for created verified rows.

### 9.2 Runtime verification
- `npm run lint`
- `npm run build`
- Manual:
  - submit page toggles between Single and CSV modes
  - CSV > 50 rows rejected
  - second upload within 10 minutes blocked
  - mixed-validity CSV produces partial success summary

## 10. Risks and Mitigations
- Risk: SMTP-heavy CSV uploads increase verification load.
  - Mitigation: 50-row cap + 10-minute cooldown.
- Risk: business logic divergence from single submit.
  - Mitigation: reuse existing verification/domain normalization logic and shared helpers.
- Risk: confusion between admin and regular bulk semantics.
  - Mitigation: keep separate routes and UI copy clarifying behavior.

## 11. Implementation Readiness
This spec is implementation-ready as one scoped feature pass with clear route separation, limits, and expected UX behavior.
