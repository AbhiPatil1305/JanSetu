# JanSetu Frontend ↔ Kenneth Grievance-Backend Integration Audit

**Date:** November 4, 2026  
**Auditor:** Antigravity Pair Programmer  
**Frontend Source of Truth:** `JanSetu` (`/Users/abhishekpatil/Desktop/krishikalpa/JanSetu`)  
**Backend Source of Truth:** `grievance-backend` (`https://github.com/kennethjason07/grievance-backend.git`)  
**Protected Directory (Do Not Touch):** `Translator`  

---

## 1. Executive Summary

This audit provides a comprehensive, field-by-field and endpoint-by-endpoint inspection of both repositories to execute a screen-by-screen API integration without redesigning, replacing, or breaking existing JanSetu UI, routing, or UX flows.

The existing JanSetu frontend was designed with a dedicated API abstraction layer (`src/services/api/*`) that toggles via `USE_MOCK_API`. By configuring the central API client (`src/services/api/client.ts`) with token storage, authorization header injection, 401 refresh interceptors, and strict TypeScript interfaces matching the Pydantic schemas, we can incrementally connect each screen to Kenneth's FastAPI backend.

---

## 2. Technology Stacks

### Frontend (`JanSetu`)
* **Framework:** React 18.3.1 (Vite 5.4.11) with TypeScript 5.6.3
* **Routing:** `react-router-dom` v6.28.0 (Hierarchical role-based routes with `ProtectedRoute`)
* **Styling:** Tailwind CSS 3.4.15 + Lucide React icons
* **State & Context:**
  * `AuthContext.tsx`: Session persistence, role state, current user
  * `LanguageContext.tsx`: Bilingual engine (English & Kannada `kn`)
  * `NotificationContext.tsx`: In-app toast alerts & unread badge counters
* **Dev Server:** Running on `http://localhost:3000`

### Backend (`grievance-backend`)
* **Framework:** FastAPI 0.162.0 + Python 3.10/3.11+
* **ORM & Database:** SQLAlchemy 2.1.8 + Alembic 1.20.1 + PostgreSQL 17 (`psycopg 3.3.7`)
* **Authentication:** Stateless JWT (`python-jose[cryptography]` + `bcrypt` 4.3.0)
* **Access Tokens:** 60-minute expiry (`HS256`)
* **Refresh Tokens:** 7-day expiry
* **CORS Settings:** Configured to allow `http://localhost:3000` and `http://localhost:8000`
* **Base URL:** `http://localhost:8000/api/v1`

---

## 3. Role & Permission Mapping Architecture

The JanSetu frontend strictly enforces a 3-role government model. The backend enforces a 6-role permission matrix. The mapping is designed as follows:

| JanSetu Frontend Role | Backend System Role | Role Scope & Permissions |
| :--- | :--- | :--- |
| **`DC_MAIN_ADMIN`** | `SUPER_ADMIN` *(fallback: `DEPARTMENT_ADMIN`)* | System-wide authority. Manages departments, offices, users, policies, reviews escalations, closes/reopens grievances, views audit logs. |
| **`DC_PA`** *(Personal Assistant)* | `SUPERVISOR` *(or `DATA_ENTRY_OPERATOR`)* | Department-level intake & triage. Registers grievances, confirms departments, assigns officers, schedules follow-ups, evaluates escalations. |
| **`POLICE_OFFICER`** | `OFFICER` | Operational officer. Views assigned grievances, logs follow-up actions (calls, visits, document requests), submits progress updates, submits formal resolution. |

> **Security Rule:** The frontend will never elevate permissions locally. The JWT token payload issued by the backend carries the authoritative `role` and `user_id`. Frontend routes are guarded based on mapped roles, and every API request sends `Authorization: Bearer <access_token>`.

---

## 4. Complete Backend API Inventory (Source of Truth)

All endpoints reside under the `/api/v1` prefix:

### 4.1 Authentication (`/auth`)
* `POST /api/v1/auth/login`
  * **Payload:** `{ email: string, password: string }`
  * **Response:** `{ access_token: string, refresh_token: string, token_type: "bearer" }`
  * **Errors:** `401 Unauthorized` (invalid creds), `403 Forbidden` (inactive/unverified)
* `POST /api/v1/auth/refresh`
  * **Payload:** `{ refresh_token: string }`
  * **Response:** `{ access_token: string, token_type: "bearer" }`
