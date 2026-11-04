import { AuditLog, ReminderSettings } from '../../types/audit';
import { mockStorage } from '../mock/mockStorage';
import { delay } from './client';

class AuditService {
  async getAuditLogs(): Promise<AuditLog[]> {
    await delay(60);
    return mockStorage.getAuditLogs();
  }

  async getReminderSettings(): Promise<ReminderSettings> {
    await delay(50);
    return mockStorage.getReminderSettings();
  }

  async updateReminderSettings(settings: ReminderSettings): Promise<ReminderSettings> {
    await delay(100);
    return mockStorage.updateReminderSettings(settings);
  }
}

export const auditService = new AuditService();
