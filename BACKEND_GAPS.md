# JanSetu ↔ Backend Gaps & Requirements

This document records missing backend endpoints, schema discrepancies, and proposed requests for the backend developer (Kenneth).

---

## Gap 1: Dedicated Dashboard & Reporting Metrics Endpoint

### Current State
* Kenneth's backend plans for `/reports` in `router.py` line 127: `# api_v1_router.include_router(reports_router, prefix="/reports", tags=["Reports"])`, but the router is currently not implemented.
* The frontend admin and PA dashboards display 8 KPIs (Total Complaints, Open Cases, Escalated Cases, Resolved Cases, SLA Compliance Rate, Average Resolution Time, High Priority Unassigned, Overdue Follow-ups).

### Requested Backend Feature
* **Endpoint:** `GET /api/v1/reports/kpis`
* **Response Model:**
  ```json
  {
    "total_complaints": 1420,
    "open_cases": 84,
    "escalated_cases": 12,
    "resolved_cases": 1336,
    "sla_compliance_percentage": 94.2,
    "avg_resolution_days": 4.6,
    "high_priority_unassigned": 3,
    "overdue_followups": 9
  }
  ```

### Frontend Safe Handling
* The frontend will compute live summary counts from `GET /api/v1/grievances`, `GET /api/v1/escalations?status=PENDING`, and `GET /api/v1/follow-up-tasks?overdue_only=true`.

---

## Gap 2: System-Wide Audit Log Listing Endpoint

### Current State
* The backend has an `ActivityLog` model (`app/models/activity_log.py`) and records every transition, assignment, escalation, and action.
* Case-level timeline is fully implemented via `GET /api/v1/grievances/{id}/timeline`.
* However, there is no root endpoint to list recent system-wide audit logs across all departments for the DC Main Admin (`/admin/audit-logs`).

### Requested Backend Feature
* **Endpoint:** `GET /api/v1/audit-logs`
* **Query Parameters:** `page`, `page_size`, `department_id`, `action`, `date_from`, `date_to`
* **Response Model:** Paginated list of activity log records.

### Frontend Safe Handling
* Mark the global audit logs screen with a status indicator informing that system-level logs will load as soon as the backend endpoint is exposed; in the meantime, case-specific timelines on the Case Details screen work via `/grievances/{id}/timeline`.

---

## Gap 3: Multipart Document Attachment / Upload Endpoint

### Current State
* `app/models/document.py` exists with file storage metadata (`file_name`, `file_path`, `mime_type`, `file_size_bytes`).
* No router for `/api/v1/documents` or file upload handler is mounted in `app/api/v1/router.py`.

### Requested Backend Feature
* **Endpoint:** `POST /api/v1/grievances/{id}/documents` (multipart/form-data)
* **Response Model:**
  ```json
  {
    "id": "uuid",
    "grievance_id": "uuid",
    "file_name": "complaint_letter.pdf",
    "file_url": "/static/uploads/complaint_letter.pdf",
    "uploaded_at": "2026-11-04T13:00:00Z"
  }
  ```

### Frontend Safe Handling
* File upload inputs in Register Complaint and Submit Progress will validate file type/size on client, store document metadata, and notify the user that file persistence requires the backend document storage endpoint.

---

## Gap 4: Role-Based User Demo Accounts / Seeding

### Current State
* `seed.py` seeds system roles (`SUPER_ADMIN`, `DEPARTMENT_ADMIN`, `SUPERVISOR`, `OFFICER`, `DATA_ENTRY_OPERATOR`, `VIEWER`), but does not seed sample user accounts with known passwords.
* Tests create users on-the-fly inside `grievance_test_db`.

### Recommendation
* For local development and demonstration, provide a seeder or provision 3 standard demo users in `grievance_db`:
  1. `admin@jansetu.demo` (`SUPER_ADMIN`)
  2. `pa@jansetu.demo` (`SUPERVISOR`)
  3. `officer@jansetu.demo` (`OFFICER`)
