import { AuditLog, ReminderSettings } from '../../types/audit';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, delay, USE_MOCK_API } from './client';

export interface BackendFollowUpPolicy {
  id: string;
  department_id: string;
  name: string;
  description?: string | null;
  first_reminder_after_days: number;
  reminder_interval_days: number;
  escalation_after_days: number;
  max_reminders: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedPolicyResponse {
  items: BackendFollowUpPolicy[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class AuditService {
  async getAuditLogs(): Promise<AuditLog[]> {
    if (USE_MOCK_API) {
      await delay(60);
      return mockStorage.getAuditLogs();
    }

    try {
      // If root audit logs endpoint is exposed in future
      const logs = await apiClient.get<AuditLog[]>('/audit-logs');
      return logs;
    } catch {
      // Safe fallback as documented in BACKEND_GAPS.md
      return mockStorage.getAuditLogs();
    }
  }

  async getReminderSettings(): Promise<ReminderSettings> {
    if (USE_MOCK_API) {
      await delay(50);
      return mockStorage.getReminderSettings();
    }

    try {
      const data = await apiClient.get<PaginatedPolicyResponse>('/policies');
      const policy = data.items && data.items.length > 0 ? data.items[0] : null;

      if (policy) {
        return {
          reminderBeforeFollowupDays: policy.first_reminder_after_days,
          reminderOnFollowupDate: true,
          overdueNotificationDelayHours: 24,
          noUpdateThresholdDays: policy.reminder_interval_days,
          escalationRecommendationThresholdDays: policy.escalation_after_days,
          reminderFrequency: 'DAILY',
          channels: {
            inApp: true,
            smsSimulated: true,
            emailSimulated: true,
          },
        };
      }
    } catch {
      // Fallback
    }

    return mockStorage.getReminderSettings();
  }

  async updateReminderSettings(settings: ReminderSettings): Promise<ReminderSettings> {
    if (USE_MOCK_API) {
      await delay(100);
      return mockStorage.updateReminderSettings(settings);
    }

    try {
      const data = await apiClient.get<PaginatedPolicyResponse>('/policies');
      if (data.items && data.items.length > 0) {
        const policy = data.items[0];
        await apiClient.patch(`/policies/${policy.id}`, {
          first_reminder_after_days: settings.reminderBeforeFollowupDays,
          reminder_interval_days: settings.noUpdateThresholdDays,
          escalation_after_days: settings.escalationRecommendationThresholdDays,
        });
      }
    } catch (err) {
      console.warn('Could not update backend policy:', err);
    }

    return settings;
  }
}

export const auditService = new AuditService();
