import {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  ProgressUpdate,
  ResolutionSubmission,
} from '../../types/complaint';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, delay, ApiError, USE_MOCK_API, isUuid, API_BASE_URL } from './client';

export interface ComplaintFilters {
  search?: string;
  departmentId?: string;
  stationId?: string;
  officerId?: string;
  status?: string;
  priority?: string;
  isOverdue?: boolean;
  isEscalated?: boolean;
  isAwaitingAssignment?: boolean;
  dueToday?: boolean;
  page?: number;
  pageSize?: number;
}

export interface BackendGrievanceListResponse {
  id: string;
  grievance_number: string;
  title: string;
  neutral_summary?: string | null;
  source: string;
  status: string;
  priority: string;
  date_received: string;
  suggested_department_id?: string | null;
  confirmed_department_id?: string | null;
  assigned_to_user_id?: string | null;
  next_follow_up_at?: string | null;
  created_at: string;
}

export interface BackendGrievanceDetailResponse {
  id: string;
  grievance_number: string;
  title: string;
  description: string;
  neutral_summary?: string | null;
  source: string;
  original_language: string;
  translated_language?: string | null;
  original_text?: string | null;
  translated_text?: string | null;
  suggested_department_id?: string | null;
  confirmed_department_id?: string | null;
  category_id?: string | null;
  office_id?: string | null;
  assigned_to_user_id?: string | null;
  status: string;
  priority: string;
  date_received: string;
  estimated_resolution_date?: string | null;
  last_action_at?: string | null;
  next_follow_up_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedGrievanceResponse {
  items: BackendGrievanceListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

function mapBackendStatusToFrontend(status: string): ComplaintStatus {
  switch (status.toUpperCase()) {
    case 'NEW':
      return 'AWAITING_ASSIGNMENT';
    case 'UNDER_REVIEW':
      return 'AWAITING_ASSIGNMENT';
    case 'ASSIGNED':
      return 'ASSIGNED';
    case 'IN_PROGRESS':
      return 'UNDER_INVESTIGATION';
    case 'AWAITING_INFORMATION':
      return 'AWAITING_INFORMATION';
    case 'RESOLVED':
      return 'RESOLUTION_SUBMITTED';
    case 'CLOSED':
      return 'CLOSED';
    default:
      return 'AWAITING_ASSIGNMENT';
  }
}

function mapBackendPriorityToFrontend(priority: string): ComplaintPriority {
  switch (priority.toUpperCase()) {
    case 'URGENT':
      return 'CRITICAL';
    case 'HIGH':
      return 'HIGH';
    case 'LOW':
      return 'LOW';
    case 'MEDIUM':
    default:
      return 'MEDIUM';
  }
}

export function mapBackendGrievanceToComplaint(bg: BackendGrievanceDetailResponse | BackendGrievanceListResponse): Complaint {
  const isDetail = 'description' in bg;
  const status = mapBackendStatusToFrontend(bg.status);
  const priority = mapBackendPriorityToFrontend(bg.priority);

  const registeredDate = bg.date_received
    ? bg.date_received.replace('T', ' ').substring(0, 19)
    : new Date().toISOString().replace('T', ' ').substring(0, 19);

  const daysPending = Math.max(
    0,
    Math.floor((Date.now() - new Date(bg.date_received).getTime()) / (1000 * 60 * 60 * 24))
  );

  const operationalFlags: ('OVERDUE' | 'ESCALATED' | 'NO_RECENT_UPDATE')[] = [];
  if (daysPending > 7 && status !== 'CLOSED' && status !== 'RESOLUTION_SUBMITTED') {
    operationalFlags.push('OVERDUE');
  }

  const complaint: Complaint = {
    id: bg.id,
    citizen: {
      name: 'Citizen Complainant',
      phone: '+91 98450 12345',
      address: 'Bengaluru, Karnataka',
      district: 'Bengaluru Urban',
      taluk: 'Bengaluru North',
      villageLocality: 'Central',
    },
    details: {
      title: bg.title,
      description: isDetail ? (bg as BackendGrievanceDetailResponse).description : (bg.neutral_summary || bg.title),
      category: 'Police & Public Safety',
      incidentDate: bg.date_received.split('T')[0],
      incidentLocation: 'Bengaluru, Karnataka',
      requestedAction: 'Formal investigation and legal action',
      language: 'english',
      referenceNumber: bg.grievance_number,
    },
    documents: [],
    status,
    registeredAt: registeredDate,
    lastUpdatedAt: bg.created_at.replace('T', ' ').substring(0, 19),
    daysPending,
    reminderCount: 0,
    isEscalated: false,
    operationalFlags,
    progressUpdates: [],
  };

  if (bg.assigned_to_user_id) {
    complaint.assignment = {
      departmentId: bg.confirmed_department_id || bg.suggested_department_id || 'POL',
      departmentName: 'Police Department',
      stationId: ('office_id' in bg ? (bg as BackendGrievanceDetailResponse).office_id : null) || 'CPS-01',
      stationName: 'Central Police Station',
      officerId: bg.assigned_to_user_id,
      officerName: 'Assigned Investigating Officer',
      officerDesignation: 'Inspector of Police',
      priority,
      initialFollowupDate: bg.date_received.split('T')[0],
      nextFollowupDate: bg.next_follow_up_at ? bg.next_follow_up_at.split('T')[0] : new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      instructions: 'Conduct immediate inquiry and report findings.',
      assignedAt: bg.date_received.replace('T', ' ').substring(0, 19),
      assignedBy: 'Personal Assistant (PA)',
    };
  }

  return complaint;
}

class ComplaintsService {
  async getComplaints(filters?: ComplaintFilters): Promise<Complaint[]> {
    if (USE_MOCK_API) {
      await delay(70);
      let list = mockStorage.getComplaints();
      if (!filters) return list;

      const today = new Date().toISOString().split('T')[0];
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        list = list.filter(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.citizen.name.toLowerCase().includes(q) ||
            c.citizen.phone.includes(q) ||
            c.details.title.toLowerCase().includes(q)
        );
      }
      if (filters.departmentId) list = list.filter((c) => c.assignment?.departmentId === filters.departmentId);
      if (filters.stationId) list = list.filter((c) => c.assignment?.stationId === filters.stationId);
      if (filters.officerId) list = list.filter((c) => c.assignment?.officerId === filters.officerId);
      if (filters.status) list = list.filter((c) => c.status === filters.status);
      if (filters.isOverdue) list = list.filter((c) => c.operationalFlags.includes('OVERDUE'));
      if (filters.isEscalated) list = list.filter((c) => c.isEscalated || c.operationalFlags.includes('ESCALATED'));
      if (filters.dueToday) list = list.filter((c) => c.assignment?.nextFollowupDate === today);
      return list;
    }

    // Real backend API call: GET /api/v1/grievances
    const params: Record<string, any> = {
      page: filters?.page || 1,
      page_size: filters?.pageSize || 50,
    };

    if (filters?.search) params.search = filters.search;
    if (filters?.departmentId && isUuid(filters.departmentId)) params.department_id = filters.departmentId;
    if (filters?.stationId && isUuid(filters.stationId)) params.office_id = filters.stationId;
    if (filters?.officerId && isUuid(filters.officerId)) params.assigned_to_user_id = filters.officerId;

    if (filters?.status) {
      if (filters.status === 'AWAITING_ASSIGNMENT') params.status = 'NEW';
      else if (filters.status === 'ASSIGNED') params.status = 'ASSIGNED';
      else if (filters.status === 'UNDER_INVESTIGATION') params.status = 'IN_PROGRESS';
      else if (filters.status === 'AWAITING_INFORMATION') params.status = 'AWAITING_INFORMATION';
      else if (filters.status === 'RESOLUTION_SUBMITTED') params.status = 'RESOLVED';
      else if (filters.status === 'CLOSED') params.status = 'CLOSED';
      else params.status = filters.status;
    }

    if (filters?.priority) {
      params.priority = filters.priority === 'CRITICAL' ? 'URGENT' : filters.priority;
    }

    const data = await apiClient.get<PaginatedGrievanceResponse>('/grievances', { params });
    return (data.items || []).map(mapBackendGrievanceToComplaint);
  }

  async getComplaintById(id: string): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(60);
      const complaint = mockStorage.getComplaintById(id);
      if (!complaint) throw new ApiError(`Complaint with ID ${id} not found`, 404);
      return complaint;
    }

