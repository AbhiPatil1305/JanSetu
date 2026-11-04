import { mockStorage } from '../mock/mockStorage';
import { delay } from './client';

export interface DashboardStats {
  totalComplaints: number;
  openCases: number;
  assignedCases: number;
  awaitingAssignment: number;
  dueToday: number;
  overdueCases: number;
  escalatedCases: number;
  closedCases: number;
  resolutionSubmitted: number;
  newAssignments: number;
  inProgress: number;
  awaitingOfficerResponse: number;
}

export interface DepartmentReportItem {
  departmentId: string;
  departmentName: string;
  totalCases: number;
  openCases: number;
  closedCases: number;
  overdueCases: number;
  resolutionPercentage: number;
  averageResolutionDays: number;
}

export interface OfficerReportItem {
  officerId: string;
  officerName: string;
  stationName: string;
  totalAssigned: number;
  activeCases: number;
  resolvedCases: number;
  overdueCases: number;
  complianceRate: number;
}

class ReportsService {
  async getDashboardStats(officerId?: string): Promise<DashboardStats> {
    await delay(60);
    let complaints = mockStorage.getComplaints();

    if (officerId) {
      complaints = complaints.filter((c) => c.assignment?.officerId === officerId);
    }

    const today = new Date().toISOString().split('T')[0];

    const totalComplaints = complaints.length;
    const closedCases = complaints.filter((c) => c.status === 'CLOSED').length;
    const openCases = totalComplaints - closedCases;
    const awaitingAssignment = complaints.filter((c) => c.status === 'AWAITING_ASSIGNMENT' || !c.assignment).length;
    const assignedCases = complaints.filter((c) => c.assignment && c.status !== 'CLOSED').length;
    const dueToday = complaints.filter((c) => c.assignment?.nextFollowupDate === today && c.status !== 'CLOSED').length;
    const overdueCases = complaints.filter(
      (c) => c.status !== 'CLOSED' && (c.operationalFlags.includes('OVERDUE') || (c.assignment && c.assignment.nextFollowupDate < today))
    ).length;
    const escalatedCases = complaints.filter((c) => c.status !== 'CLOSED' && (c.isEscalated || c.operationalFlags.includes('ESCALATED'))).length;
    const resolutionSubmitted = complaints.filter((c) => c.status === 'RESOLUTION_SUBMITTED').length;
    const newAssignments = complaints.filter((c) => c.status === 'ASSIGNED').length;
    const inProgress = complaints.filter((c) => c.status === 'UNDER_INVESTIGATION').length;
    const awaitingOfficerResponse = complaints.filter((c) => c.status === 'UNDER_INVESTIGATION' && c.operationalFlags.includes('OVERDUE')).length;

    return {
      totalComplaints,
      openCases,
      assignedCases,
      awaitingAssignment,
      dueToday,
      overdueCases,
      escalatedCases,
      closedCases,
      resolutionSubmitted,
      newAssignments,
      inProgress,
      awaitingOfficerResponse,
    };
  }

  async getDepartmentReports(): Promise<DepartmentReportItem[]> {
    await delay(70);
    const departments = mockStorage.getDepartments();
    const complaints = mockStorage.getComplaints();

    return departments.map((dept) => {
      const deptComplaints = complaints.filter((c) => c.assignment?.departmentId === dept.id);
      const total = deptComplaints.length;
      const closed = deptComplaints.filter((c) => c.status === 'CLOSED').length;
      const open = total - closed;
      const overdue = deptComplaints.filter((c) => c.operationalFlags.includes('OVERDUE') && c.status !== 'CLOSED').length;
      const pct = total > 0 ? Math.round((closed / total) * 100) : 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalCases: total,
        openCases: open,
        closedCases: closed,
        overdueCases: overdue,
        resolutionPercentage: pct,
        averageResolutionDays: 6.4,
      };
    });
  }

  async getOfficerReports(): Promise<OfficerReportItem[]> {
    await delay(70);
    const officers = mockStorage.getOfficers();
    const complaints = mockStorage.getComplaints();

    return officers.map((off) => {
      const offComplaints = complaints.filter((c) => c.assignment?.officerId === off.id);
      const total = offComplaints.length;
      const resolved = offComplaints.filter((c) => c.status === 'CLOSED' || c.status === 'RESOLUTION_SUBMITTED').length;
      const active = total - resolved;
      const overdue = offComplaints.filter((c) => c.operationalFlags.includes('OVERDUE') && c.status !== 'CLOSED').length;
      const compliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

      return {
        officerId: off.id,
        officerName: off.name,
        stationName: off.stationName || 'District Police Office',
        totalAssigned: total,
        activeCases: active,
        resolvedCases: resolved,
        overdueCases: overdue,
        complianceRate: compliance,
      };
    });
  }

  async getComplaintTrends() {
    await delay(50);
    // 7-day realistic rolling data
    return [
      { date: '29 Oct', registered: 5, resolved: 3 },
      { date: '30 Oct', registered: 7, resolved: 4 },
      { date: '31 Oct', registered: 4, resolved: 6 },
      { date: '01 Nov', registered: 8, resolved: 5 },
      { date: '02 Nov', registered: 6, resolved: 4 },
      { date: '03 Nov', registered: 9, resolved: 7 },
      { date: '04 Nov', registered: 6, resolved: 5 },
    ];
  }

  async getStatusDistribution() {
    await delay(50);
    const complaints = mockStorage.getComplaints();
    const counts: Record<string, number> = {
      Registered: 0,
      'Awaiting Assignment': 0,
      Assigned: 0,
      'Under Investigation': 0,
      'Awaiting Info': 0,
      'Resolution Submitted': 0,
      Closed: 0,
    };

    complaints.forEach((c) => {
      if (c.status === 'REGISTERED') counts['Registered']++;
      else if (c.status === 'AWAITING_ASSIGNMENT') counts['Awaiting Assignment']++;
      else if (c.status === 'ASSIGNED') counts['Assigned']++;
      else if (c.status === 'UNDER_INVESTIGATION') counts['Under Investigation']++;
      else if (c.status === 'AWAITING_INFORMATION') counts['Awaiting Info']++;
      else if (c.status === 'RESOLUTION_SUBMITTED') counts['Resolution Submitted']++;
      else if (c.status === 'CLOSED') counts['Closed']++;
    });

    const colors: Record<string, string> = {
      Registered: '#64748B',
      'Awaiting Assignment': '#D97706',
      Assigned: '#2563EB',
      'Under Investigation': '#F59E0B',
      'Awaiting Info': '#8B5CF6',
      'Resolution Submitted': '#0D9488',
      Closed: '#16A34A',
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || '#64748B',
    }));
  }
}

export const reportsService = new ReportsService();
