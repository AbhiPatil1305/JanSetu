import { Complaint, ProgressUpdate, ResolutionSubmission } from '../../types/complaint';
import { mockStorage } from '../mock/mockStorage';
import { delay, ApiError, USE_MOCK_API } from './client';

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
}

class ComplaintsService {
  async getComplaints(filters?: ComplaintFilters): Promise<Complaint[]> {
    await delay(70);

    if (USE_MOCK_API) {
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
            c.details.title.toLowerCase().includes(q) ||
            c.details.category.toLowerCase().includes(q) ||
            (c.assignment && c.assignment.officerName.toLowerCase().includes(q))
        );
      }

      if (filters.departmentId) {
        list = list.filter((c) => c.assignment?.departmentId === filters.departmentId);
      }

      if (filters.stationId) {
        list = list.filter((c) => c.assignment?.stationId === filters.stationId);
      }

      if (filters.officerId) {
        list = list.filter((c) => c.assignment?.officerId === filters.officerId);
      }

      if (filters.status) {
        list = list.filter((c) => c.status === filters.status);
      }

      if (filters.priority) {
        list = list.filter((c) => c.assignment?.priority === filters.priority);
      }

      if (filters.isOverdue) {
        list = list.filter((c) => c.operationalFlags.includes('OVERDUE'));
      }

      if (filters.isEscalated) {
        list = list.filter((c) => c.isEscalated || c.operationalFlags.includes('ESCALATED'));
      }

      if (filters.isAwaitingAssignment) {
        list = list.filter((c) => c.status === 'AWAITING_ASSIGNMENT' || !c.assignment);
      }

      if (filters.dueToday) {
        list = list.filter((c) => c.assignment?.nextFollowupDate === today);
      }

      return list;
    }

    throw new ApiError('Real backend not configured', 501);
  }

  async getComplaintById(id: string): Promise<Complaint> {
    await delay(60);
    const complaint = mockStorage.getComplaintById(id);
    if (!complaint) {
      throw new ApiError(`Complaint with ID ${id} not found`, 404);
    }
    return complaint;
  }

  async createComplaint(
    data: Omit<Complaint, 'id' | 'registeredAt' | 'lastUpdatedAt' | 'daysPending' | 'reminderCount' | 'progressUpdates' | 'isEscalated'> & {
      progressUpdates?: ProgressUpdate[];
      isEscalated?: boolean;
    }
  ): Promise<Complaint> {
    await delay(120);

    // Generate unique mock Case ID: JNS-2026-BLR-XXXX
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

  async updateComplaint(id: string, updates: Partial<Complaint>): Promise<Complaint> {
    await delay(80);
    const updated = mockStorage.updateComplaint(id, updates);
    if (!updated) throw new ApiError('Complaint not found', 404);
    return updated;
  }

  async assignOfficer(
    complaintId: string,
    assignment: NonNullable<Complaint['assignment']>
  ): Promise<Complaint> {
    await delay(100);
    const complaint = mockStorage.getComplaintById(complaintId);
    if (!complaint) throw new ApiError('Complaint not found', 404);

    const updated = mockStorage.updateComplaint(complaintId, {
      assignment,
      status: 'ASSIGNED',
    });

    if (!updated) throw new ApiError('Failed to assign officer', 500);
    return updated;
  }

  async submitProgressUpdate(complaintId: string, update: ProgressUpdate): Promise<Complaint> {
    await delay(120);
    const updated = mockStorage.addProgressUpdate(complaintId, update);
    if (!updated) throw new ApiError('Failed to submit progress update', 500);
    return updated;
  }

  async submitResolution(complaintId: string, resolution: ResolutionSubmission): Promise<Complaint> {
    await delay(120);
    const updated = mockStorage.submitResolution(complaintId, resolution);
    if (!updated) throw new ApiError('Failed to submit resolution', 500);
    return updated;
  }

  async reviewResolution(
    complaintId: string,
    reviewStatus: 'APPROVED' | 'REJECTED',
    reviewRemarks: string,
    reviewerName: string
  ): Promise<Complaint> {
    await delay(100);
    const complaint = mockStorage.getComplaintById(complaintId);
    if (!complaint || !complaint.resolution) throw new ApiError('Resolution not found', 404);

    complaint.resolution.reviewStatus = reviewStatus;
    complaint.resolution.reviewRemarks = reviewRemarks;
    complaint.resolution.reviewedBy = reviewerName;
    complaint.resolution.reviewedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (reviewStatus === 'APPROVED') {
      complaint.status = 'CLOSED';
    } else {
      complaint.status = 'UNDER_INVESTIGATION';
    }

    const updated = mockStorage.updateComplaint(complaintId, complaint);
    if (!updated) throw new ApiError('Failed to review resolution', 500);
    return updated;
  }
}

export const complaintsService = new ComplaintsService();
