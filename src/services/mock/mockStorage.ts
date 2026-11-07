import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_POLICE_STATIONS,
  INITIAL_OFFICERS,
  INITIAL_COMPLAINTS,
  INITIAL_FOLLOWUPS,
  INITIAL_ESCALATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_COMMUNICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_REMINDER_SETTINGS,
} from './mockData';
import { User } from '../../types/auth';
import { Department, PoliceStation } from '../../types/department';
import { Complaint, ProgressUpdate, ResolutionSubmission } from '../../types/complaint';
import { FollowupRecord } from '../../types/followup';
import { EscalationRequest } from '../../types/escalation';
import { CommunicationRecord } from '../../types/communication';
import { Notification } from '../../types/notification';
import { AuditLog, ReminderSettings } from '../../types/audit';

const STORAGE_PREFIX = 'jansetu_v1_';

function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

class MockStorageStore {
  private users: User[] = getStored('users', INITIAL_USERS);
  private departments: Department[] = getStored('departments', INITIAL_DEPARTMENTS);
  private stations: PoliceStation[] = getStored('stations', INITIAL_POLICE_STATIONS);
  private officers: User[] = getStored('officers', INITIAL_OFFICERS);
  private complaints: Complaint[] = getStored('complaints', INITIAL_COMPLAINTS);
  private followups: FollowupRecord[] = getStored('followups', INITIAL_FOLLOWUPS);
  private escalations: EscalationRequest[] = getStored('escalations', INITIAL_ESCALATIONS);
  private notifications: Notification[] = getStored('notifications', INITIAL_NOTIFICATIONS);
  private communications: CommunicationRecord[] = getStored('communications', INITIAL_COMMUNICATIONS);
  private auditLogs: AuditLog[] = getStored('audit_logs', INITIAL_AUDIT_LOGS);
  private reminderSettings: ReminderSettings = getStored('reminder_settings', INITIAL_REMINDER_SETTINGS);

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- Reset action ---
  public resetAllData() {
    this.users = [...INITIAL_USERS];
    this.departments = [...INITIAL_DEPARTMENTS];
    this.stations = [...INITIAL_POLICE_STATIONS];
    this.officers = [...INITIAL_OFFICERS];
    this.complaints = [...INITIAL_COMPLAINTS];
    this.followups = [...INITIAL_FOLLOWUPS];
    this.escalations = [...INITIAL_ESCALATIONS];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.communications = [...INITIAL_COMMUNICATIONS];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.reminderSettings = { ...INITIAL_REMINDER_SETTINGS };

    setStored('users', this.users);
    setStored('departments', this.departments);
    setStored('stations', this.stations);
    setStored('officers', this.officers);
    setStored('complaints', this.complaints);
    setStored('followups', this.followups);
    setStored('escalations', this.escalations);
    setStored('notifications', this.notifications);
    setStored('communications', this.communications);
    setStored('audit_logs', this.auditLogs);
    setStored('reminder_settings', this.reminderSettings);

    this.notify();
  }

  // --- Users ---
  public getUsers(): User[] {
    return [...this.users];
  }

