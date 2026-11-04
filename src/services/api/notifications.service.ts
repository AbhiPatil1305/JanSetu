import { Notification } from '../../types/notification';
import { User } from '../../types/auth';
import { mockStorage } from '../mock/mockStorage';
import { delay } from './client';

class NotificationsService {
  async getNotifications(user?: User): Promise<Notification[]> {
    await delay(50);
    return mockStorage.getNotifications(user);
  }

  async markAsRead(id: string): Promise<void> {
    await delay(30);
    mockStorage.markNotificationAsRead(id);
  }

  async markAllAsRead(user?: User): Promise<void> {
    await delay(50);
    mockStorage.markAllNotificationsAsRead(user);
  }
}

export const notificationsService = new NotificationsService();
