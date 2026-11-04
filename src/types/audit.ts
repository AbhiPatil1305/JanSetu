import { UserRole } from './auth';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  complaintId?: string;
  description: string;
  ipAddress?: string;
}

export interface ReminderSettings {
  reminderBeforeFollowupDays: number;
  reminderOnFollowupDate: boolean;
  overdueNotificationDelayHours: number;
  noUpdateThresholdDays: number;
  escalationRecommendationThresholdDays: number;
  reminderFrequency: 'DAILY' | 'TWICE_WEEKLY' | 'WEEKLY';
  channels: {
    inApp: boolean;
    smsSimulated: boolean;
    emailSimulated: boolean;
  };
}
