import { FollowupRecord } from '../../types/followup';
import { CommunicationRecord } from '../../types/communication';
import { mockStorage } from '../mock/mockStorage';
import { delay, ApiError, USE_MOCK_API } from './client';

class FollowupsService {
  async getFollowups(filter?: 'all' | 'dueToday' | 'upcoming' | 'overdue' | 'noRecentUpdate' | 'awaitingResponse'): Promise<FollowupRecord[]> {
    await delay(70);
    if (USE_MOCK_API) {
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
    throw new ApiError('Real backend not configured', 501);
  }

  async sendReminder(complaintId: string, officerName: string): Promise<{ success: boolean; message: string }> {
    await delay(100);
    const complaint = mockStorage.getComplaintById(complaintId);
    if (!complaint) throw new ApiError('Complaint not found', 404);

    complaint.reminderCount = (complaint.reminderCount || 0) + 1;
    mockStorage.updateComplaint(complaintId, { reminderCount: complaint.reminderCount });

    // Add In-App notification
    mockStorage.addNotification({
      id: `notif-${Date.now()}`,
      role: 'POLICE_OFFICER',
      category: 'REMINDER',
      title: `URGENT Reminder: ${complaintId}`,
      message: `DC PA has sent a follow-up reminder for "${complaint.details.title}". Update is required.`,
      complaintId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isRead: false,
      link: `/officer/cases/${complaintId}`,
    });

    // Add communication entry
    mockStorage.addCommunication({
      id: `comm-${Date.now()}`,
      complaintId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: 'IN_APP',
      sender: 'K. S. Narayanaswamy (DC PA)',
      recipient: officerName,
      subject: `Follow-up Reminder #${complaint.reminderCount}`,
      message: `System reminder generated from PA Follow-up dashboard.`,
      outcome: 'Notification delivered to officer in-app inbox.',
      deliveryStatus: 'SENT',
    });

    return {
      success: true,
      message: `Reminder successfully logged and dispatched to ${officerName}.`,
    };
  }

  async recordCommunication(record: Omit<CommunicationRecord, 'id' | 'timestamp'>): Promise<CommunicationRecord> {
    await delay(100);
    const newRecord: CommunicationRecord = {
      ...record,
      id: `comm-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    return mockStorage.addCommunication(newRecord);
  }

  async getCommunications(complaintId?: string): Promise<CommunicationRecord[]> {
    await delay(60);
    return mockStorage.getCommunications(complaintId);
  }
}

export const followupsService = new FollowupsService();
