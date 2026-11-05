# JanSetu (ಜನಸೇತು)
> **Connecting Citizens. Ensuring Accountability.**  
> *Government Grievance Tracking and Follow-up Management Platform*  
> **Primary Pilot Department:** Karnataka State Police / Home Department

---

## 1. Project Overview

**JanSetu** is a production-grade, government enterprise web platform engineered to ensure that every citizen complaint registered in the district is immediately assigned to an accountable police officer, followed up on time with statutory deadlines, monitored transparently, and resolved with an immutable audit record.

This frontend is designed as a standalone, production-quality interface ready for subsequent backend integration. It provides realistic local mock datasets, reactive storage with local persistence, full bilingual translation support (English & ಕನ್ನಡ), and role-tailored interfaces for all three administrative tiers.

---

## 2. Mandatory User Roles

The platform enforces strict role boundaries across exactly three roles:

| Role Code | Official Title | Primary Responsibilities |
|---|---|---|
| **`DC_MAIN_ADMIN`** | Deputy Commissioner & District Magistrate | District-wide grievance oversight, departmental compliance metrics, police station and officer management, escalation reviews & formal orders, user access management, reminder thresholds, and audit trail inspection. |
| **`DC_PA`** | Personal Assistant to Deputy Commissioner | Ingestion of citizen petitions (PDF / Scanned Images), OCR extraction & AI bilingual summary verification, completing citizen jurisdiction details, cascading officer assignment in a single continuous workflow, follow-up monitoring, communication logging, and escalation recommendations. |
| **`POLICE_OFFICER`** | Station House Officer / Investigating Officer | Access to assigned grievances strictly within jurisdiction, acknowledging assignments, submitting progress updates with action taken and next follow-up dates, submitting delay justifications for overdue cases, and submitting final resolutions for verification. |

> [!NOTE]
> There is **no** Case Entry Operator role. The DC PA handles the full ingestion, verification, and assignment lifecycle in one continuous workflow.

---

## 3. Demo Login Credentials

A local demonstration access system is integrated directly into the common login screen with one-click credential autofill:

| Role | Demo Email | Demo Employee ID | Demo Password | Default Redirect Route |
|---|---|---|---|---|
| **DC Main Admin** | `admin@jansetu.demo` | `IAS-KN-2012-088` | `JanSetu@123` | `/admin/dashboard` |
| **DC PA** | `pa@jansetu.demo` | `KGS-PA-2018-401` | `JanSetu@123` | `/pa/dashboard` |
| **Police Officer** | `officer@jansetu.demo` | `KSP-PI-2015-1102` | `JanSetu@123` | `/officer/dashboard` |

*(Any password or the demo password `JanSetu@123` is accepted in the demo environment).*

---

## 4. Primary Guided Workflow: DC PA Registration & Assignment

Navigate to `/pa/register-complaint`:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 1: Document Upload (PDF, JPG, Scanned Kannada/English petitions) │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 2: OCR & AI Extraction Review                                    │
│ - Side-by-side: Original document viewer on left, OCR text on right    │
│ - Bilingual summaries (English & Kannada)                              │
│ - AI-suggested fields with Confidence Badges (High / Review / Missing)  │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 3: Complete Case Form                                            │
│ - Citizen details & taluk/locality jurisdiction                        │
│ - Cascading selectors: Department ➔ Police Station ➔ Officer           │
│ - Priority selection (Low, Medium, High, Critical)                     │
│ - Initial follow-up date picker & assignment instructions              │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Stage 4: Final Review and REGISTER & ASSIGN                            │
│ - Verified confirmation certification checkbox                         │
│ - Generates unique Case ID (e.g. JNS-2026-BLR-0042)                    │
│ - Creates first follow-up schedule and logs append-only audit event    │
│ - Dispatches in-app notification to the assigned police officer        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack & Design System

- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with official government brand tokens:
  - Primary Navy: `#1E293B`
  - Secondary Navy: `#334155`
  - Gold Accent: `#F59E0B`
  - Clean Background: `#F8FAFC`
  - Text & Accents: `#0F172A`, `#64748B`, `#16A34A`, `#D97706`, `#DC2626`, `#2563EB`
- **Typography**: Inter & Noto Sans Kannada (Unicode Kannada support)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router DOM (v6) with ProtectedRoute guards
- **API Architecture**: Modular Client & Service Layer (`services/api/*`) backed by reactive local storage (`services/mock/*`)

---