    const detail = await apiClient.get<BackendGrievanceDetailResponse>(`/grievances/${id}`);
    const complaint = mapBackendGrievanceToComplaint(detail);
    try {
      const docs = await apiClient.get<any[]>(`/grievances/${id}/documents`);
      if (Array.isArray(docs) && docs.length > 0) {
        complaint.documents = docs.map((d: any) => ({
          id: d.id,
          name: d.document_name || d.original_filename || 'Petition Document',
          size: d.file_size || 0,
          type: d.mime_type || 'application/pdf',
          url: d.download_url ? `${API_BASE_URL}${d.download_url}` : '#',
          uploadedAt: d.created_at ? d.created_at.replace('T', ' ').substring(0, 19) : '',
          isOriginal: true,
          ocrStatus: d.ocr_status || 'NOT_STARTED',
          ocrLanguage: d.ocr_language,
          ocrProcessedAt: d.ocr_processed_at,
          ocrError: d.ocr_error,
        }));
      }
    } catch {
      // Keep case details view resilient if documents endpoint is momentarily unavailable
    }
    return complaint;
  }

  async createComplaint(
    data: Omit<Complaint, 'id' | 'registeredAt' | 'lastUpdatedAt' | 'daysPending' | 'reminderCount' | 'progressUpdates' | 'isEscalated'> & {
      progressUpdates?: ProgressUpdate[];
      isEscalated?: boolean;
    }
  ): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(120);
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const newId = `JNS-2026-BLR-${randomSeq}`;
      const newComplaint: Complaint = {
        ...data,
        id: newId,
        registeredAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        lastUpdatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        daysPending: 0,
        reminderCount: 0,
        isEscalated: data.isEscalated || false,
        operationalFlags: data.operationalFlags || [],
        progressUpdates: data.progressUpdates || [],
      };
      return mockStorage.addComplaint(newComplaint);
    }

    // 1. Post to Kenneth's POST /api/v1/grievances
    const payload = {
      title: data.details.title,
      description: data.details.description || data.details.title,
      source: 'IN_PERSON',
      original_language: data.details.language === 'kannada' ? 'kn' : 'en',
      priority: data.assignment?.priority === 'CRITICAL' ? 'URGENT' : (data.assignment?.priority || 'MEDIUM'),
      suggested_department_id: data.assignment?.departmentId || undefined,
      office_id: data.assignment?.stationId || undefined,
      neutral_summary: data.ocrAiExtraction?.englishSummary || data.details.description.substring(0, 200),
      translated_language: data.details.language === 'kannada' ? 'en' : undefined,
      translated_text: data.ocrAiExtraction?.englishTranslation || undefined,
    };

    const createdGrievance = await apiClient.post<BackendGrievanceDetailResponse>('/grievances', payload);

    // 2. If department and officer were provided, confirm department and assign
    if (data.assignment?.departmentId) {
      try {
        await apiClient.post(`/grievances/${createdGrievance.id}/confirm-department`, {
          department_id: data.assignment.departmentId,
          confirmation_notes: 'Confirmed upon intake at DC office',
        });
      } catch (err) {
        console.warn('Could not auto-confirm department:', err);
      }
    }

    if (data.assignment?.officerId) {
      try {
        await apiClient.post(`/grievances/${createdGrievance.id}/assign`, {
          officer_id: data.assignment.officerId,
          remarks: data.assignment.instructions || 'Assigned on registration',
        });
      } catch (err) {
        console.warn('Could not auto-assign officer:', err);
      }
    }

    // 3. If follow-up date was set, schedule follow-up task
    if (data.assignment?.nextFollowupDate) {
      try {
        await apiClient.post(`/grievances/${createdGrievance.id}/schedule-follow-up`, {
          due_at: new Date(data.assignment.nextFollowupDate).toISOString(),
          assigned_to_user_id: data.assignment.officerId || undefined,
        });
      } catch (err) {
        console.warn('Could not schedule follow-up task:', err);
      }
    }

    return mapBackendGrievanceToComplaint(createdGrievance);
  }

  async updateComplaint(id: string, updates: Partial<Complaint>): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(80);
      const updated = mockStorage.updateComplaint(id, updates);
      if (!updated) throw new ApiError('Complaint not found', 404);
      return updated;
    }

    const payload: Record<string, any> = {};
    if (updates.details?.title) payload.title = updates.details.title;
    if (updates.details?.description) payload.description = updates.details.description;
    if (updates.assignment?.priority) {
      payload.priority = updates.assignment.priority === 'CRITICAL' ? 'URGENT' : updates.assignment.priority;
    }

    if (updates.status === 'UNDER_INVESTIGATION') {
      try {
        await apiClient.post(`/grievances/${id}/start`);
      } catch (err) {
        console.warn('Could not auto-start investigation:', err);
      }
    }

    if (Object.keys(payload).length > 0) {
      const updated = await apiClient.patch<BackendGrievanceDetailResponse>(`/grievances/${id}`, payload);
      return mapBackendGrievanceToComplaint(updated);
    }
    return this.getComplaintById(id);
  }

  async startInvestigation(complaintId: string): Promise<Complaint> {
    if (USE_MOCK_API) {
      return this.updateComplaint(complaintId, { status: 'UNDER_INVESTIGATION' });
    }
    await apiClient.post(`/grievances/${complaintId}/start`);
    return this.getComplaintById(complaintId);
  }

  async getComplaintTimeline(complaintId: string): Promise<any[]> {
    if (USE_MOCK_API) return [];
    try {
      const res = await apiClient.get<any>(`/grievances/${complaintId}/timeline`);
      return res.timeline || [];
    } catch {
      return [];
    }
  }

  async assignOfficer(
    complaintId: string,
    assignment: NonNullable<Complaint['assignment']>
  ): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(100);
      const complaint = mockStorage.getComplaintById(complaintId);
      if (!complaint) throw new ApiError('Complaint not found', 404);
      const updated = mockStorage.updateComplaint(complaintId, { assignment, status: 'ASSIGNED' });
      if (!updated) throw new ApiError('Failed to assign officer', 500);
      return updated;
    }

    // 1. Confirm department if needed
    if (assignment.departmentId) {
      try {
        await apiClient.post(`/grievances/${complaintId}/confirm-department`, {
          department_id: assignment.departmentId,
          confirmation_notes: 'Department confirmed for officer assignment',
        });
      } catch (err) {
        // May already be confirmed
      }
    }

    // 2. Assign to officer (or reassign if already assigned)
    try {
      await apiClient.post(`/grievances/${complaintId}/assign`, {
        officer_id: assignment.officerId,
        remarks: assignment.instructions || 'Assigned by DC PA',
      });
    } catch (err: any) {
      if (
        err.message?.includes('already actively assigned') ||
        err.message?.includes('reassign endpoint') ||
        err.statusCode === 400
      ) {
        await apiClient.post(`/grievances/${complaintId}/reassign`, {
          officer_id: assignment.officerId,
          reassignment_reason: assignment.instructions || 'Reassigned by administrative officer',
        });
      } else {
        throw err;
      }
    }

    // 3. Schedule follow-up task if due date provided
    if (assignment.nextFollowupDate) {
      try {
        await apiClient.post(`/grievances/${complaintId}/schedule-follow-up`, {
          due_at: new Date(assignment.nextFollowupDate).toISOString(),
          assigned_to_user_id: assignment.officerId,
        });
      } catch (err) {
        console.warn('Could not schedule follow up:', err);
      }
    }

    return this.getComplaintById(complaintId);
  }

  async submitProgressUpdate(complaintId: string, update: ProgressUpdate): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(120);
      const updated = mockStorage.addProgressUpdate(complaintId, update);
      if (!updated) throw new ApiError('Failed to submit progress update', 500);
      return updated;
    }

    // 1. If currently in ASSIGNED status, transition to IN_PROGRESS via /start
    try {
      await apiClient.post(`/grievances/${complaintId}/start`);
    } catch {
      // Already started or transitioning
    }

    // 2. If status is awaiting info, call /request-information
    if (update.currentStatus === 'AWAITING_INFORMATION') {
      try {
        await apiClient.post(`/grievances/${complaintId}/request-information`, {
          information_required: update.progressDescription || 'Additional information requested',
          next_follow_up_at: update.nextFollowupDate ? new Date(update.nextFollowupDate).toISOString() : undefined,
        });
      } catch (err) {
        console.warn('Could not transition to awaiting information:', err);
      }
    }

    // 3. Record action against active follow-up task if present
    try {
      if (isUuid(complaintId)) {
        const tasks = await apiClient.get<any>('/follow-up-tasks', {
          params: { grievance_id: complaintId },
        });
        if (tasks.items && tasks.items.length > 0) {
          const activeTask = tasks.items.find((t: any) => t.status === 'SCHEDULED') || tasks.items[0];
          await apiClient.post(`/follow-up-tasks/${activeTask.id}/actions`, {
            action_type: 'FIELD_VISIT',
            description: `${update.actionTaken}: ${update.progressDescription || update.actionTaken}`,
            outcome: update.enquiryRemarks || 'Investigation update logged by officer',
            response_received: true,
            next_task_due_at: update.nextFollowupDate ? new Date(update.nextFollowupDate).toISOString() : undefined,
          });
        }
      }
    } catch (err) {
      console.warn('Could not log follow-up task action:', err);
    }

    return this.getComplaintById(complaintId);
  }

  async submitResolution(complaintId: string, resolution: ResolutionSubmission): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(120);
      const updated = mockStorage.submitResolution(complaintId, resolution);
      if (!updated) throw new ApiError('Failed to submit resolution', 500);
      return updated;
    }

    // Call Kenneth's POST /api/v1/grievances/{id}/resolve
    await apiClient.post(`/grievances/${complaintId}/resolve`, {
      resolution_summary: resolution.resolutionSummary,
      resolution_details: resolution.actionTaken,
      supporting_notes: resolution.additionalRemarks || undefined,
    });

    return this.getComplaintById(complaintId);
  }

  async reviewResolution(
    complaintId: string,
    reviewStatus: 'APPROVED' | 'REJECTED',
    reviewRemarks: string,
    reviewerName?: string
  ): Promise<Complaint> {
    if (USE_MOCK_API) {
      await delay(100);
      const complaint = mockStorage.getComplaintById(complaintId);
      if (!complaint || !complaint.resolution) throw new ApiError('Resolution not found', 404);
      complaint.resolution.reviewStatus = reviewStatus;
      complaint.resolution.reviewRemarks = reviewRemarks;
      if (reviewerName) complaint.resolution.reviewedBy = reviewerName;
      complaint.status = reviewStatus === 'APPROVED' ? 'CLOSED' : 'UNDER_INVESTIGATION';
      const updated = mockStorage.updateComplaint(complaintId, complaint);
      if (!updated) throw new ApiError('Failed to review resolution', 500);
      return updated;
    }

    if (reviewStatus === 'APPROVED') {
      // Administrative closure: POST /grievances/{id}/close
      await apiClient.post(`/grievances/${complaintId}/close`, {
        closure_reason: reviewRemarks || 'Resolution approved by administration',
        closure_notes: reviewRemarks,
      });
    } else {
      // Administrative reopen: POST /grievances/{id}/reopen
      await apiClient.post(`/grievances/${complaintId}/reopen`, {
        reopen_reason: reviewRemarks || 'Resolution rejected upon review; further inquiry mandated.',
      });
    }

    return this.getComplaintById(complaintId);
  }

  async uploadComplaintDocument(
    complaintId: string,
    file: File | Blob,
    filename: string,
    documentType: string = 'PETITION',
    language: string = 'en',
    documentName?: string
  ): Promise<any> {
    if (USE_MOCK_API) {
      await delay(100);
      return {
        id: `doc-${Date.now()}`,
        grievance_id: complaintId,
        document_name: documentName || filename,
        original_filename: filename,
        mime_type: (file as any).type || 'application/pdf',
        file_size: file.size,
        document_type: documentType,
        language,
        created_at: new Date().toISOString(),
      };
    }

    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('document_type', documentType);
    formData.append('language', language);
    if (documentName) {
      formData.append('document_name', documentName);
    }

    return apiClient.upload<any>(`/grievances/${complaintId}/documents`, formData);
  }

  async getComplaintDocuments(complaintId: string): Promise<any[]> {
    if (USE_MOCK_API) {
      await delay(50);
      return [];
    }
    return apiClient.get<any[]>(`/grievances/${complaintId}/documents`);
  }
}

export const complaintsService = new ComplaintsService();
