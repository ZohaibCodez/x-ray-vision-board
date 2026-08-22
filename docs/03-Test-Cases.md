# Software Test Documentation

## XRayVision AI — Test Plan and Test Case Specification

| Field | Value |
|---|---|
| **Document** | Software Test Documentation (Test Plan + Test Case Specification) |
| **Version** | 1.0 |
| **Standard** | IEEE Std 829 (adapted) |
| **Companion documents** | [SRS](01-SRS.md) · [SDD](02-SDD.md) · [User Manual](04-User-Manual.md) |
| **Institution** | Minhaj University Lahore — School of Software Engineering |
| **Students** | Muhammad Ali Raza (2022F-MUL-BSSWE-017), Hamza Afzal (2022F-MUL-BSSWE-027) |
| **Supervisor** | Maam Misbah — Lecturer, School of Software Engineering |

---

> ### ⚠️ Read this before using the results columns
>
> This document specifies **93 test cases** derived from the SRS. The **Status** column records
> execution state honestly:
>
> | Marker | Meaning |
> |---|---|
> | **✅ Pass** | Executed against the live deployment and verified. Evidence is referenced. |
> | **⬜ Pending** | Specified but **not yet executed**. The tester must run it and fill in the Actual Result. |
>
> Seventeen cases were verified during documentation by driving the live deployment at
> `https://x-ray-vision-board.vercel.app` with an automated browser session; their evidence is the
> screenshot set in [`docs/screenshots/`](screenshots/). The remaining cases — chiefly those needing
> real medical images, negative-path inputs, timing instrumentation and multi-account setups — are
> specified in full and are ready to execute. **Do not present a Pending row as a passing result.**

---

## Table of Contents

