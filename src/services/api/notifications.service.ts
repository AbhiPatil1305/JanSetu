import { Notification, NotificationCategory } from '../../types/notification';
import { User } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { apiClient, delay, USE_MOCK_API } from './client';

export interface BackendNotification {
  id: string;
  grievance_id: string;
  follow_up_task_id?: string | null;
  recipient_user_id?: string | null;
  recipient_name: string;
  recipient_contact: string;
  notification_type: string;
  channel: string;
  subject?: string | null;
  message: string;
  status: string; // GENERATED, ACKNOWLEDGED, SENT, DELIVERED
  scheduled_at?: string | null;
  generated_at: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export interface PaginatedNotificationResponse {
  items: BackendNotification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

class NotificationsService {
  async getNotifications(user?: User): Promise<Notification[]> {
    if (USE_MOCK_API) {
      await delay(50);
      return mockStorage.getNotifications(user);
    }

    try {
      const data = await apiClient.get<PaginatedNotificationResponse>('/notifications', {
        params: { page_size: 20 },
      });

      return (data.items || []).map((n) => {
        let cat: NotificationCategory = 'REMINDER';
        const type = (n.notification_type || '').toUpperCase();
        if (type.includes('ASSIGN')) cat = 'ASSIGNMENT';
        else if (type.includes('OVERDUE')) cat = 'OVERDUE';
        else if (type.includes('ESCALAT')) cat = 'ESCALATION';
        else if (type.includes('RESOLV')) cat = 'RESOLUTION';

        return {
          id: n.id,
          userId: n.recipient_user_id || undefined,
          role: user?.role,
          category: cat,
          title: n.subject || 'Follow-up Notification',
          message: n.message,
          complaintId: n.grievance_id,
          timestamp: n.generated_at ? n.generated_at.replace('T', ' ').substring(0, 19) : n.created_at.replace('T', ' ').substring(0, 19),
          isRead: n.status === 'ACKNOWLEDGED',
          link: `/officer/cases/${n.grievance_id}`,
        };
      });
    } catch {
      return mockStorage.getNotifications(user);
    }
  }

  async markAsRead(id: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay(30);
      mockStorage.markNotificationAsRead(id);
      return;
    }

    try {
      await apiClient.patch(`/notifications/${id}/acknowledge`);
    } catch {
      mockStorage.markNotificationAsRead(id);
    }
  }

  async markAllAsRead(user?: User): Promise<void> {
    if (USE_MOCK_API) {
      await delay(50);
      mockStorage.markAllNotificationsAsRead(user);
      return;
    }
    mockStorage.markAllNotificationsAsRead(user);
  }
}

export const notificationsService = new NotificationsService();
