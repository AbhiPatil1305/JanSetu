import { ComplaintStatus, OperationalFlag } from './complaint';

export interface FollowupRecord {
  id: string;
  complaintId: string;
  complaintTitle: string;
  citizenName: string;
  citizenPhone?: string;
  officerPhone?: string;
  departmentName: string;
  stationName: string;
  officerId: string;
  officerName: string;
  lastActionDate: string;
  nextFollowupDate: string;
  daysOverdue: number;
  reminderHistoryCount: number;
  status: ComplaintStatus;
  flags: OperationalFlag[];
  latestUpdatePreview?: string;
}