  public addUser(user: User): User {
    this.users = [user, ...this.users];
    setStored('users', this.users);
    this.notify();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...updates };
      setStored('users', this.users);
    }
    const offIdx = this.officers.findIndex((o) => o.id === id || (idx !== -1 && o.email === this.users[idx]?.email));
    if (offIdx !== -1) {
      this.officers[offIdx] = { ...this.officers[offIdx], ...updates };
      setStored('officers', this.officers);
    }
    if (updates.phone) {
      this.followups.forEach((f) => {
        if (f.officerId === id || (offIdx !== -1 && f.officerName === this.officers[offIdx]?.name)) {
          f.officerPhone = updates.phone;
        }
      });
      setStored('followups', this.followups);
    }
    this.notify();
    return idx !== -1 ? this.users[idx] : null;
  }

  // --- Departments ---
  public getDepartments(): Department[] {
    return [...this.departments];
  }

  public addDepartment(dept: Department): Department {
    this.departments = [...this.departments, dept];
    setStored('departments', this.departments);
    this.notify();
    return dept;
  }

  public updateDepartment(id: string, updates: Partial<Department>): Department | null {
    const idx = this.departments.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.departments[idx] = { ...this.departments[idx], ...updates };
    setStored('departments', this.departments);
    this.notify();
    return this.departments[idx];
  }

  // --- Police Stations ---
  public getStations(): PoliceStation[] {
    return [...this.stations];
  }

  public addStation(station: PoliceStation): PoliceStation {
    this.stations = [...this.stations, station];
    setStored('stations', this.stations);
    this.notify();
    return station;
  }

  public updateStation(id: string, updates: Partial<PoliceStation>): PoliceStation | null {
    const idx = this.stations.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.stations[idx] = { ...this.stations[idx], ...updates };
    setStored('stations', this.stations);
    this.notify();
    return this.stations[idx];
  }

  // --- Officers ---
  public getOfficers(): User[] {
    return [...this.officers];
  }

  public addOfficer(officer: User): User {
    this.officers = [...this.officers, officer];
    setStored('officers', this.officers);
    this.notify();
    return officer;
  }

  public updateOfficer(id: string, updates: Partial<User>): User | null {
    const idx = this.officers.findIndex((o) => o.id === id || o.email === id);
    if (idx !== -1) {
      this.officers[idx] = { ...this.officers[idx], ...updates };
      setStored('officers', this.officers);
    }
    const userIdx = this.users.findIndex((u) => u.id === id || (idx !== -1 && u.email === this.officers[idx]?.email));
    if (userIdx !== -1) {
      this.users[userIdx] = { ...this.users[userIdx], ...updates };
      setStored('users', this.users);
    }
    if (updates.phone) {
      this.followups.forEach((f) => {
        if (f.officerId === id || (idx !== -1 && f.officerName === this.officers[idx]?.name)) {
          f.officerPhone = updates.phone;
        }
      });
      setStored('followups', this.followups);
    }
    this.notify();
    return idx !== -1 ? this.officers[idx] : (userIdx !== -1 ? this.users[userIdx] : null);
  }

  // --- Complaints ---
  public getComplaints(): Complaint[] {
    return [...this.complaints];
  }

  public getComplaintById(id: string): Complaint | undefined {
    return this.complaints.find((c) => c.id === id);
  }

  public addComplaint(complaint: Complaint): Complaint {
    this.complaints = [complaint, ...this.complaints];
    setStored('complaints', this.complaints);

    // If assigned, create followup record
    if (complaint.assignment) {
      const fol: FollowupRecord = {
        id: `fol-${Date.now()}`,
        complaintId: complaint.id,
        complaintTitle: complaint.details.title,
        citizenName: complaint.citizen.name,
        citizenPhone: complaint.citizen.phone || '+91 98450 12345',
        officerPhone: this.officers.find((o) => o.id === complaint.assignment!.officerId)?.phone || '+91 94808 01011',
        departmentName: complaint.assignment.departmentName,
        stationName: complaint.assignment.stationName,
        officerId: complaint.assignment.officerId,
        officerName: complaint.assignment.officerName,
        lastActionDate: complaint.assignment.assignedAt.split(' ')[0],
        nextFollowupDate: complaint.assignment.nextFollowupDate,
        daysOverdue: 0,
        reminderHistoryCount: 0,
        status: complaint.status,
        flags: complaint.operationalFlags,
        latestUpdatePreview: 'Case assigned. Initial follow-up pending.',
      };
      this.followups = [fol, ...this.followups];
      setStored('followups', this.followups);

      // Notification for officer
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: complaint.assignment.officerId,
        role: 'POLICE_OFFICER',
        category: 'ASSIGNMENT',
        title: `New Case Assigned: ${complaint.id}`,
        message: `${complaint.details.title}. Priority: ${complaint.assignment.priority}. Initial follow-up by ${complaint.assignment.nextFollowupDate}.`,
        complaintId: complaint.id,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        isRead: false,
        link: `/officer/cases/${complaint.id}`,
      };
      this.notifications = [notif, ...this.notifications];
      setStored('notifications', this.notifications);
    }

    // Add Audit Log
    this.addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: 'user-pa-1',
      userName: 'K. S. Narayanaswamy',
      userRole: 'DC_PA',
      action: 'CASE_REGISTERED',
      module: 'Complaints',
      complaintId: complaint.id,
      description: `Registered complaint: "${complaint.details.title}" for citizen ${complaint.citizen.name}.`,
    });

    this.notify();
    return complaint;
  }

  public updateComplaint(id: string, updates: Partial<Complaint>): Complaint | null {
    const idx = this.complaints.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.complaints[idx] = {
      ...this.complaints[idx],
      ...updates,
      lastUpdatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setStored('complaints', this.complaints);
    this.notify();
    return this.complaints[idx];
  }

  public addProgressUpdate(complaintId: string, update: ProgressUpdate): Complaint | null {
    const complaint = this.getComplaintById(complaintId);
    if (!complaint) return null;

    complaint.progressUpdates = [update, ...complaint.progressUpdates];
    complaint.status = update.currentStatus;
    if (complaint.assignment) {
      complaint.assignment.nextFollowupDate = update.nextFollowupDate;
    }
    // Remove overdue flag if next follow up is in future
    const today = new Date().toISOString().split('T')[0];
    if (update.nextFollowupDate >= today) {
      complaint.operationalFlags = complaint.operationalFlags.filter((f) => f !== 'OVERDUE');
    }

    complaint.lastUpdatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setStored('complaints', this.complaints);

    // Update Follow-up record
    const folIdx = this.followups.findIndex((f) => f.complaintId === complaintId);
    if (folIdx !== -1) {
      this.followups[folIdx].nextFollowupDate = update.nextFollowupDate;
      this.followups[folIdx].lastActionDate = update.createdAt.split(' ')[0];
      this.followups[folIdx].latestUpdatePreview = update.actionTaken;
      this.followups[folIdx].status = update.currentStatus;
      this.followups[folIdx].flags = complaint.operationalFlags;
      setStored('followups', this.followups);
    }

    // Notify PA
    this.addNotification({
      id: `notif-${Date.now()}`,
      role: 'DC_PA',
      category: 'PROGRESS_UPDATE',
      title: `Progress Update: ${complaintId}`,
      message: `${update.officerName} submitted progress update. Next follow-up set for ${update.nextFollowupDate}.`,
      complaintId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isRead: false,
      link: `/pa/complaints/${complaintId}`,
    });

    // Audit Log
    this.addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: update.officerId,
      userName: update.officerName,
      userRole: 'POLICE_OFFICER',
      action: 'PROGRESS_UPDATE_SUBMITTED',
      module: 'Complaints',
      complaintId,
      description: `Action taken: "${update.actionTaken.substring(0, 80)}..."`,
    });

    this.notify();
    return complaint;
  }

  public submitResolution(complaintId: string, resolution: ResolutionSubmission): Complaint | null {
    const complaint = this.getComplaintById(complaintId);
    if (!complaint) return null;

    complaint.resolution = resolution;
    complaint.status = 'RESOLUTION_SUBMITTED';
    complaint.lastUpdatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setStored('complaints', this.complaints);

    // Notify PA and Admin
    this.addNotification({
      id: `notif-${Date.now()}`,
      role: 'DC_PA',
      category: 'RESOLUTION',
      title: `Resolution Submitted: ${complaintId}`,
      message: `${resolution.officerName} has submitted final case resolution for verification.`,
      complaintId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isRead: false,
      link: `/pa/complaints/${complaintId}`,
    });

    this.addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: resolution.officerId,
      userName: resolution.officerName,
      userRole: 'POLICE_OFFICER',
      action: 'RESOLUTION_SUBMITTED',
      module: 'Complaints',
      complaintId,
      description: `Resolution submitted: "${resolution.resolutionSummary.substring(0, 80)}..."`,
    });

    this.notify();
    return complaint;
  }

  // --- Followups ---
  public getFollowups(): FollowupRecord[] {
    return this.followups.map((f, idx) => {
      const comp = this.getComplaintById(f.complaintId);
      const officer = this.officers.find((o) => o.id === f.officerId || o.name === f.officerName) ||
                      this.users.find((u) => u.id === f.officerId || u.name === f.officerName);
      const citizenPhone = (f.complaintId === 'JNS-2026-BLR-0001' || idx === 0)
        ? '+91 76763 94332'
        : (comp?.citizen?.phone || f.citizenPhone || '+91 76763 94332');
      return {
        ...f,
        citizenName: f.citizenName || comp?.citizen?.name || 'Citizen Complainant',
        citizenPhone,
        officerPhone: officer?.phone || f.officerPhone || '+91 94808 01011',
      };
    });
  }

  // --- Escalations ---
  public getEscalations(): EscalationRequest[] {
    return [...this.escalations];
  }

  public addEscalation(req: EscalationRequest): EscalationRequest {
    this.escalations = [req, ...this.escalations];
    setStored('escalations', this.escalations);

    // Update complaint flag
    const comp = this.getComplaintById(req.complaintId);
    if (comp) {
      comp.isEscalated = true;
      comp.escalationId = req.id;
      if (!comp.operationalFlags.includes('ESCALATED')) {
        comp.operationalFlags.push('ESCALATED');
      }
      setStored('complaints', this.complaints);
    }

    // Notify Admin
    this.addNotification({
      id: `notif-${Date.now()}`,
      role: 'DC_MAIN_ADMIN',
      category: 'ESCALATION',
      title: `Escalation Requested: ${req.complaintId}`,
      message: `DC PA requested escalation: "${req.reason}"`,
      complaintId: req.complaintId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isRead: false,
      link: '/admin/escalations',
    });

    this.addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: req.requestingPaId,
      userName: req.requestingPaName,
      userRole: 'DC_PA',
      action: 'ESCALATION_REQUESTED',
      module: 'Escalations',
      complaintId: req.complaintId,
      description: `Requested escalation: ${req.reason}`,
    });

    this.notify();
    return req;
  }

  public reviewEscalation(
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    remarks: string,
    adminUser: User
  ): EscalationRequest | null {
    const idx = this.escalations.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const req = this.escalations[idx];
    req.status = decision;
    req.decisionRemarks = remarks;
    req.decidedBy = `${adminUser.name} (${adminUser.role})`;
    req.decisionDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setStored('escalations', this.escalations);

    // Notify PA
    this.addNotification({
      id: `notif-${Date.now()}`,
      role: 'DC_PA',
      category: 'ESCALATION',
      title: `Escalation ${decision}: ${req.complaintId}`,
      message: `DC Admin has ${decision.toLowerCase()} escalation request. Remarks: ${remarks}`,
      complaintId: req.complaintId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isRead: false,
      link: `/pa/complaints/${req.complaintId}`,
    });

    this.addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: adminUser.role,
      action: decision === 'APPROVED' ? 'ESCALATION_APPROVED' : 'ESCALATION_REJECTED',
      module: 'Escalations',
      complaintId: req.complaintId,
      description: `Decision remarks: "${remarks}"`,
    });

    this.notify();
    return req;
  }

  // --- Notifications ---
  public getNotifications(user?: User): Notification[] {
    if (!user) return [...this.notifications];
    return this.notifications.filter(
      (n) => (n.userId && n.userId === user.id) || (n.role && n.role === user.role) || (!n.userId && !n.role)
    );
  }

  public addNotification(notif: Notification): Notification {
    this.notifications = [notif, ...this.notifications];
    setStored('notifications', this.notifications);
    this.notify();
    return notif;
  }

  public markNotificationAsRead(id: string) {
    const n = this.notifications.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      setStored('notifications', this.notifications);
      this.notify();
    }
  }

  public markAllNotificationsAsRead(user?: User) {
    this.notifications.forEach((n) => {
      if (!user || n.userId === user.id || n.role === user.role) {
        n.isRead = true;
      }
    });
    setStored('notifications', this.notifications);
    this.notify();
  }

  // --- Communications ---
  public getCommunications(complaintId?: string): CommunicationRecord[] {
    if (complaintId) {
      return this.communications.filter((c) => c.complaintId === complaintId);
    }
    return [...this.communications];
  }

  public addCommunication(record: CommunicationRecord): CommunicationRecord {
    this.communications = [record, ...this.communications];
    setStored('communications', this.communications);

    this.addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: 'user-pa-1',
      userName: 'K. S. Narayanaswamy',
      userRole: 'DC_PA',
      action: 'COMMUNICATION_RECORDED',
      module: 'Communications',
      complaintId: record.complaintId,
      description: `Logged ${record.type} to ${record.recipient}: "${record.subject}"`,
    });

    this.notify();
    return record;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public addAuditLog(log: AuditLog): AuditLog {
    this.auditLogs = [log, ...this.auditLogs];
    setStored('audit_logs', this.auditLogs);
    this.notify();
    return log;
  }

  // --- Reminder Settings ---
  public getReminderSettings(): ReminderSettings {
    return { ...this.reminderSettings };
  }

  public updateReminderSettings(settings: ReminderSettings): ReminderSettings {
    this.reminderSettings = { ...settings };
    setStored('reminder_settings', this.reminderSettings);
    this.notify();
    return this.reminderSettings;
  }
}

export const mockStorage = new MockStorageStore();
