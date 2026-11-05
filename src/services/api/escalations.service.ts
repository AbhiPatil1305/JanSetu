import { EscalationRequest, EscalationStatus } from '../../types/escalation';
import { User } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, ApiError, delay, USE_MOCK_API, getCurrentBackendRole } from './client';
import { BackendGrievanceListResponse, PaginatedGrievanceResponse } from './complaints.service';

export interface BackendEscalation {
  id: string;
  grievance_id: string;
  follow_up_task_id?: string | null;
  escalated_from_user_id?: string | null;
  escalated_to_user_id: string;
  reason: string;
  trigger_date: string;
  escalated_at: string;
  status: string; // PENDING, ACKNOWLEDGED, RESOLVED, DISMISSED
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface PaginatedEscalationResponse {
  items: BackendEscalation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class EscalationsService {
  async getEscalations(status?: EscalationStatus): Promise<EscalationRequest[]> {
    if (USE_MOCK_API) {
      await delay(70);
      let list = mockStorage.getEscalations();
      if (status) {
        list = list.filter((e) => e.status === status);
      }
      return list;
    }

    const backendRole = getCurrentBackendRole();
    if (backendRole === 'DATA_ENTRY_OPERATOR') {
      return [];
    }

    const params: Record<string, any> = {
      page: 1,
      page_size: 50,
    };
    if (status === 'PENDING') params.status = 'PENDING';
    else if (status === 'APPROVED') params.status = 'RESOLVED';
    else if (status === 'REJECTED') params.status = 'DISMISSED';

    try {
      const escData = await apiClient.get<PaginatedEscalationResponse>('/escalations', { params });

      // Fetch grievances for titles
      const grievancesData = await apiClient.get<PaginatedGrievanceResponse>('/grievances', {
        params: { page_size: 50 },
      });
      const grievanceMap = new Map<string, BackendGrievanceListResponse>();
      (grievancesData.items || []).forEach((g) => grievanceMap.set(g.id, g));

      return (escData.items || []).map((e) => {
        const g = grievanceMap.get(e.grievance_id);
        let mappedStatus: EscalationStatus = 'PENDING';
        if (e.status === 'RESOLVED') mappedStatus = 'APPROVED';
        else if (e.status === 'DISMISSED') mappedStatus = 'REJECTED';

        return {
          id: e.id,
          complaintId: g?.grievance_number || e.grievance_id,
          complaintTitle: g?.title || 'Escalated Grievance',
          departmentName: 'Police Department',
          stationName: 'Central Police Station',
          officerId: e.escalated_from_user_id || 'officer',
          officerName: 'Inspector Ramesh Patil',
          requestingPaId: e.escalated_to_user_id,
          requestingPaName: 'Smt. Lakshmi Devi, KAS',
          requestDate: e.escalated_at ? e.escalated_at.split('T')[0] : e.created_at.split('T')[0],
          reason: e.reason,
          remarks: e.reason,
          daysOverdue: 4,
          previousRemindersCount: 2,
          status: mappedStatus,
          decisionRemarks: e.resolution_notes || undefined,
          decidedBy: e.resolved_at ? 'DC Main Admin' : undefined,
          decisionDate: e.resolved_at ? e.resolved_at.split('T')[0] : undefined,
        };
      });
    } catch (err) {
      // 403 means this role does not have VIEW_ESCALATIONS permission — return empty silently.
      if (err instanceof ApiError && err.statusCode === 403) {
        return [];
      }
      throw err;
    }
  }

  async createEscalationRequest(
    data: Omit<EscalationRequest, 'id' | 'requestDate' | 'status'>
  ): Promise<EscalationRequest> {
    if (USE_MOCK_API) {
      await delay(120);
      const newReq: EscalationRequest = {
        ...data,
        id: `esc-${Date.now()}`,
        requestDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'PENDING',
      };
      return mockStorage.addEscalation(newReq);
    }

    // Trigger process due or return formatted item
    return {
      id: `esc-${Date.now()}`,
      requestDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'PENDING',
      ...data,
    };
  }

  async reviewEscalation(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    remarks: string,
    adminUser: User
  ): Promise<EscalationRequest> {
    if (USE_MOCK_API) {
      await delay(120);
      const updated = mockStorage.reviewEscalation(id, decision, remarks, adminUser);
      if (!updated) throw new ApiError('Escalation request not found', 404);
      return updated;
    }

    if (decision === 'APPROVED') {
      // Kenneth's PATCH /api/v1/escalations/{id}/resolve
      await apiClient.patch(`/escalations/${id}/resolve`, {
        resolution_notes: remarks || 'Escalation approved and resolved by DC Main Admin',
      });
    } else {
      // Kenneth's PATCH /api/v1/escalations/{id}/dismiss
      await apiClient.patch(`/escalations/${id}/dismiss`, {
        reason: remarks || 'Escalation dismissed after administrative review.',
      });
    }

    return {
      id,
      complaintId: 'GRV-2026-00002',
      complaintTitle: 'Reviewed Escalation',
      departmentName: 'Police Department',
      stationName: 'Central Police Station',
      officerId: 'officer',
      officerName: 'Inspector Ramesh Patil',
      requestingPaId: 'pa',
      requestingPaName: 'Smt. Lakshmi Devi, KAS',
      requestDate: new Date().toISOString().split('T')[0],
      reason: remarks,
      remarks,
      daysOverdue: 0,
      previousRemindersCount: 1,
      status: decision,
      decisionRemarks: remarks,
      decidedBy: adminUser.name,
      decisionDate: new Date().toISOString().split('T')[0],
    };
  }
}

export const escalationsService = new EscalationsService();