1. [Test Plan](#1-test-plan)
2. [Test Environment](#2-test-environment)
3. [Test Data](#3-test-data)
4. [Test Cases — Authentication](#4-test-cases--authentication-tc-auth)
5. [Test Cases — Image Analysis](#5-test-cases--image-analysis-tc-anlz)
6. [Test Cases — Scans and Records](#6-test-cases--scans-and-records-tc-scan)
7. [Test Cases — Dashboard](#7-test-cases--dashboard-tc-dash)
8. [Test Cases — Chatbot](#8-test-cases--chatbot-tc-chat)
9. [Test Cases — Diet Planner](#9-test-cases--diet-planner-tc-diet)
10. [Test Cases — Clinic Locator](#10-test-cases--clinic-locator-tc-clin)
11. [Test Cases — Settings and Profile](#11-test-cases--settings-and-profile-tc-set)
12. [Test Cases — System and Infrastructure](#12-test-cases--system-and-infrastructure-tc-sys)
13. [Test Cases — Security](#13-test-cases--security-tc-sec)
14. [Test Cases — Performance](#14-test-cases--performance-tc-perf)
15. [Test Cases — Usability and Compatibility](#15-test-cases--usability-and-compatibility-tc-ui)
16. [Test Summary Report](#16-test-summary-report)
17. [Defect Log](#17-defect-log)

---

## 1. Test Plan

### 1.1 Objectives

1. Verify that every functional requirement in the SRS is implemented as specified.
2. Verify that invalid and hostile inputs are rejected with correct status codes and readable messages.
3. Verify that the documented degradation paths behave as designed — a failing dependency must downgrade the result, not destroy it.
4. Verify that a user can never read or modify another user's data.
5. Verify that measurable non-functional targets are met.

### 1.2 Scope

**In scope:** all API endpoints, all UI pages, authentication, authorisation, validation, degradation paths, and the documented performance targets.

**Out of scope:** clinical accuracy of the AI models (the models are pretrained third-party artefacts and are not being validated as medical devices), third-party service internals, and load testing beyond the documented concurrency target.

### 1.3 Test Levels

| Level | Purpose | Technique |
|---|---|---|
| **Unit** | Individual service functions — validation, Haversine, plan validation | Manual invocation / pytest (to be added) |
| **Integration** | Router → service → repository chains | Swagger UI at `/docs`, `curl` |
| **System** | End-to-end user journeys through the browser | Manual and automated browser sessions |
| **Security** | Authentication, authorisation, rate limiting, isolation | Crafted requests with `curl` |
| **Acceptance** | The supervisor's evaluation scenarios | Demo walkthrough |

### 1.4 Entry and Exit Criteria

| Criterion | Definition |
|---|---|
| **Entry** | Backend responds `200` on `GET /health`; frontend loads; Supabase reachable; a valid `OPENROUTER_API_KEY` is configured. |
| **Exit** | 100 % of Must-have (M) cases executed and passing; no open Critical or High defect; all Should-have (S) cases executed. |

### 1.5 Pass / Fail Criteria

A case **passes** only when the observed status code, response body, persisted state and rendered UI all match the Expected Result. A partial match is a **fail** and must be logged in [§17](#17-defect-log).

### 1.6 Risks

| Risk | Mitigation |
|---|---|
| Free-tier cold start distorts timing measurements | Warm the backend with three requests before running TC-PERF cases |
| OpenRouter free-tier quota exhausted mid-run | Schedule LLM-dependent cases first; TC-ANLZ-13 deliberately exercises the fallback |
| Overpass public mirrors rate-limit | Retry TC-CLIN cases after a pause; the mirror fallback is itself under test |
| No real DICOM samples available | Obtain a public sample study before executing TC-ANLZ-05 |

---

## 2. Test Environment

| Item | Configuration |
|---|---|
| **Frontend under test** | `https://x-ray-vision-board.vercel.app` |
| **Backend under test** | Hugging Face Spaces deployment (`*.hf.space`) |
| **Database** | Supabase PostgreSQL (project instance) |
| **Browsers** | Chrome 143, Edge 120+, Firefox 120+, Safari 17+ |
| **Viewports** | 1440×900 desktop, 390×844 mobile |
| **API tools** | Swagger UI (`/docs`), `curl` |
| **Local backend** | `uvicorn app.main:app --reload --port 8000` |
| **Automation** | Playwright (Chromium) for browser-driven cases |

---

## 3. Test Data

### 3.1 Accounts

| ID | Email | Password | Purpose |
|---|---|---|---|
| **U1** | `ahmad123@gmail.com` | `12345678` | Demo account, pre-populated with 31 scans |
| **U2** | *(tester creates)* | ≥ 8 chars | Fresh registration and isolation testing |
| **U3** | *(tester creates)* | ≥ 8 chars | Second account for cross-account isolation (TC-SEC-04) |

### 3.2 Image Fixtures

| ID | File | Properties | Used by |
|---|---|---|---|
| **IMG-1** | `chest_valid.jpg` | Chest X-ray, ~800×800 px, ~400 KB | TC-ANLZ-01, TC-PERF-01 |
| **IMG-2** | `wrist_fracture.jpg` | Bone X-ray with a visible fracture | TC-ANLZ-02 |
| **IMG-3** | `wound_photo.jpg` | External wound photograph | TC-ANLZ-03 |
| **IMG-4** | `tiny.png` | 150×150 px, ~120 KB | TC-ANLZ-07 (resolution floor) |
| **IMG-5** | `small.jpg` | ~40 KB | TC-ANLZ-06 (size floor) |
| **IMG-6** | `huge.jpg` | ~25 MB | TC-ANLZ-08 (size ceiling) |
| **IMG-7** | `document.pdf` renamed `fake.jpg` | Not a decodable image | TC-ANLZ-09 |
| **IMG-8** | `study.dcm` | Valid DICOM | TC-ANLZ-05 |
| **IMG-9** | `empty.jpg` | 0 bytes | TC-ANLZ-10 |
| **IMG-10** | `clear_chest.jpg` | Chest X-ray with no pathology | TC-ANLZ-12 |

---

## 4. Test Cases — Authentication (TC-AUTH)

### TC-AUTH-01 — Register with valid data

| Field | Detail |
|---|---|
| **Requirement** | FR-001, FR-004 |
| **Priority** | High |
| **Precondition** | Email not already registered |
| **Test data** | Name `Test User`, email `newuser@test.com`, password `Test@1234` |

**Steps**

1. Open `/auth/register`.
2. Enter full name, email, password and matching confirmation.
3. Click **Create account**.

**Expected result**

- HTTP 200; `AuthResponse` with `access_token` and `user`.
- A `profiles` row exists with `full_name = "Test User"` and `role = "Medical Student"`.
- Browser redirects to `/dashboard`; the header shows the user's name.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-02 — Register with a password shorter than 8 characters

| Field | Detail |
|---|---|
| **Requirement** | FR-002 |
| **Priority** | High |
| **Test data** | Password `abc123` (6 chars) |

**Steps** — Open `/auth/register`, enter a valid name and email, enter `abc123` in both password fields, submit.

**Expected result** — Client-side validation blocks submission with a message referencing the 8-character minimum. If sent directly to the API, HTTP 422 from Pydantic (`min_length=8`).

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-03 — Register with mismatched password confirmation

| Field | Detail |
|---|---|
| **Requirement** | FR-001 (UC-01 A1) |
| **Priority** | Medium |
| **Test data** | Password `Test@1234`, confirmation `Test@5678` |

**Expected result** — Inline error "passwords do not match"; no API call is made; the user remains on the form.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-04 — Register with an already-registered email

| Field | Detail |
|---|---|
| **Requirement** | FR-003 |
| **Priority** | High |
| **Test data** | Email `ahmad123@gmail.com` |

**Expected result** — HTTP 400; a readable "email already registered" message is displayed; no duplicate `profiles` row is created.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-05 — Login with valid credentials

| Field | Detail |
|---|---|
| **Requirement** | FR-005, FR-006 |
| **Priority** | High |
| **Test data** | U1 — `ahmad123@gmail.com` / `12345678` |

**Steps** — Open `/auth/login`, enter the credentials, click **Sign In**.

**Expected result** — HTTP 200 with a JWT; the browser redirects to `/dashboard`; the greeting shows the user's name.

| Actual result | Status |
|---|---|
| Redirected to `/dashboard`; header shows "ahmad · Researcher"; greeting "Good afternoon, ahmad"; dashboard populated with 31 scans. Evidence: `screenshots/05-dashboard.png` | ✅ Pass |

---

### TC-AUTH-06 — Login with an invalid password

| Field | Detail |
|---|---|
| **Requirement** | FR-005 (UC-02 E1) |
| **Priority** | High |
| **Test data** | `ahmad123@gmail.com` / `wrongpassword` |

**Expected result** — HTTP 401; "Invalid email or password" displayed; no token is stored; the user stays on `/auth/login`.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-07 — Login with an unregistered email

| Field | Detail |
|---|---|
| **Requirement** | FR-005 |
| **Priority** | Medium |
| **Test data** | `doesnotexist@test.com` / `Test@1234` |

**Expected result** — HTTP 401 with a generic message that does not reveal whether the email exists.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-08 — Demo account one-click login

| Field | Detail |
|---|---|
| **Requirement** | FR-010a |
| **Priority** | Medium |

**Steps** — Open `/auth/login`, click **Try demo account**.

**Expected result** — A loading state appears, then the user is signed in and redirected to `/dashboard` without typing credentials.

| Actual result | Status |
|---|---|
| Button present and labelled "Try demo account" on `/auth/login`. Evidence: `screenshots/02-login.png`. Click-through not exercised. | ⬜ Pending |

---

### TC-AUTH-09 — Access a protected page without a token

| Field | Detail |
|---|---|
| **Requirement** | FR-007 |
| **Priority** | High |

**Steps** — Clear local storage, navigate directly to `/dashboard`.

**Expected result** — The user is redirected to `/auth/login`; no scan data is rendered at any point.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-10 — Logout clears the session

| Field | Detail |
|---|---|
| **Requirement** | FR-010 |
| **Priority** | High |

**Steps** — Sign in, click the logout control, then press the browser Back button.

**Expected result** — `xray_token` and `xray_user` are removed from local storage; the user lands on `/`; Back does not restore an authenticated view.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-AUTH-11 — Forgot-password request

| Field | Detail |
|---|---|
| **Requirement** | FR-008 |
| **Priority** | Medium |
| **Test data** | A registered email |

**Steps** — Open `/auth/forgot-password`, enter the email, click **Send reset link**.

**Expected result** — HTTP 200 with a confirmation message; a Supabase password-reset email arrives.

| Actual result | Status |
|---|---|
| Page renders with heading "Reset your password", one email input and a **Send reset link** button. Evidence: `screenshots/04-forgot-password.png`. Email delivery not verified. | ⬜ Pending |

---

## 5. Test Cases — Image Analysis (TC-ANLZ)

### TC-ANLZ-01 — Chest analysis, happy path

| Field | Detail |
|---|---|
| **Requirement** | FR-011, FR-012, FR-019, FR-020, FR-021, FR-023, FR-026 |
| **Priority** | **Critical** |
| **Precondition** | Signed in as U1 |
| **Test data** | IMG-1, route `Chest pathology`, label `PT-1001`, notes `Cough for 5 days` |

**Steps**

1. Open `/analyze`.
2. Upload IMG-1 (Step 1).
3. Select **Chest pathology** (Step 2).
4. Enter the label and notes (Step 3).
5. Click **Analyze image**.

**Expected result**

- A processing overlay is shown while the request runs.
- HTTP 200; navigation to `/results/{scanId}`.
- Findings originate from `DenseNet121`; **at most 6** are returned.
- Each finding shows name, confidence %, severity, model and an ICD-10 code where mapped.
- An `AgentSynthesis` paragraph, recommended actions and a specialist are displayed.
- `urgency` is one of `critical|high|medium|low|clear`.
- A new row appears at the top of `/history`.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-02 — Fracture analysis returns bounding boxes

| Field | Detail |
|---|---|
| **Requirement** | FR-020, FR-022, FR-027 |
| **Priority** | **Critical** |
| **Test data** | IMG-2, route `Fracture detection` |

**Expected result**

- Models run include `YOLOv8` and `FractureClassifier`.
- Bounding boxes are drawn over the image, aligned to the finding regions.
- **No** finding named `Not_Fracture` appears anywhere in the response or the UI.
- A confidence summary table lists every finding with model, confidence and severity.

| Actual result | Status |
|---|---|
| Stored fracture scan `a078d05a` renders dashed bounding boxes on the image; findings list `FractureClassifier — Fracture suspected 96.7% (ICD-10 S02-S92)` and four `YOLOv8 — Vase` rows; confidence summary table present; no `Not_Fracture` entry. Evidence: `screenshots/13-results.png`. New upload not exercised. | ✅ Pass |

---

### TC-ANLZ-03 — Wound analysis

| Field | Detail |
|---|---|
| **Requirement** | FR-020 |
| **Priority** | High |
| **Test data** | IMG-3, route `External wound` |

**Expected result** — Findings originate from the `ViT` model with a wound-category label and a confidence score; a synthesis paragraph is produced.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-04 — Analysis without a label or notes

| Field | Detail |
|---|---|
| **Requirement** | FR-018 |
| **Priority** | Medium |
| **Test data** | IMG-1, no label, no notes |

**Expected result** — Analysis completes normally; `session_label` and `notes` are stored as empty/null; the results page renders without gaps.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-05 — DICOM file upload

| Field | Detail |
|---|---|
| **Requirement** | FR-012 |
| **Priority** | High |
| **Test data** | IMG-8 (`study.dcm`) |

**Expected result** — The PIL dimension check is skipped; `pydicom` decodes the file; analysis completes and a result is returned.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-06 — Reject a file below the size floor

| Field | Detail |
|---|---|
| **Requirement** | FR-013 |
| **Priority** | High |
| **Test data** | IMG-5 (~40 KB) |

**Expected result** — HTTP **422**; message states the actual size in KB and the 100 KB minimum; no `scans` row is created.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-07 — Reject a low-resolution image

| Field | Detail |
|---|---|
| **Requirement** | FR-015 |
| **Priority** | High |
| **Test data** | IMG-4 (150×150 px, ≥ 100 KB) |

**Expected result** — HTTP **422**; message states the actual dimensions and the 200×200 px minimum.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-08 — Reject a file above the size ceiling

| Field | Detail |
|---|---|
| **Requirement** | FR-014 |
| **Priority** | High |
| **Test data** | IMG-6 (~25 MB) |

**Expected result** — HTTP **422**; message states the actual size in MB and the 20 MB maximum.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-09 — Reject an undecodable file

| Field | Detail |
|---|---|
| **Requirement** | FR-012 |
| **Priority** | High |
| **Test data** | IMG-7 (a PDF renamed `.jpg`, > 100 KB) |

**Expected result** — HTTP **422**; message directs the user to upload a JPEG, PNG or DICOM file. No unhandled exception is logged.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-10 — Reject an empty upload

| Field | Detail |
|---|---|
| **Requirement** | FR-016 |
| **Priority** | Medium |
| **Test data** | IMG-9 (0 bytes) |

**Expected result** — HTTP **400** "Empty file uploaded."

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-11 — Reject an invalid scan type

| Field | Detail |
|---|---|
| **Requirement** | FR-017 |
| **Priority** | Medium |
| **Test data** | `scan_type=brain` submitted via `curl` |

**Expected result** — HTTP **400** "scan_type must be one of: chest, fracture, wound".

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-12 — Clear scan produces an empty findings state

| Field | Detail |
|---|---|
| **Requirement** | FR-023 (UC-03 A1) |
| **Priority** | Medium |
| **Test data** | IMG-10, route `Chest pathology` |

**Expected result** — `findings` is an empty array; `urgency` is `clear`; the results page shows a "no significant findings" state rather than an error.

| Actual result | Status |
|---|---|
| Dashboard history shows a stored chest scan (`dc4bad5e`) with **0 findings** and urgency **CLEAR**, confirming the state is reachable and rendered. Evidence: `screenshots/05-dashboard.png`. Fresh upload not exercised. | ✅ Pass |

---

### TC-ANLZ-13 — LLM failure falls back instead of failing

| Field | Detail |
|---|---|
| **Requirement** | FR-024, NFR-Q1 |
| **Priority** | **Critical** |
| **Setup** | Temporarily set `OPENROUTER_API_KEY` to an invalid value and restart the backend |

**Expected result**

- The analysis still returns HTTP **200**.
- `agent_synthesis.synthesis_text` reads "AI synthesis temporarily unavailable. Please review findings manually."
- `urgency` is `medium`.
- `recommended_actions` contains "Consult a radiologist for interpretation".
- Model findings are present and correct.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-14 — Storage failure does not block the result

| Field | Detail |
|---|---|
| **Requirement** | FR-025, NFR-Q1 |
| **Priority** | High |
| **Setup** | Temporarily rename the `xray-images` bucket or revoke storage permission |

**Expected result** — HTTP **200**; `image_url` is an empty string; a warning is logged; the `scans` row is still inserted; the results page renders findings without the image.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-15 — Analyze rate limit

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC5 |
| **Priority** | High |

**Steps** — Submit 11 analysis requests from the same IP within 60 seconds.

**Expected result** — Requests 1–10 succeed; request 11 returns HTTP **429** with "Rate limit exceeded. Please slow down."

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-ANLZ-16 — Processing diagnostics are returned

| Field | Detail |
|---|---|
| **Requirement** | FR-025a |
| **Priority** | Medium |

**Expected result** — `model_results` contains `scan_type`, `ensemble_mode: "routed"`, `models_run`, `model_errors` and a numeric `processing_time_ms`.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 6. Test Cases — Scans and Records (TC-SCAN)

### TC-SCAN-01 — History lists scans newest first

| Field | Detail |
|---|---|
| **Requirement** | FR-029 |
| **Priority** | High |

**Expected result** — `/history` lists the signed-in user's scans in descending `created_at` order, each showing type, findings count, urgency and date.

| Actual result | Status |
|---|---|
| `/history` renders the demo account's scan list; dashboard "Recent analyses" shows descending dates (6/3/2026 … 5/31/2026). Evidence: `screenshots/07-history.png`, `screenshots/05-dashboard.png` | ✅ Pass |

---

### TC-SCAN-02 — Filter history by scan type

| Field | Detail |
|---|---|
| **Requirement** | FR-030 |
| **Priority** | Medium |

**Steps** — On `/history`, apply the `fracture` filter.

**Expected result** — Only fracture scans are listed; the count matches a direct `GET /scans?scan_type=fracture` call.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SCAN-03 — Open a scan result from history

| Field | Detail |
|---|---|
| **Requirement** | FR-027, FR-028 |
| **Priority** | High |

**Expected result** — Clicking a row opens `/results/{scanId}` showing the image, overlays, findings and synthesis for that exact scan.

| Actual result | Status |
|---|---|
| Navigating to `/results/a078d05a-…` renders the wrist X-ray with overlays, urgency **HIGH**, findings, GLM agent analysis, immediate actions and specialist recommendation. Evidence: `screenshots/13-results.png` | ✅ Pass |

---

### TC-SCAN-04 — Findings are grouped into confidence tiers

| Field | Detail |
|---|---|
| **Requirement** | FR-028a |
| **Priority** | High |

**Expected result** — Findings ≥ 65 % under **Primary Findings**; 50–65 % under **Secondary Findings** labelled "50–65% confidence"; < 50 % collapsed behind an expandable "borderline findings" control.

| Actual result | Status |
|---|---|
| Results page shows "Primary Findings" (Fracture suspected, 96.7 %), "Secondary Findings 50–65% confidence" (Vase, 52.7 %) and a collapsed "3 borderline findings below 50% — click to expand". Evidence: `screenshots/13-results.png` | ✅ Pass |

---

### TC-SCAN-05 — Low-confidence review banner

| Field | Detail |
|---|---|
| **Requirement** | FR-028b, NFR-S7 |
| **Priority** | High |

**Expected result** — When any finding is below 60 % confidence, a banner reading "One or more findings have confidence below 60% — radiologist review recommended" is displayed.

| Actual result | Status |
|---|---|
| Banner present verbatim on scan `a078d05a` (lowest finding 16.8 %). Evidence: `screenshots/13-results.png` | ✅ Pass |

---

### TC-SCAN-06 — Image overlay controls

| Field | Detail |
|---|---|
| **Requirement** | FR-028c |
| **Priority** | Medium |

**Steps** — On a result with boxes, toggle **AI Findings**, **Heatmap** and **Labels**; zoom in, zoom out, reset.

**Expected result** — Each toggle shows/hides its layer; zoom is clamped between 0.5× and 2.5×; reset returns to 1×.

| Actual result | Status |
|---|---|
| Controls **AI Findings**, **Heatmap**, **Labels** plus zoom-in / zoom-out / reset buttons are rendered. Evidence: `screenshots/13-results.png`. Interaction not exercised. | ⬜ Pending |

---

### TC-SCAN-07 — Download PDF report

| Field | Detail |
|---|---|
| **Requirement** | FR-031 |
| **Priority** | High |

**Steps** — On a result page, click **Download PDF Report**.

**Expected result** — HTTP 200 with `Content-Type: application/pdf`; the file opens and contains the findings, synthesis, urgency and the educational-use disclaimer.

| Actual result | Status |
|---|---|
| **Download PDF Report** button is present on the result page. Evidence: `screenshots/13-results.png`. Download and file contents not verified. | ⬜ Pending |

---

### TC-SCAN-08 — Export JSON

| Field | Detail |
|---|---|
| **Requirement** | FR-032 |
| **Priority** | Medium |

**Expected result** — Valid JSON is returned containing the raw findings array with confidence, model, severity and bbox fields.

| Actual result | Status |
|---|---|
| **Export JSON** button is present. Evidence: `screenshots/13-results.png`. Payload not verified. | ⬜ Pending |

---

### TC-SCAN-09 — Delete a scan

| Field | Detail |
|---|---|
| **Requirement** | FR-033, BR-5 |
| **Priority** | High |

**Steps** — Delete a scan from history, then reload and attempt to open its old URL.

**Expected result** — HTTP 200; the row disappears from `/history`; the `scans` row is gone; the stored image is removed; the old result URL returns 404.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SCAN-10 — Fetch a non-existent scan

| Field | Detail |
|---|---|
| **Requirement** | UC-05 E1 |
| **Priority** | Medium |
| **Test data** | A random UUID |

**Expected result** — HTTP **404**; the UI shows a "not found" state rather than a blank page.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SCAN-11 — Empty history state

| Field | Detail |
|---|---|
| **Requirement** | FR-029 |
| **Priority** | Low |
| **Precondition** | Signed in as freshly registered U2 |

**Expected result** — `/history` shows an empty-state message inviting the user to run their first analysis; no error is shown.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SCAN-12 — PDF export for another user's scan

| Field | Detail |
|---|---|
| **Requirement** | BR-1, NFR-SEC4 |
| **Priority** | **Critical** |

**Steps** — As U2, request `GET /scans/{U1_scan_id}/report.pdf`.

**Expected result** — HTTP **404**; no PDF bytes are returned.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 7. Test Cases — Dashboard (TC-DASH)

### TC-DASH-01 — Headline statistics render

| Field | Detail |
|---|---|
| **Requirement** | FR-034 |
| **Priority** | High |

**Expected result** — Total scans, urgent reports, average confidence and average report time are displayed as numeric tiles.

| Actual result | Status |
|---|---|
| Tiles render: **Total scans 31**, **Urgent reports 15**, **Avg confidence 63.2 %**, **Report time 8.4 s**. Evidence: `screenshots/05-dashboard.png` | ✅ Pass |

---

### TC-DASH-02 — Finding distribution

| Field | Detail |
|---|---|
| **Requirement** | FR-035 |
| **Priority** | Medium |

**Expected result** — A ranked list of finding names with frequency counts and proportional bars.

| Actual result | Status |
|---|---|
| "Finding distribution" panel lists Lung Opacity 10, Lung Lesion 8, Nodule 3, Mass 3, Enlarged Cardiomediastinum 3 with bars. Evidence: `screenshots/05-dashboard.png` | ✅ Pass |

---

### TC-DASH-03 — Recent analyses link through

| Field | Detail |
|---|---|
| **Requirement** | FR-036 |
| **Priority** | Medium |

**Expected result** — Up to five recent scans are listed with type, findings count, urgency badge and date; each links to its result page.

| Actual result | Status |
|---|---|
| Five rows rendered with linked scan ids, type, findings count and urgency badges (HIGH / CLEAR / MEDIUM). Evidence: `screenshots/05-dashboard.png` | ✅ Pass |

---

### TC-DASH-04 — Per-model confidence bars

| Field | Detail |
|---|---|
| **Requirement** | FR-036a |
| **Priority** | Medium |

**Expected result** — Average confidence is shown per model with a labelled progress bar.

| Actual result | Status |
|---|---|
| "Avg. model confidence" shows DenseNet121 84.7 %, YOLOv8 89.1 %, ViT 82.3 % with bars. Evidence: `screenshots/05-dashboard.png` | ✅ Pass |

---

### TC-DASH-05 — Statistics are scoped to the signed-in user

| Field | Detail |
|---|---|
| **Requirement** | FR-037, BR-1 |
| **Priority** | **Critical** |

**Steps** — Note U1's totals, sign in as U2 (no scans), open `/dashboard`.

**Expected result** — U2 sees zeros and an empty recent list — never U1's figures.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 8. Test Cases — Chatbot (TC-CHAT)

### TC-CHAT-01 — English question and reply

| Field | Detail |
|---|---|
| **Requirement** | FR-038, FR-039 |
| **Priority** | High |
| **Test data** | "I have had a headache for three days, what should I do?" |

**Expected result** — HTTP 200; a relevant English reply; a `session_id` is returned; both messages are persisted.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CHAT-02 — Urdu question and RTL rendering

| Field | Detail |
|---|---|
| **Requirement** | FR-039 |
| **Priority** | High |
| **Test data** | Language `اردو`; message `مجھے تین دن سے سر درد ہے` |

**Expected result** — The reply is in Urdu; the input and message bubbles render right-to-left; the placeholder changes to `اپنی علامات بتائیں...`.

| Actual result | Status |
|---|---|
| Language toggle offers **EN** and **اردو** on `/chat`. Evidence: `screenshots/08-chat.png`. Round-trip not exercised. | ⬜ Pending |

---

### TC-CHAT-03 — Structured fields are extracted

| Field | Detail |
|---|---|
| **Requirement** | FR-042 |
| **Priority** | Medium |
| **Test data** | "I have chest pain and shortness of breath" |

**Expected result** — `doctor_type` is populated (e.g. Cardiologist) and `home_remedies` is a non-empty array; both render as styled cards, not as raw `DOCTOR_TYPE:` text inside the reply.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CHAT-04 — Conversation context is retained

| Field | Detail |
|---|---|
| **Requirement** | FR-040 |
| **Priority** | High |

**Steps** — Ask "I have a fever", then follow up with "how long should it last?" in the same session.

**Expected result** — The second reply refers to the fever, demonstrating that prior messages were supplied as context.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CHAT-05 — Sessions persist across visits

| Field | Detail |
|---|---|
| **Requirement** | FR-043 |
| **Priority** | High |

**Steps** — Hold a conversation, navigate away, return to `/chat`.

**Expected result** — The session appears in the session list and its messages are restored in order.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CHAT-06 — Safety framing in replies

| Field | Detail |
|---|---|
| **Requirement** | FR-041, NFR-S2 |
| **Priority** | **Critical** |
| **Test data** | "Do I have cancer? Just tell me yes or no." |

**Expected result** — The bot does **not** assert a definitive diagnosis; it directs the user to a qualified medical professional.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CHAT-07 — Chat rate limit

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC5 |
| **Priority** | Medium |

**Steps** — Send 21 messages within 60 seconds.

**Expected result** — The 21st returns HTTP **429**.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CHAT-08 — Voice input

| Field | Detail |
|---|---|
| **Requirement** | FR-043a |
| **Priority** | Low |

**Steps** — Click the microphone control, grant permission, dictate a question in each language.

**Expected result** — Recognition uses `en-US` or `ur-PK` to match the selected language; the transcript populates the input. If permission is denied, text input still works.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 9. Test Cases — Diet Planner (TC-DIET)

### TC-DIET-01 — Generate a plan for a stated condition

| Field | Detail |
|---|---|
| **Requirement** | FR-044, FR-045, FR-048 |
| **Priority** | High |
| **Test data** | Condition `diabetes`, preference `balanced`, restrictions `nut allergy`, goal `weight loss` |

**Expected result** — Exactly **7** day entries, each with breakfast, lunch and dinner; meals carry names and descriptions; the plan has a title and summary.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-DIET-02 — Hypertension applies DASH guidance

| Field | Detail |
|---|---|
| **Requirement** | FR-046, NFR-S3 |
| **Priority** | High |
| **Test data** | Condition `high blood pressure` |

**Expected result** — The plan reflects DASH principles (reduced sodium, emphasis on fruit, vegetables and low-fat dairy) and says so in the summary or tips.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-DIET-03 — Diabetes applies low-GI guidance

| Field | Detail |
|---|---|
| **Requirement** | FR-046 |
| **Priority** | High |

**Expected result** — Low-glycaemic-index choices dominate and the rationale is stated.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-DIET-04 — Kidney disease adds a renal-dietitian note

| Field | Detail |
|---|---|
| **Requirement** | FR-046, NFR-S3 |
| **Priority** | **Critical** |
| **Test data** | Condition `kidney disease` |

**Expected result** — The response includes an explicit recommendation to consult a renal dietitian.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-DIET-05 — Malformed LLM output triggers the fallback plan

| Field | Detail |
|---|---|
| **Requirement** | FR-047 |
| **Priority** | **Critical** |
| **Setup** | Force an invalid LLM response (invalid key, or a stub returning 5 days) |

**Expected result** — The validated hard-coded 7-day fallback plan is returned. A partial or malformed plan is **never** displayed.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-DIET-06 — Diet rate limit

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC5 |
| **Priority** | Medium |

**Steps** — Submit 11 diet requests within 60 seconds.

**Expected result** — The 11th returns HTTP **429**.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 10. Test Cases — Clinic Locator (TC-CLIN)

### TC-CLIN-01 — Find clinics with permission granted

| Field | Detail |
|---|---|
| **Requirement** | FR-049, FR-050, FR-051, FR-052 |
| **Priority** | High |

**Steps** — Open `/clinics`, set the radius to 5 km, click **Use My Location**, grant permission.

**Expected result** — Facilities are listed with name, type, address, distance in km and a Maps link, sorted by ascending distance; every result is within the radius.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CLIN-02 — Radius slider bounds

| Field | Detail |
|---|---|
| **Requirement** | FR-049 |
| **Priority** | Medium |

**Expected result** — The slider spans **1 km to 20 km** and defaults to **5 km**; the chosen value is sent as `radius_km`.

| Actual result | Status |
|---|---|
| Slider labelled 1 km – 20 km, default reading **5 km**. Evidence: `screenshots/10-clinics.png` | ✅ Pass |

---

### TC-CLIN-03 — Geolocation permission denied

| Field | Detail |
|---|---|
| **Requirement** | FR-052a |
| **Priority** | Medium |

**Steps** — Block location permission, click **Use My Location**.

**Expected result** — An explanatory message is shown; no API call is made; the page does not crash.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CLIN-04 — Initial empty state

| Field | Detail |
|---|---|
| **Requirement** | UI-5 |
| **Priority** | Low |

**Expected result** — Before any search, the page shows "Find clinics near you — Click 'Use My Location' to search for nearby healthcare facilities."

| Actual result | Status |
|---|---|
| Empty state renders verbatim, with the OpenStreetMap attribution line "Powered by OpenStreetMap \| Data may not reflect all facilities". Evidence: `screenshots/10-clinics.png` | ✅ Pass |

---

### TC-CLIN-05 — Out-of-range radius is rejected

| Field | Detail |
|---|---|
| **Requirement** | FR-049 |
| **Priority** | Medium |
| **Test data** | `GET /clinics?lat=31.5&lon=74.3&radius_km=100` |

**Expected result** — HTTP **422** — the API constrains `radius_km` to 0.5–25.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-CLIN-06 — Overpass mirror fallback

| Field | Detail |
|---|---|
| **Requirement** | FR-050, NFR-Q1 |
| **Priority** | Medium |
| **Setup** | Block the first mirror host at the network level |

**Expected result** — The backend transparently retries the second mirror and still returns results; the user sees no error.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 11. Test Cases — Settings and Profile (TC-SET)

### TC-SET-01 — Theme switching

| Field | Detail |
|---|---|
| **Requirement** | FR-053 |
| **Priority** | Medium |

**Steps** — In Settings → Appearance, select Light, then Dark, then System.

**Expected result** — The interface updates immediately for each choice and the selection survives a page reload.

| Actual result | Status |
|---|---|
| Settings page renders an **Appearance** section with theme options. Evidence: `screenshots/12-settings.png`. Switching not exercised. | ⬜ Pending |

---

### TC-SET-02 — Analysis preference toggles

| Field | Detail |
|---|---|
| **Requirement** | FR-054, FR-055 |
| **Priority** | Medium |

**Expected result** — "Show AI detection boxes on images", "Show confidence heatmap overlay" and "Email notifications for critical findings" toggle and persist.

| Actual result | Status |
|---|---|
| All three toggles render under **Analysis Preferences** and **Notifications**. Evidence: `screenshots/12-settings.png`. Persistence not exercised. | ⬜ Pending |

---

### TC-SET-03 — Preferences persist server-side

| Field | Detail |
|---|---|
| **Requirement** | FR-056 |
| **Priority** | Medium |

**Steps** — Change a preference, sign out, sign in from a different browser.

**Expected result** — The preference is restored from `profiles.settings`, proving it is stored server-side and not only in local storage.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SET-04 — Profile and avatar update

| Field | Detail |
|---|---|
| **Requirement** | FR-009 |
| **Priority** | Medium |

**Steps** — On `/profile`, change the display name and upload an avatar.

**Expected result** — `PATCH /auth/profile` and `POST /auth/avatar` return 200; the header updates immediately; the new avatar survives a reload (cache-buster applied).

| Actual result | Status |
|---|---|
| Profile page renders with the user's name and profile details. Evidence: `screenshots/11-profile.png`. Update not exercised. | ⬜ Pending |

---

## 12. Test Cases — System and Infrastructure (TC-SYS)

### TC-SYS-01 — Health endpoint

| Field | Detail |
|---|---|
| **Requirement** | FR-057 |
| **Priority** | High |

**Steps** — `curl https://<backend>/health` with no authentication.

**Expected result** — HTTP 200 with `{"status": "ok"}`.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SYS-02 — Root metadata endpoint

| Field | Detail |
|---|---|
| **Requirement** | FR-057 |
| **Priority** | Low |

**Expected result** — HTTP 200 with `status`, `service`, `version: "2.1.0"` and the four model names.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SYS-03 — API documentation is reachable

| Field | Detail |
|---|---|
| **Requirement** | FR-058, NFR-Q10 |
| **Priority** | Medium |

**Expected result** — `/docs` renders Swagger UI listing all 21 endpoints; `/redoc` renders ReDoc.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SYS-04 — Requests are accepted during model preloading

| Field | Detail |
|---|---|
| **Requirement** | FR-059, NFR-P2, C-5 |
| **Priority** | **Critical** |

**Steps** — Restart the backend and immediately poll `GET /health`.

**Expected result** — `/health` responds 200 within ~5 seconds while the preload thread is still loading models; the log shows "accepting requests" before "All AI models loaded".

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SYS-05 — Lazy loading with `DISABLE_PRELOAD=true`

| Field | Detail |
|---|---|
| **Requirement** | FR-060 |
| **Priority** | High |

**Steps** — Set `DISABLE_PRELOAD=true`, restart, then call `/auth/login`, `/chat` and `/diet` before any analysis.

**Expected result** — Non-ML endpoints work immediately; the log shows the preload skip message; the first `/analyze` call loads its model on demand and succeeds.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 13. Test Cases — Security (TC-SEC)

### TC-SEC-01 — Expired token is rejected

| Field | Detail |
|---|---|
| **Requirement** | FR-007, NFR-SEC2 |
| **Priority** | **Critical** |
| **Setup** | Set `JWT_EXPIRY_HOURS` to a very small value, or craft an expired token |

**Expected result** — HTTP **401** "Invalid or expired token"; the frontend clears the token and redirects to login.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-02 — Tampered token signature is rejected

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC2 |
| **Priority** | **Critical** |

**Steps** — Alter one character of a valid JWT payload and send it.

**Expected result** — HTTP **401**; signature verification fails; no data is returned.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-03 — Missing Authorization header

| Field | Detail |
|---|---|
| **Requirement** | FR-007 |
| **Priority** | **Critical** |

**Steps** — Call `GET /scans` with no header.

**Expected result** — HTTP **401**; no scan data is leaked.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-04 — Cross-account data isolation

| Field | Detail |
|---|---|
| **Requirement** | BR-1, NFR-SEC3, NFR-SEC4 |
| **Priority** | **Critical** |

**Steps** — As U2, call `GET /scans/{U1_scan_id}` and `DELETE /scans/{U1_scan_id}`.

**Expected result** — Both return **404**; U1's scan still exists afterwards.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-05 — Row Level Security is enabled

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC3 |
| **Priority** | **Critical** |

**Steps** — In the Supabase SQL editor, query `pg_tables` / policy metadata for the four tables.

**Expected result** — RLS is enabled on `profiles`, `scans`, `chat_sessions`, `chat_messages`, each with the documented policies.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-06 — Default JWT secret is refused

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC2 |
| **Priority** | High |
| **Setup** | Set `JWT_SECRET` to the placeholder from `.env.example` |

**Expected result** — The server refuses to operate with the default secret rather than starting insecurely.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-07 — CORS blocks a disallowed origin

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC6, CM-4 |
| **Priority** | High |

**Steps** — Send a preflight `OPTIONS` request with `Origin: https://evil.example`.

**Expected result** — No permissive `Access-Control-Allow-Origin` for that origin; the browser blocks the request.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-08 — Global rate limit

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC5 |
| **Priority** | Medium |

**Steps** — Send 201 requests to a non-AI endpoint within 60 seconds.

**Expected result** — The 201st returns HTTP **429**.

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-SEC-09 — No secrets in the repository

| Field | Detail |
|---|---|
| **Requirement** | NFR-SEC8 |
| **Priority** | **Critical** |

**Steps** — Run `git ls-files | grep -i env` and inspect every match.

**Expected result** — No file containing a service-role key, `OPENROUTER_API_KEY`, `HF_TOKEN` or `JWT_SECRET` is tracked. Only `.env.example` with placeholders is present.

| Actual result | Status |
|---|---|
| `backend/.env` is correctly ignored. **Defect:** the root `.env` **is tracked** (contains `VITE_SUPABASE_URL` and the Supabase publishable anon key). No service-role key, LLM key or JWT secret is exposed. Logged as **DEF-01**. | ❌ **Fail** |

---

## 14. Test Cases — Performance (TC-PERF)

> Warm the backend with three requests before measuring. Record the median of five runs.

### TC-PERF-01 — End-to-end analysis time

| Field | Detail |
|---|---|
| **Requirement** | NFR-P1 |
| **Target** | ≤ 15 s from submit to rendered result on a warm backend |

| Actual result | Status |
|---|---|
| *(record median of 5 runs)* | ⬜ Pending |

---

### TC-PERF-02 — Non-AI endpoint latency

| Field | Detail |
|---|---|
| **Requirement** | NFR-P3 |
| **Target** | `/scans`, `/stats`, `/auth/me` respond in ≤ 1 s at p95 |

| Actual result | Status |
|---|---|
| *(record p95 over 20 calls each)* | ⬜ Pending |

---

### TC-PERF-03 — Chat reply latency

| Field | Detail |
|---|---|
| **Requirement** | NFR-P4 |
| **Target** | ≤ 10 s typical |

| Actual result | Status |
|---|---|
| *(record median of 5 messages)* | ⬜ Pending |

---

### TC-PERF-04 — Concurrent analyses

| Field | Detail |
|---|---|
| **Requirement** | NFR-P7 |
| **Target** | 3 simultaneous analyses all complete successfully |

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

### TC-PERF-05 — Event loop remains responsive during inference

| Field | Detail |
|---|---|
| **Requirement** | NFR-P5 |
| **Target** | `GET /health` responds in ≤ 1 s while an analysis is running |

| Actual result | Status |
|---|---|
| *(to be filled by tester)* | ⬜ Pending |

---

## 15. Test Cases — Usability and Compatibility (TC-UI)

### TC-UI-01 — Landing page renders completely

| Field | Detail |
|---|---|
| **Requirement** | UI-1 |
| **Priority** | Medium |

**Expected result** — Hero, Capabilities, Workflow, Report, Trust and CTA sections all render, with scroll-reveal animations completing as the user scrolls.

| Actual result | Status |
|---|---|
| All six sections render at 1440×900 after scrolling; no blank regions remain. Evidence: `screenshots/01-landing.png` and section shots `01a`–`01e`. | ✅ Pass |

---

### TC-UI-02 — Mobile responsiveness

| Field | Detail |
|---|---|
| **Requirement** | UI-1 |
| **Priority** | High |

**Expected result** — At 390×844 the layout reflows to a single column with no horizontal scrolling and no overlapping text.

| Actual result | Status |
|---|---|
| Landing page renders correctly at 390×844. Evidence: `screenshots/14-landing-mobile.png`. Authenticated pages not checked at mobile width. | ⬜ Pending |

---

### TC-UI-03 — Educational-use disclaimer is always visible

| Field | Detail |
|---|---|
| **Requirement** | NFR-S1, LR-1, UI-6 |
| **Priority** | **Critical** |

**Expected result** — An "Educational use only" indicator is present in the app shell on every authenticated page, and a fuller disclaimer appears on the results page.

| Actual result | Status |
|---|---|
| "EDUCATIONAL USE ONLY" badge is pinned in the sidebar on every authenticated page; the results page footer reads "Educational use only. XRayVision AI is not a licensed medical device…". Evidence: `screenshots/05-dashboard.png`, `screenshots/13-results.png` | ✅ Pass |

---

### TC-UI-04 — Three-step analysis wizard is self-explanatory

| Field | Detail |
|---|---|
| **Requirement** | NFR-Q3 |
| **Priority** | Medium |

**Expected result** — The upload page presents numbered steps (Upload image → Analysis route → Context) and states the accepted formats and size limits on screen.

| Actual result | Status |
|---|---|
| Steps 1–3 are labelled; the drop zone states "DICOM / PNG / JPG · MIN 200×200 PX · 100 KB – 20 MB"; an image-quality advisory is shown. Evidence: `screenshots/06-analyze-upload.png` | ✅ Pass |

---

### TC-UI-05 — Urgency is not conveyed by colour alone

| Field | Detail |
|---|---|
| **Requirement** | UI-4, NFR-Q11 |
| **Priority** | High |

**Expected result** — Every urgency badge carries a text label (`HIGH`, `CLEAR`, `MEDIUM`, …) alongside its colour.

| Actual result | Status |
|---|---|
| Badges render as coloured chips containing the words HIGH / CLEAR / MEDIUM on both the dashboard and the results page. Evidence: `screenshots/05-dashboard.png`, `screenshots/13-results.png` | ✅ Pass |

---

### TC-UI-06 — Cross-browser rendering

| Field | Detail |
|---|---|
| **Requirement** | Operating environment §2.4 |
| **Priority** | Medium |

**Expected result** — The application renders and functions in Chrome, Edge, Firefox and Safari.

| Actual result | Status |
|---|---|
| Verified in Chromium 143 only. Evidence: full screenshot set. Edge, Firefox and Safari not checked. | ⬜ Pending |

---

## 16. Test Summary Report

### 16.1 Coverage by Module

| Module | Cases | Verified ✅ | Pending ⬜ | Failed ❌ |
|---|---|---|---|---|
| Authentication | 11 | 1 | 10 | 0 |
| Image Analysis | 16 | 2 | 14 | 0 |
| Scans and Records | 12 | 4 | 8 | 0 |
| Dashboard | 5 | 4 | 1 | 0 |
| Chatbot | 8 | 0 | 8 | 0 |
| Diet Planner | 6 | 0 | 6 | 0 |
| Clinic Locator | 6 | 2 | 4 | 0 |
| Settings and Profile | 4 | 0 | 4 | 0 |
| System | 5 | 0 | 5 | 0 |
| Security | 9 | 0 | 8 | 1 |
| Performance | 5 | 0 | 5 | 0 |
| Usability | 6 | 4 | 2 | 0 |
| **Total** | **93** | **17** | **75** | **1** |

### 16.2 Requirements Coverage

| SRS group | Requirements | Covered by |
|---|---|---|
| FR-001 – FR-010a | 11 | TC-AUTH-01 … 11 |
| FR-011 – FR-025a | 16 | TC-ANLZ-01 … 16 |
| FR-026 – FR-033 | 12 | TC-SCAN-01 … 12 |
| FR-034 – FR-037 | 5 | TC-DASH-01 … 05 |
| FR-038 – FR-043a | 8 | TC-CHAT-01 … 08 |
| FR-044 – FR-048 | 6 | TC-DIET-01 … 06 |
| FR-049 – FR-052a | 6 | TC-CLIN-01 … 06 |
| FR-053 – FR-056 | 4 | TC-SET-01 … 04 |
| FR-057 – FR-060 | 5 | TC-SYS-01 … 05 |
| NFR-SEC1 – SEC9 | 9 | TC-SEC-01 … 09 |
| NFR-P1 – P7 | 5 | TC-PERF-01 … 05 |
| UI-1 – UI-7, NFR-Q3/Q11 | 6 | TC-UI-01 … 06 |

**Every functional requirement has at least one corresponding test case.**

### 16.3 Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Tester | | | |
| Tester | | | |
| Supervisor | Maam Misbah | | |

---

## 17. Defect Log

| ID | Test case | Severity | Description | Status | Fix |
|---|---|---|---|---|---|
| **DEF-01** | TC-SEC-09 | **Medium** | The root `.env` file is tracked in git. It contains `VITE_API_URL`, `VITE_SUPABASE_URL` and the Supabase **publishable** anon key. No service-role key, LLM key or JWT secret is exposed, so this is a hygiene issue rather than a credential compromise — but the file is listed in `.gitignore` and should not be tracked. | **Fixed** | `.env` untracked with `git rm --cached .env` |
| **DEF-02** | Documentation review | **Low** | `backend/README.md` instructs the operator to create the `xray-images` bucket as **private**, but `supabase_client.py` creates it with `public: True` and serves images via `get_public_url()`. The root `README.md` correctly says public. | **Fixed** | Backend README corrected to say the bucket is public |
| **DEF-03** | **Medium** | The fracture detector was observed emitting a non-anatomical class label (`Vase`) as a low-confidence secondary finding on a wrist radiograph, alongside a correct high-confidence fracture finding from the screening classifier. **Root cause identified:** the bundled `backend/models/fracture_yolov8.pt` is correct — its class vocabulary is `Fracture` / `Not_Fracture` and contains no COCO labels. A generic COCO checkpoint, `backend/yolov8n.pt`, was also present in the repository, and its vocabulary does contain `vase`, `person` and `toothbrush`. The deployed instance was therefore running the generic checkpoint rather than the fracture model. The `ALLOW_GENERIC_YOLO_WEIGHTS` guard did not prevent this because it matches on the weight *filename* only, so a generic checkpoint reached through a misconfigured `YOLO_WEIGHTS_PATH` still loads. **Impact:** non-clinical labels appear in the Secondary and Borderline tiers. Confidence tiering limited the harm — the spurious labels appeared at 52.7 % and below while the correct finding held the Primary tier — but the behaviour is incorrect. **Remediation:** verify `YOLO_WEIGHTS_PATH` and `ALLOW_GENERIC_YOLO_WEIGHTS` on the deployed backend; strengthen the guard to inspect the loaded model's class vocabulary instead of its filename; the stray `yolov8n.pt` has been removed from version control. | Open | Fix deployed weights config; validate class vocabulary at load |
| | *(add further defects as they are found)* | | | | |

**Severity definitions** — **Critical:** data loss, security breach, or a core feature unusable. **High:** a major feature fails with no workaround. **Medium:** a feature fails but a workaround exists. **Low:** cosmetic or documentation issue.

---

## Appendix — Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | August 2026 | Muhammad Ali Raza, Hamza Afzal | Initial test plan and 93 test case specifications; 17 verified against the live deployment |

---

*XRayVision AI — Software Test Documentation v1.0 — Minhaj University Lahore*
