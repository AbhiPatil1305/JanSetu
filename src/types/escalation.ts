export type EscalationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EscalationRequest {
  id: string;
  complaintId: string;
  complaintTitle: string;
  departmentName: string;
  stationName: string;
  officerId: string;
  officerName: string;
  requestingPaId: string;
  requestingPaName: string;
  requestDate: string;
  reason: string;
  remarks: string;
  daysOverdue: number;
  previousRemindersCount: number;
  status: EscalationStatus;
  decisionRemarks?: string;
  decidedBy?: string;
  decisionDate?: string;
}
