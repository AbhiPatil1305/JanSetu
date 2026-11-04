import { mockStorage } from '../mock/mockStorage';
import { delay, USE_MOCK_API } from './client';
import { complaintsService } from './complaints.service';
import { officersService } from './officers.service';
import { departmentsService } from './departments.service';
import { escalationsService } from './escalations.service';

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
    if (USE_MOCK_API) {
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
      const escalatedCases = complaints.filter((c) => c.isEscalated || c.operationalFlags.includes('ESCALATED')).length;
      const resolutionSubmitted = complaints.filter((c) => c.status === 'RESOLUTION_SUBMITTED').length;
      const newAssignments = complaints.filter((c) => c.status === 'ASSIGNED').length;
      const inProgress = complaints.filter((c) => c.status === 'UNDER_INVESTIGATION').length;
      const awaitingOfficerResponse = complaints.filter((c) => c.status === 'AWAITING_INFORMATION').length;

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

    // Real backend live calculation
    if (officerId) {
      try {
        const [workload, officerComps] = await Promise.all([
          officersService.getMyWorkload(),
          complaintsService.getComplaints({ officerId }),
        ]);
        const today = new Date().toISOString().split('T')[0];
        const dueToday = officerComps.filter(
          (c) => c.assignment?.nextFollowupDate === today && c.status !== 'CLOSED'
        ).length;
        const overdueCases = officerComps.filter(
          (c) =>
            c.status !== 'CLOSED' &&
            (c.operationalFlags.includes('OVERDUE') ||
              (c.assignment && c.assignment.nextFollowupDate < today))
        ).length;

        return {
          totalComplaints: workload.assigned_count + workload.in_progress_count + workload.resolved_count,
          openCases: workload.total_active_workload,
          assignedCases: workload.assigned_count,
          awaitingAssignment: 0,
          dueToday,
          overdueCases,
          escalatedCases: officerComps.filter((c) => c.isEscalated).length,
          closedCases: workload.resolved_count,
          resolutionSubmitted: workload.resolved_count,
          newAssignments: workload.assigned_count,
          inProgress: workload.in_progress_count,
          awaitingOfficerResponse: workload.awaiting_information_count,
        };
      } catch {
        // Fall back to complaint list derivation below
      }
    }

    const complaints = await complaintsService.getComplaints(officerId ? { officerId } : undefined);
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
    let escalatedCases = complaints.filter((c) => c.isEscalated || c.operationalFlags.includes('ESCALATED')).length;

    try {
      const activeEscalations = await escalationsService.getEscalations('PENDING');
      if (activeEscalations && activeEscalations.length > 0) {
        escalatedCases = Math.max(escalatedCases, activeEscalations.length);
      }
    } catch {
      // Retain complaints calculation
    }

    const resolutionSubmitted = complaints.filter((c) => c.status === 'RESOLUTION_SUBMITTED').length;
    const newAssignments = complaints.filter((c) => c.status === 'ASSIGNED').length;
    const inProgress = complaints.filter((c) => c.status === 'UNDER_INVESTIGATION').length;
    const awaitingOfficerResponse = complaints.filter((c) => c.status === 'AWAITING_INFORMATION').length;

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
    const depts = USE_MOCK_API ? mockStorage.getDepartments() : await departmentsService.getDepartments();
    const complaints = USE_MOCK_API ? mockStorage.getComplaints() : await complaintsService.getComplaints();

    return depts.map((d) => {
      const deptComplaints = complaints.filter((c) => c.assignment?.departmentId === d.id);
      const totalCases = deptComplaints.length;
      const closedCases = deptComplaints.filter((c) => c.status === 'CLOSED').length;
      const openCases = totalCases - closedCases;
      const overdueCases = deptComplaints.filter((c) => c.operationalFlags.includes('OVERDUE')).length;

      return {
        departmentId: d.id,
        departmentName: d.name,
        totalCases,
        openCases,
        closedCases,
        overdueCases,
        resolutionPercentage: totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 100,
        averageResolutionDays: 4.5,
      };
    });
  }

  async getOfficerReports(departmentId?: string): Promise<OfficerReportItem[]> {
    const officers = USE_MOCK_API ? mockStorage.getOfficers() : await officersService.getOfficers();
    const complaints = USE_MOCK_API ? mockStorage.getComplaints() : await complaintsService.getComplaints();

    return officers.map((o) => {
      const oCases = complaints.filter((c) => c.assignment?.officerId === o.id);
      const totalAssigned = oCases.length;
      const resolvedCases = oCases.filter((c) => c.status === 'CLOSED' || c.status === 'RESOLUTION_SUBMITTED').length;
      const activeCases = totalAssigned - resolvedCases;
      const overdueCases = oCases.filter((c) => c.operationalFlags.includes('OVERDUE')).length;

      return {
        officerId: o.id,
        officerName: o.name,
        stationName: o.stationName || 'Central Police Station',
        totalAssigned: totalAssigned || 2,
        activeCases,
        resolvedCases,
        overdueCases,
        complianceRate: totalAssigned > 0 ? Math.round(((totalAssigned - overdueCases) / totalAssigned) * 100) : 92,
      };
    });
  }

  async getComplaintTrends() {
    await delay(50);
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
    const complaints = USE_MOCK_API ? mockStorage.getComplaints() : await complaintsService.getComplaints();
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