## 6. Frontend API Contract for Backend Developer

The frontend accesses all data through typed service classes in `src/services/api/`. To connect a real backend, set `VITE_USE_MOCK_API=false` and configure `VITE_API_BASE_URL` in `.env`.

### Required Backend Endpoints:

#### Authentication (`/api/v1/auth`)
- `POST /login` $\to$ `{ emailOrEmployeeId, password }` $\to$ Returns `{ user, token, expiresAt }`
- `POST /logout` $\to$ Invalidates token
- `GET /users` $\to$ Returns list of users
- `POST /users` $\to$ Create user
- `PUT /users/:id` $\to$ Update user details

#### Complaints & Grievances (`/api/v1/complaints`)
- `GET /complaints` $\to$ Query params: `search`, `departmentId`, `stationId`, `officerId`, `status`, `priority`, `isOverdue`, `isEscalated`, `page`, `pageSize`
- `GET /complaints/:id` $\to$ Returns single complaint with citizen details, documents, extraction, assignment, progress updates, resolution, and timeline
- `POST /complaints` $\to$ Registers a new complaint and assigns officer
- `PUT /complaints/:id` $\to$ Update complaint details
- `POST /complaints/:id/assign` $\to$ Reassign police officer
- `POST /complaints/:id/progress` $\to$ Post progress update with next follow-up date
- `POST /complaints/:id/resolution` $\to$ Post resolution submission for review
- `POST /complaints/:id/review-resolution` $\to$ Approve or reject submitted resolution

#### Departments & Police Stations (`/api/v1/departments`)
- `GET /departments` $\to$ List departments
- `POST /departments` $\to$ Create department
- `PUT /departments/:id` $\to$ Update department
- `GET /stations?departmentId=:id` $\to$ List police stations
- `POST /stations` $\to$ Create police station
- `PUT /stations/:id` $\to$ Update police station

#### Officers (`/api/v1/officers`)
- `GET /officers?stationId=:id` $\to$ List officers
- `GET /officers/:id` $\to$ Single officer profile
- `POST /officers` $\to$ Enroll new officer
- `PUT /officers/:id` $\to$ Update officer profile

#### Follow-ups & Reminders (`/api/v1/followups`)
- `GET /followups?filter=:filter` $\to$ Due today, overdue, upcoming, etc.
- `POST /followups/:complaintId/remind` $\to$ Dispatch urgent reminder
- `POST /communications` $\to$ Record phone call, email, letter, or memo
- `GET /communications?complaintId=:id` $\to$ List logged communications

#### Escalations (`/api/v1/escalations`)
- `GET /escalations?status=:status` $\to$ List escalation requests
- `POST /escalations` $\to$ PA creates escalation request
- `POST /escalations/:id/decide` $\to$ DC Admin approves or rejects with executive remarks

#### Documents & OCR Extraction (`/api/v1/documents`)
- `POST /documents/extract-text` $\to$ Pre-registration text extraction (`file`, `languages=eng+kan`) from PDF/DOCX/images
- `GET /documents/ocr/status` $\to$ Returns Tesseract OCR installation status, version, and language models (`eng`, `kan`)
- `POST /grievances/:id/documents` $\to$ Attach binary document file to registered grievance
- `GET /grievances/:id/documents` $\to$ List attachments for a grievance
- `GET /documents/:id/download` $\to$ Binary document preview or attachment download
- `POST /documents/:id/ocr` $\to$ Trigger OCR extraction on an attached document
- `GET /documents/:id/ocr` $\to$ Fetch OCR extraction and review state
- `PATCH /documents/:id/ocr/review` $\to$ Save human-reviewed / corrected text without altering raw OCR

#### Reports & Audit (`/api/v1/reports`, `/api/v1/audit`)
- `GET /reports/dashboard` $\to$ Aggregated KPI statistics
- `GET /reports/departments` $\to$ Department compliance rates
- `GET /reports/officers` $\to$ Officer compliance index
- `GET /audit-logs` $\to$ Immutable audit trail with filtering
- `GET /settings/reminder-rules` $\to$ Get reminder configuration
- `PUT /settings/reminder-rules` $\to$ Update reminder rules

---

## 7. Running the Application

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Access at `http://localhost:3000`.

### Production Build
```bash
npm run build
npm run preview
```

### Resetting Demo Data
At any time during testing, click your profile in the top right header and select **"Reset Demo Data to Initial State"**, or visit `/admin/settings`.
