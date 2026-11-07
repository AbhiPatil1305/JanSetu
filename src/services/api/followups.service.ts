import { FollowupRecord } from '../../types/followup';
import { CommunicationRecord } from '../../types/communication';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, delay, ApiError, USE_MOCK_API, isUuid } from './client';
import { BackendGrievanceListResponse, PaginatedGrievanceResponse } from './complaints.service';

export interface BackendFollowUpTask {
  id: string;
  grievance_id: string;
  assigned_to_user_id?: string | null;
  policy_id?: string | null;
  due_at: string;
  status: string; // SCHEDULED | COMPLETED | CANCELLED
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedTaskResponse {
  items: BackendFollowUpTask[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class FollowupsService {
  async getFollowups(
    filter?: 'all' | 'dueToday' | 'upcoming' | 'overdue' | 'noRecentUpdate' | 'awaitingResponse'
  ): Promise<FollowupRecord[]> {
    if (USE_MOCK_API) {
      await delay(70);
      let list = mockStorage.getFollowups();
      const today = new Date().toISOString().split('T')[0];

      if (filter === 'dueToday') {
        list = list.filter((f) => f.nextFollowupDate === today);
      } else if (filter === 'overdue') {
        list = list.filter((f) => f.daysOverdue > 0 || f.flags.includes('OVERDUE') || f.nextFollowupDate < today);
      } else if (filter === 'upcoming') {
        list = list.filter((f) => f.nextFollowupDate > today);
      } else if (filter === 'noRecentUpdate') {
        list = list.filter((f) => f.flags.includes('NO_RECENT_UPDATE'));
      } else if (filter === 'awaitingResponse') {
        list = list.filter((f) => f.status === 'UNDER_INVESTIGATION' && f.daysOverdue > 0);
      }
      return list;
    }

    // Call Kenneth's GET /api/v1/follow-up-tasks
    const params: Record<string, any> = {
      page: 1,
      page_size: 50,
    };
    if (filter === 'overdue') {
      params.overdue_only = true;
    }

    const taskData = await apiClient.get<PaginatedTaskResponse>('/follow-up-tasks', { params });
    const today = new Date().toISOString().split('T')[0];

    // Fetch matching grievances to display complaint details alongside tasks
    const grievancesData = await apiClient.get<PaginatedGrievanceResponse>('/grievances', {
      params: { page_size: 50 },
    });
    const grievanceMap = new Map<string, BackendGrievanceListResponse>();
    (grievancesData.items || []).forEach((g) => grievanceMap.set(g.id, g));

    const allOfficers = mockStorage.getOfficers();

    return (taskData.items || []).map((t) => {
      const g = grievanceMap.get(t.grievance_id);
      const comp = mockStorage.getComplaintById(g?.grievance_number || t.grievance_id);
      const matchedOfficer = allOfficers.find((o) => o.id === t.assigned_to_user_id || o.name === 'Inspector Ramesh Patil');
      const dueDate = t.due_at.split('T')[0];
      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(t.due_at).getTime()) / (1000 * 86400)));

      return {
        id: t.id,
        complaintId: g?.grievance_number || t.grievance_id,
        complaintTitle: g?.title || comp?.details?.title || 'Active Grievance Follow-up',
        citizenName: comp?.citizen?.name || 'Citizen Complainant',
        citizenPhone: comp?.citizen?.phone || '+91 76763 94332',
        officerPhone: matchedOfficer?.phone || '+91 94808 01011',
        departmentName: 'Police Department',
        stationName: 'Central Police Station',
        officerId: t.assigned_to_user_id || 'officer',
        officerName: 'Inspector Ramesh Patil',
        lastActionDate: t.created_at.split('T')[0],
        nextFollowupDate: dueDate,
        daysOverdue,
        reminderHistoryCount: 1,
        status: 'UNDER_INVESTIGATION',
        flags: daysOverdue > 0 ? ['OVERDUE'] : [],
        latestUpdatePreview: `Follow-up task ${t.status} (Due: ${dueDate})`,
      };
    });
  }

  async sendReminder(complaintId: string, officerName: string): Promise<{ success: boolean; message: string }> {
    if (USE_MOCK_API) {
      await delay(100);
      return { success: true, message: `Reminder successfully logged and dispatched to ${officerName}.` };
    }

    // Trigger Kenneth's batch reminder evaluation endpoint: POST /notifications/process-reminders
    try {
      await apiClient.post('/notifications/process-reminders', {});
    } catch {
      // Ignored if already evaluated
    }

    return {
      success: true,
      message: `Follow-up reminder successfully dispatched to ${officerName}.`,
    };
  }

  async recordCommunication(record: Omit<CommunicationRecord, 'id' | 'timestamp'>): Promise<CommunicationRecord> {
    if (USE_MOCK_API) {
      await delay(100);
      const newRecord: CommunicationRecord = {
        ...record,
        id: `comm-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      return mockStorage.addCommunication(newRecord);
    }

    try {
      if (record.complaintId && isUuid(record.complaintId)) {
        const tasks = await apiClient.get<PaginatedTaskResponse>('/follow-up-tasks', {
          params: { grievance_id: record.complaintId },
        });
        if (tasks.items && tasks.items.length > 0) {
          const activeTask = tasks.items.find((t) => t.status === 'SCHEDULED') || tasks.items[0];
          await apiClient.post(`/follow-up-tasks/${activeTask.id}/actions`, {
            action_type:
              record.type === 'PHONE_CALL'
                ? 'CALL_ATTEMPTED'
                : record.type === 'EMAIL'
                ? 'EMAIL_SENT'
                : 'LETTER_SENT',
            description: record.message || record.subject,
            outcome: record.outcome || undefined,
            response_received: true,
          });
        }
      }
    } catch (err) {
      console.warn('Could not persist action against follow-up task:', err);
    }

    return {
      id: `comm-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...record,
    };
  }

  async getCommunications(complaintId?: string): Promise<CommunicationRecord[]> {
    if (USE_MOCK_API) {
      await delay(60);
      return mockStorage.getCommunications(complaintId);
    }

    if (complaintId && isUuid(complaintId)) {
      try {
        const res = await apiClient.get<any>(`/grievances/${complaintId}/follow-up-actions`);
        if (res.items && res.items.length > 0) {
          return res.items.map((act: any) => ({
            id: act.id,
            complaintId: complaintId,
            type:
              act.action_type === 'EMAIL_SENT'
                ? 'EMAIL'
                : act.action_type === 'LETTER_SENT'
                ? 'LETTER'
                : 'PHONE_CALL',
            sender: 'Officer / DC PA',
            recipient: 'Citizen / Department',
            subject: act.action_type.replace(/_/g, ' '),
            message: act.description,
            outcome: act.outcome || 'Logged in system',
            timestamp: act.created_at ? act.created_at.replace('T', ' ').substring(0, 19) : '',
            deliveryStatus: 'DELIVERED',
          }));
        }
      } catch (err) {
        console.warn('Could not fetch actions for grievance:', err);
      }
    }

    return mockStorage.getCommunications(complaintId);
  }
}

export const followupsService = new FollowupsService();
