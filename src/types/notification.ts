import { UserRole } from './auth';

export type NotificationCategory =
  | 'ASSIGNMENT'
  | 'REMINDER'
  | 'OVERDUE'
  | 'PROGRESS_UPDATE'
  | 'RESOLUTION'
  | 'ESCALATION';

export interface Notification {
  id: string;
  userId?: string;
  role?: UserRole;
  category: NotificationCategory;
  title: string;
  message: string;
  complaintId?: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}