* `GET /api/v1/auth/me`
  * **Headers:** `Authorization: Bearer <access_token>`
  * **Response:** `{ id: UUID, full_name: string, email: string, role: string, department_id: UUID | null, office_id: UUID | null, is_active: boolean, is_verified: boolean }`
* `POST /api/v1/auth/logout`
  * **Headers:** `Authorization: Bearer <access_token>`
  * **Response:** `{"message": "Successfully logged out."}`

### 4.2 Grievance Management (`/grievances`)
* `POST /api/v1/grievances`
  * **Permission:** `create_grievance`
  * **Payload:** `GrievanceCreate` (`title`, `description`, `source`, `original_language`, `priority`, `suggested_department_id?`, `office_id?`, `category_id?`, `neutral_summary?`, `translated_language?`, `translated_text?`, `estimated_resolution_date?`)
  * **Response:** `GrievanceDetailResponse` (includes auto-generated sequential number e.g. `GRV-2026-00001`, initial status `NEW`)
* `POST /api/v1/grievances/{id}/confirm-department`
  * **Payload:** `{ department_id: UUID, confirmation_notes?: string }`
  * **Response:** `GrievanceDetailResponse` (transitions status `NEW` -> `UNDER_REVIEW`)
* `GET /api/v1/grievances`
  * **Permission:** `view_grievance`
  * **Query Params:** `page` (default 1), `page_size` (default 20), `status`, `priority`, `department_id`, `office_id`, `assigned_to_user_id`, `date_from`, `date_to`, `search`
  * **Response:** `PaginatedGrievanceResponse` `{ items: GrievanceListResponse[], total, page, page_size, total_pages }`
* `GET /api/v1/grievances/{id}`
  * **Permission:** `view_grievance`
  * **Response:** `GrievanceDetailResponse`
* `PATCH /api/v1/grievances/{id}`
  * **Permission:** `edit_grievance`
  * **Payload:** `GrievanceUpdate` (only permitted: `title`, `description`, `neutral_summary`, `priority`, `category_id`, `translated_text`, `estimated_resolution_date`. Extra fields forbidden with 422)

### 4.3 Assignment & Workload (`/grievances/{id}/assign`, `/officers`)
* `POST /api/v1/grievances/{id}/assign`
  * **Permission:** `assign_grievance`
  * **Payload:** `{ officer_id: UUID, remarks?: string }`
  * **Response:** `AssignmentResponse` (status transitions to `ASSIGNED`)
* `POST /api/v1/grievances/{id}/reassign`
  * **Permission:** `assign_grievance`
  * **Payload:** `{ officer_id: UUID, reassignment_reason: string }`
  * **Response:** `AssignmentResponse`
* `GET /api/v1/grievances/{id}/assignments`
  * **Response:** `AssignmentHistoryResponse` (full chronological assignment audit)
* `GET /api/v1/officers/me/assignments`
  * **Response:** `PaginatedGrievanceResponse` (cases assigned to logged-in officer)
* `GET /api/v1/officers/me/workload`
  * **Response:** `OfficerWorkloadResponse` (`assigned_count`, `in_progress_count`, `awaiting_information_count`, `resolved_count`, `total_active_workload`)
* `GET /api/v1/officers/{id}/workload`
  * **Response:** `OfficerWorkloadResponse`

### 4.4 Lifecycle Transitions (`/grievances/{id}/*`)
* `POST /api/v1/grievances/{id}/start`: Transitions `ASSIGNED` -> `IN_PROGRESS`
* `POST /api/v1/grievances/{id}/request-information`: Payload `{ information_required: string, next_follow_up_at?: datetime }`, transitions to `AWAITING_INFORMATION`
* `POST /api/v1/grievances/{id}/resume`: Payload `{ information_received?: string, notes?: string }`, transitions back to `IN_PROGRESS`
* `POST /api/v1/grievances/{id}/resolve`: Payload `{ resolution_summary: string, resolution_details: string, supporting_notes?: string, resolution_date?: datetime }`, transitions to `RESOLVED`
* `POST /api/v1/grievances/{id}/close`: Requires `close_grievance`. Payload `{ closure_reason: string, closure_notes?: string }`, transitions to `CLOSED`
* `POST /api/v1/grievances/{id}/reopen`: Requires `reopen_grievance`. Payload `{ reopen_reason: string }`, transitions `RESOLVED` -> `IN_PROGRESS`
* `GET /api/v1/grievances/{id}/timeline`: Unified timeline of all transitions and administrative events (`TimelineResponse`)

### 4.5 Follow-up Engine (`/follow-up-tasks`, `/policies`)
* `POST /api/v1/grievances/{id}/schedule-follow-up`: Payload `{ due_at: datetime, assigned_to_user_id?: UUID, policy_id?: UUID }`
* `GET /api/v1/follow-up-tasks`: Query `grievance_id`, `status`, `overdue_only`, `page`, `page_size`
* `GET /api/v1/follow-up-tasks/{id}`
* `PATCH /api/v1/follow-up-tasks/{id}/cancel`
* `POST /api/v1/follow-up-tasks/{task_id}/actions`: Payload `FollowUpActionCreate` (`action_type`, `description`, `outcome`, `response_received`, `action_taken_at`, `next_follow_up_at`)
* `GET /api/v1/follow-up-tasks/{task_id}/actions`
* `GET /api/v1/grievances/{id}/follow-up-actions`
* `GET /api/v1/policies`: List policies
* `POST /api/v1/policies`: Create policy (`first_reminder_after_days`, `reminder_interval_days`, `escalation_after_days`, `max_reminders`)
* `PATCH /api/v1/policies/{id}`

### 4.6 Escalations (`/escalations`)
* `GET /api/v1/escalations`: Query `grievance_id`, `status` (`PENDING`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`), `page`, `page_size`
* `GET /api/v1/escalations/{id}`
* `PATCH /api/v1/escalations/{id}/acknowledge`
* `PATCH /api/v1/escalations/{id}/resolve`: Payload `{ resolution_notes?: string }`
* `PATCH /api/v1/escalations/{id}/dismiss`: Payload `{ reason: string }`
* `POST /api/v1/escalations/process-due`: Trigger batch evaluation

### 4.7 Notifications (`/notifications`)
* `GET /api/v1/notifications`: Scoped to user/department
* `GET /api/v1/notifications/{id}`
* `PATCH /api/v1/notifications/{id}/acknowledge`
* `POST /api/v1/notifications/process-reminders`: Batch reminder evaluation

### 4.8 Departments, Offices & Users
* `GET /api/v1/departments`, `POST /api/v1/departments`, `PATCH /api/v1/departments/{id}`, `PATCH /api/v1/departments/{id}/status`
* `GET /api/v1/offices`, `POST /api/v1/offices`, `PATCH /api/v1/offices/{id}`, `PATCH /api/v1/offices/{id}/status`
* `GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/{id}`, `PATCH /api/v1/users/{id}/status`, `PATCH /api/v1/users/{id}/role`

---

## 5. Screen-by-Screen Integration Blueprint

| Screen Order | Screen Path & Component | Data Requirements | Matching Backend Endpoint | Status / Remarks |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Login (`/login`)** `LoginPage.tsx` | Email/password validation, JWT tokens, profile retrieval, role-based redirect | `POST /auth/login`<br>`GET /auth/me`<br>`POST /auth/refresh`<br>`POST /auth/logout` | **Phase 3 Priority 1** (Ready to integrate) |
| **2** | **Admin Dashboard (`/admin/dashboard`)** `AdminDashboard.tsx` | Total complaints, open, resolved, escalations, overdue tasks | `GET /grievances` (with status filters & total count)<br>`GET /escalations`<br>`GET /follow-up-tasks?overdue_only=true` | Client-side aggregation of live counts |
| **3** | **PA Dashboard (`/pa/dashboard`)** `PaDashboard.tsx` | Unassigned cases, pending follow-ups, escalations, recent list | `GET /grievances?status=NEW`<br>`GET /follow-up-tasks?overdue_only=true`<br>`GET /escalations?status=PENDING` | Fully supported |
| **4** | **Register Complaint (`/pa/register-complaint`)** `RegisterComplaintPage.tsx` | Create grievance record, department confirmation | `POST /grievances`<br>`POST /grievances/{id}/confirm-department` | Supported (document upload pending endpoint) |
| **5** | **Complaints List (`/admin/complaints`, `/pa/complaints`)** `ComplaintsListPage.tsx` | Paginated search, filters by status, priority, dept, station | `GET /grievances` (with all query filters) | Direct 1:1 match |
| **6** | **Case Details (`/admin/complaints/:id`, `/pa/complaints/:id`, `/officer/cases/:id`)** `CaseDetailsView.tsx` | Grievance details, timeline, assignment history, follow-up actions | `GET /grievances/{id}`<br>`GET /grievances/{id}/timeline`<br>`GET /grievances/{id}/assignments`<br>`GET /grievances/{id}/follow-up-actions` | 100% covered across 4 backend endpoints |
| **7** | **Departments & Stations (`/admin/departments`, `/admin/stations`)** `DepartmentsPage.tsx`, `PoliceStationsPage.tsx` | CRUD operations for departments and police stations | `GET /departments`, `POST /departments`, `PATCH /departments/{id}`<br>`GET /offices`, `POST /offices`, `PATCH /offices/{id}` | Supported |
| **8** | **Officer Assignment Modal / View** `CaseDetailsView.tsx` (Assignment tab) | List eligible officers, assign grievance, reassign grievance | `GET /users?role_id={officer_role_id}`<br>`POST /grievances/{id}/assign`<br>`POST /grievances/{id}/reassign` | Supported |
| **9** | **Police Officer Dashboard & Cases (`/officer/dashboard`, `/officer/cases`)** `OfficerDashboard.tsx`, `OfficerCasesPage.tsx` | Officer's assigned cases, workload statistics | `GET /officers/me/assignments`<br>`GET /officers/me/workload` | Dedicated backend endpoints implemented |
| **10** | **Progress Updates (`/officer/cases/:id/update`)** `SubmitProgressPage.tsx` | Start case, request info, resume investigation, log actions | `POST /grievances/{id}/start`<br>`POST /grievances/{id}/request-information`<br>`POST /grievances/{id}/resume`<br>`POST /follow-up-tasks/{task_id}/actions` | Supported |
| **11** | **Follow-up Management (`/admin/followups`, `/pa/followups`)** `FollowupsMonitoringPage.tsx` | List follow-up tasks, schedule task, cancel task | `GET /follow-up-tasks`<br>`POST /grievances/{id}/schedule-follow-up`<br>`PATCH /follow-up-tasks/{id}/cancel` | Supported |
| **12** | **Escalation Management (`/admin/escalations`, `/pa/escalations`)** `EscalationsPage.tsx` | List escalations, acknowledge, resolve, dismiss, batch trigger | `GET /escalations`<br>`PATCH /escalations/{id}/acknowledge`<br>`PATCH /escalations/{id}/resolve`<br>`PATCH /escalations/{id}/dismiss`<br>`POST /escalations/process-due` | Supported |
| **13** | **Notifications (`/officer/notifications`, header badge)** `OfficerNotificationsPage.tsx`, `AppHeader.tsx` | In-app alerts, acknowledge notification | `GET /notifications`<br>`PATCH /notifications/{id}/acknowledge` | Supported |
| **14** | **Reports & Analytics (`/admin/reports`, `/pa/reports`)** `ReportsPage.tsx` | Aggregated SLA, turnaround, monthly distribution | Derived from `GET /grievances` & `GET /escalations` | See Backend Gaps |
| **15** | **User Management & Audit Logs (`/admin/users`, `/admin/audit-logs`, `/admin/reminder-settings`)** | Users CRUD, policies CRUD, global audit logs | Users & Policies: Supported.<br>Global Audit Logs: See Backend Gaps | See Backend Gaps |

---

## 6. Identified Backend Gaps & Safe Fallback Strategy

See complete itemization in `BACKEND_GAPS.md`.
1. **Dedicated Aggregated Reports/KPI API:** Not yet implemented in Kenneth's backend (`/reports` router commented out). *Fallback:* Calculate metrics from existing paginated endpoints or show live counts.
2. **Global System-wide Audit Log API:** The `ActivityLog` table exists, and individual grievance timelines are supported (`/grievances/{id}/timeline`), but `/api/v1/audit-logs` is not yet mounted. *Fallback:* Provide a clear UI notice or scoped timeline view.
3. **Binary Document Upload API:** `Document` table exists, but no multipart file upload endpoint (`POST /documents`) is mounted. *Fallback:* Keep document metadata or mock attachments until Kenneth mounts the document router.
