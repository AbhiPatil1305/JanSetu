import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import { complaintsService } from '../../services/api/complaints.service';
import { followupsService } from '../../services/api/followups.service';
import { escalationsService } from '../../services/api/escalations.service';
import { officersService } from '../../services/api/officers.service';
import { departmentsService } from '../../services/api/departments.service';
import { Complaint, ComplaintDocument, ProgressUpdate, ResolutionSubmission } from '../../types/complaint';
import { OcrPanel } from './OcrPanel';
import { User } from '../../types/auth';
import { PoliceStation } from '../../types/department';
import { StatusBadge, PriorityBadge, FlagBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Modal } from '../common/Modal';
import { PageHeader } from '../layout/PageHeader';
import {
  FileText,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Shield,
  FileCheck2,
  AlertTriangle,
  History,
  MessageSquare,
  Sparkles,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  ExternalLink,
  ZoomIn,
} from 'lucide-react';

export const CaseDetailsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'ai_review' | 'assignment' | 'progress' | 'timeline' | 'communication' | 'audit'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isPreviewDocModalOpen, setIsPreviewDocModalOpen] = useState(false);
  const [selectedDocForInspection, setSelectedDocForInspection] = useState<ComplaintDocument | null>(null);

  // Form states for modals
  const [commType, setCommType] = useState<'PHONE_CALL' | 'EMAIL' | 'LETTER' | 'WHATSAPP'>('PHONE_CALL');
  const [commRecipient, setCommRecipient] = useState('');
  const [commSubject, setCommSubject] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [commOutcome, setCommOutcome] = useState('');

  const [escalateReason, setEscalateReason] = useState('');
  const [escalateRemarks, setEscalateRemarks] = useState('');

  const [reassignStationId, setReassignStationId] = useState('');
  const [reassignOfficerId, setReassignOfficerId] = useState('');
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);

  const [reviewRemarks, setReviewRemarks] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [assignedOfficerPhone, setAssignedOfficerPhone] = useState<string>('');

  const loadCase = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await complaintsService.getComplaintById(id);
      setComplaint(data);
      complaintsService.getComplaintTimeline(id).then(setTimelineEvents).catch(() => {});
      if (data?.assignment?.officerId) {
        officersService.getOfficerById(data.assignment.officerId)
          .then((off) => {
            if (off?.phone) setAssignedOfficerPhone(off.phone);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to load grievance details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  useEffect(() => {
    // Preload stations for reassign modal
    departmentsService.getStations().then(setStations);
  }, []);

  useEffect(() => {
    if (reassignStationId) {
      officersService.getOfficers(reassignStationId).then(setOfficers);
    } else {
      setOfficers([]);
    }
  }, [reassignStationId]);

  if (isLoading || !complaint) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    );
  }

  // Action handlers
  const handleSendReminder = async () => {
    if (!complaint.assignment) return;
    try {
      await followupsService.sendReminder(complaint.id, complaint.assignment.officerName);
      showToast('Reminder Dispatched', `Urgent follow-up alert sent to ${complaint.assignment.officerName}.`, 'success');
      setIsReminderModalOpen(false);
      loadCase();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleRecordCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await followupsService.recordCommunication({
        complaintId: complaint.id,
        type: commType,
        sender: `${user?.name} (${role})`,
        recipient: commRecipient,
        subject: commSubject,
        message: commMessage,
        outcome: commOutcome,
        deliveryStatus: 'DELIVERED',
      });
      showToast('Communication Logged', 'Official record appended to case communications.', 'success');
      setIsCommModalOpen(false);
      setCommSubject('');
      setCommMessage('');
      setCommOutcome('');
      loadCase();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleRequestEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await escalationsService.createEscalationRequest({
        complaintId: complaint.id,
        complaintTitle: complaint.details.title,
        departmentName: complaint.assignment?.departmentName || 'Home & Police Department',
        stationName: complaint.assignment?.stationName || 'District Police Station',
        officerId: complaint.assignment?.officerId || '',
        officerName: complaint.assignment?.officerName || 'Unassigned',
        requestingPaId: user.id,
        requestingPaName: user.name,
        reason: escalateReason,
        remarks: escalateRemarks,
        daysOverdue: complaint.operationalFlags.includes('OVERDUE') ? 4 : 0,
        previousRemindersCount: complaint.reminderCount || 1,
      });
      showToast('Escalation Submitted', 'Request routed to DC Main Admin for review and formal orders.', 'success');
      setIsEscalateModalOpen(false);
      setEscalateReason('');
      setEscalateRemarks('');
      loadCase();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    const station = stations.find((s) => s.id === reassignStationId);
    const officer = officers.find((o) => o.id === reassignOfficerId);
    if (!station || !officer || !user) return;

    try {
      await complaintsService.assignOfficer(complaint.id, {
        departmentId: 'dept-1',
        departmentName: 'Home & Police Department',
        stationId: station.id,
        stationName: station.name,
        officerId: officer.id,
        officerName: officer.name,
        officerDesignation: officer.designation,
        priority: complaint.assignment?.priority || 'HIGH',
        initialFollowupDate: new Date().toISOString().split('T')[0],
        nextFollowupDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        instructions: `Reassigned from previous station. Continue enquiry and submit status report.`,
        assignedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        assignedBy: `${user.name} (${role})`,
      });
      showToast('Officer Reassigned', `Case successfully transferred to ${officer.name} (${station.name}).`, 'success');
      setIsReassignModalOpen(false);
      loadCase();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleReviewResolution = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!user) return;
    try {
      await complaintsService.reviewResolution(
        complaint.id,
        decision,
        reviewRemarks || (decision === 'APPROVED' ? 'Verified and case closed.' : 'Clarifications required.'),
        user.name
      );
      showToast(
        decision === 'APPROVED' ? 'Case Closed' : 'Resolution Returned',
        decision === 'APPROVED'
          ? 'Grievance officially closed with recorded approval.'
          : 'Case sent back to officer for further investigation.',
        'success'
      );
      setIsResolutionModalOpen(false);
      setReviewRemarks('');
      loadCase();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleAcknowledgeAssignment = async () => {
    try {
      await complaintsService.startInvestigation(complaint.id);
      showToast('Assignment Acknowledged', 'Case status transitioned to Under Investigation.', 'success');
      loadCase();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const breadcrumbPrefix = role === 'DC_MAIN_ADMIN' ? '/admin' : role === 'DC_PA' ? '/pa' : '/officer';

  return (
    <div className="space-y-6">
      {/* Header & Back Navigation */}
      <PageHeader
        title={complaint.id}
        subtitle={complaint.details.title}
        breadcrumbs={[
          { label: 'Grievances', path: `${breadcrumbPrefix}/complaints` },
          { label: complaint.id },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* POLICE OFFICER ACTIONS */}
            {role === 'POLICE_OFFICER' && (
              <>
                {complaint.status === 'ASSIGNED' && (
                  <Button variant="gold" size="sm" onClick={handleAcknowledgeAssignment}>
                    Acknowledge Assignment
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/officer/cases/${complaint.id}/update`)}
                >
                  Submit Progress Update
                </Button>
                {complaint.status !== 'RESOLUTION_SUBMITTED' && complaint.status !== 'CLOSED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/officer/cases/${complaint.id}/resolution`)}
                  >
                    Submit Resolution
                  </Button>
                )}
              </>
            )}

            {/* DC PA ACTIONS */}
            {role === 'DC_PA' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCommRecipient(complaint.assignment?.officerName || complaint.citizen.phone);
                    setIsCommModalOpen(true);
                  }}
                >
                  Record Communication
                </Button>
                {complaint.assignment && (
                  <Button variant="secondary" size="sm" onClick={() => setIsReminderModalOpen(true)}>
                    Send Reminder
                  </Button>
                )}
                {!complaint.isEscalated && complaint.status !== 'CLOSED' && (
                  <Button variant="outline" size="sm" onClick={() => setIsEscalateModalOpen(true)}>
                    Request Escalation
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(true)}>
                  Reassign Officer
                </Button>
                {complaint.status === 'RESOLUTION_SUBMITTED' && (
                  <Button variant="gold" size="sm" onClick={() => setIsResolutionModalOpen(true)}>
                    Review Resolution
                  </Button>
                )}
              </>
            )}

            {/* DC MAIN ADMIN ACTIONS */}
            {role === 'DC_MAIN_ADMIN' && (
              <>
                {complaint.isEscalated && (
                  <Button variant="danger" size="sm" onClick={() => navigate('/admin/escalations')}>
                    Review Escalation Orders
                  </Button>
                )}
                {complaint.status === 'RESOLUTION_SUBMITTED' && (
                  <Button variant="gold" size="sm" onClick={() => setIsResolutionModalOpen(true)}>
                    Review & Close Case
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsReassignModalOpen(true)}>
                  Transfer Jurisdiction
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Case Summary Banner Card */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-none shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded">
                  {complaint.id}
                </span>
                <StatusBadge status={complaint.status} />
                {complaint.assignment && <PriorityBadge priority={complaint.assignment.priority} />}
                {complaint.operationalFlags.map((flag) => (
                  <FlagBadge key={flag} flag={flag} />
                ))}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                {complaint.details.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                {complaint.details.description}
              </p>
            </div>

            {/* Meta statistics pill */}
            <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 lg:border-l border-slate-700/80 pt-4 lg:pt-0 lg:pl-6 gap-3">
              <div className="text-left lg:text-right">
                <span className="text-[11px] text-slate-400 block">Next Follow-up Due:</span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {complaint.assignment?.nextFollowupDate || 'Awaiting Schedule'}
                </span>
              </div>
              <div className="text-left lg:text-right">
                <span className="text-[11px] text-slate-400 block">Investigating Officer:</span>
                <span className="text-sm font-semibold text-white">
                  {complaint.assignment?.officerName || 'Not Assigned'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {complaint.assignment?.stationName}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'documents', label: 'Documents', icon: FileCheck2, count: complaint.documents.length },
            { id: 'ai_review', label: 'AI Review & OCR', icon: Sparkles },
            { id: 'assignment', label: 'Assignment & Officer', icon: Shield },
            { id: 'progress', label: 'Investigation Progress', icon: Clock, count: complaint.progressUpdates.length },
            { id: 'timeline', label: 'Lifecycle Timeline', icon: History },
            { id: 'communication', label: 'Communication Log', icon: MessageSquare },
            { id: 'audit', label: 'Audit History', icon: Building },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-amber-500 text-slate-900 bg-amber-50/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Grievance Specifics & Action Requested</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detailed Statement</h4>
                  <p className="mt-1 text-slate-700 whitespace-pre-line leading-relaxed">
                    {complaint.details.description}
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-lg">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Specific Relief / Action Demanded by Citizen</h4>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed font-medium">
                    {complaint.details.requestedAction}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Incident Date</span>
                    <span className="font-semibold text-slate-800">{complaint.details.incidentDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Incident Location</span>
                    <span className="font-semibold text-slate-800">{complaint.details.incidentLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Language of Petition</span>
                    <span className="font-semibold text-slate-800 uppercase">{complaint.details.language}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Card if submitted or closed */}
            {complaint.resolution && (
              <Card className="border-teal-300 bg-teal-50/20">
                <CardHeader className="bg-teal-50/50 border-b border-teal-200">
                  <CardTitle className="text-sm font-bold text-teal-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Officer Resolution Submission</span>
                  </CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${complaint.resolution.reviewStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {complaint.resolution.reviewStatus}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3 text-sm p-5">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Resolution Summary</span>
                    <p className="text-slate-800 mt-1">{complaint.resolution.resolutionSummary}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase">Action Taken</span>
                    <p className="text-slate-700 text-xs mt-1">{complaint.resolution.actionTaken}</p>
                  </div>
                  {complaint.resolution.reviewRemarks && (
                    <div className="p-3 bg-white border border-teal-200 rounded text-xs text-teal-900">
                      <strong>Review Remarks ({complaint.resolution.reviewedBy}):</strong> {complaint.resolution.reviewRemarks}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column: Citizen Info & Assignment card */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-600" />
                  <span>Citizen Petitioner Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Citizen Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{complaint.citizen.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium">{complaint.citizen.phone}</span>
                </div>
                {complaint.citizen.email && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{complaint.citizen.email}</span>
                  </div>
                )}
                <div className="flex items-start gap-2 text-slate-700 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-800">{complaint.citizen.address}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Taluk: {complaint.citizen.taluk} &bull; District: {complaint.citizen.district}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Administrative Jurisdiction</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Department</span>
                  <span className="font-bold text-slate-900">{complaint.assignment?.departmentName || 'Not Assigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Police Station</span>
                  <span className="font-semibold text-slate-800">{complaint.assignment?.stationName || 'Not Assigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Investigating Officer</span>
                  <span className="font-semibold text-slate-800">{complaint.assignment?.officerName || 'Awaiting Assignment'}</span>
                  {complaint.assignment?.officerDesignation && (
                    <span className="text-[11px] text-slate-500 block">{complaint.assignment.officerDesignation}</span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
                  <span className="text-slate-400">Assigned On:</span>
                  <span className="font-mono text-slate-600">{complaint.assignment?.assignedAt.split(' ')[0] || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Documents */}
      {activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Petition Documents & Evidence Records ({complaint.documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complaint.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(doc.size / 1024).toFixed(1)} KB &bull; Uploaded {doc.uploadedAt}
                      </p>
                      {doc.isOriginal && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Original Petition Record
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ZoomIn className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedDocForInspection(doc);
                      setIsPreviewDocModalOpen(true);
                    }}
                  >
                    Inspect & OCR
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <Shield className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>
                Original complaint petitions and supporting evidentiary attachments are immutably preserved in the district case repository. No modifications or deletions are permitted under government records compliance standards.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: AI Review & OCR */}
      {activeTab === 'ai_review' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Bilingual Grievance Summaries (AI Extracted)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  English Grievance Summary:
                </span>
                <p className="text-slate-800 text-xs leading-relaxed">
                  {complaint.ocrAiExtraction?.englishSummary ||
                    'Complaint lodged regarding civic / safety violation requiring departmental inspection and immediate enforcement.'}
                </p>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 font-kannada">
                <span className="text-xs font-bold text-amber-950 block mb-1">
                  ಕನ್ನಡ ಸಾರಾಂಶ (Kannada Grievance Summary):
                </span>
                <p className="text-slate-800 text-xs leading-relaxed">
                  {complaint.ocrAiExtraction?.kannadaSummary ||
                    'ಸದರಿ ದೂರಿನ ಕುರಿತು ಸ್ಥಳೀಯ ಪೊಲೀಸ್ ಠಾಣಾಧಿಕಾರಿಗಳು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ಸೂಕ್ತ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳುವಂತೆ ವಿನಂತಿ.'}
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>Government Advisory:</strong> AI-generated summaries and suggested fields are assistance tools for administrative convenience and must always be verified by the DC PA.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">
                Raw Document OCR Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-slate-900 text-slate-300 font-mono text-xs rounded-xl h-64 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                {complaint.ocrAiExtraction?.rawText ||
                  `OFFICE OF THE DEPUTY COMMISSIONER, BENGALURU URBAN DISTRICT\nCASE ID: ${complaint.id}\nPETITION TITLE: ${complaint.details.title}\nAPPLICANT: ${complaint.citizen.name}\nPHONE: ${complaint.citizen.phone}\nLOCATION: ${complaint.details.incidentLocation}\n\nCONTENT:\n${complaint.details.description}`}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Assignment */}
      {activeTab === 'assignment' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Departmental Assignment & Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm p-6">
            {complaint.assignment ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Assigned Police Officer</span>
                    <p className="text-base font-bold text-slate-900">{complaint.assignment.officerName}</p>
                    <p className="text-xs text-slate-600">{complaint.assignment.officerDesignation}</p>
                    {assignedOfficerPhone && (
                      <p className="text-xs font-mono text-emerald-700 flex items-center gap-1.5 mt-1 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{assignedOfficerPhone}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Police Station / Unit</span>
                    <p className="text-sm font-semibold text-slate-800">{complaint.assignment.stationName}</p>
                    <p className="text-xs text-slate-500">{complaint.assignment.departmentName}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Assignment Authority</span>
                    <p className="text-xs font-semibold text-slate-800">{complaint.assignment.assignedBy}</p>
                    <p className="text-[11px] text-slate-500 font-mono">Date: {complaint.assignment.assignedAt}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 uppercase block mb-1">
                      Directives / Instructions for Investigating Officer
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {complaint.assignment.instructions || 'Conduct comprehensive field inspection and report back on compliance.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Initial Follow-up Date</span>
                      <span className="font-mono font-bold text-slate-800">{complaint.assignment.initialFollowupDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Active Next Follow-up</span>
                      <span className="font-mono font-bold text-amber-700">{complaint.assignment.nextFollowupDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                This grievance is currently awaiting departmental and officer assignment.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: Progress & Follow-up stream */}
      {activeTab === 'progress' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Investigation Progress Updates ({complaint.progressUpdates.length})
            </CardTitle>
            {role === 'POLICE_OFFICER' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/officer/cases/${complaint.id}/update`)}
              >
                Log New Progress Update
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-5">
            {complaint.progressUpdates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No formal progress updates submitted yet by investigating officer.
              </div>
            ) : (
              <div className="space-y-4">
                {complaint.progressUpdates.map((update, idx) => (
                  <div
                    key={update.id}
                    className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-900">{update.officerName}</span>
                          <span className="text-[11px] text-slate-500 ml-2">({update.officerDesignation})</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{update.createdAt}</span>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block">Action Taken:</span>
                      <p className="text-xs text-slate-800 mt-0.5 leading-relaxed font-medium">
                        {update.actionTaken}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-500 block">Enquiry / Site Remarks:</span>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {update.enquiryRemarks}
                      </p>
                    </div>

                    {update.reasonForDelay && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                        <strong>Reason for delay:</strong> {update.reasonForDelay}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>Status changed to: <strong>{update.currentStatus}</strong></span>
                      <span className="font-mono text-amber-700 font-bold">
                        Next follow-up: {update.nextFollowupDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: Timeline */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Chronological Case Lifecycle Stepper
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
              {timelineEvents.length > 0 ? (
                timelineEvents.map((evt: any) => (
                  <div key={evt.id} className="relative">
                    <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-200" />
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{evt.action.replace(/_/g, ' ')}</p>
                      {evt.new_status && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {evt.new_status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{evt.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">
                      {new Date(evt.created_at).toLocaleString()} {evt.performing_user_name ? `• by ${evt.performing_user_name}` : ''}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                    <p className="text-xs font-bold text-slate-900">Complaint Registered</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Citizen petition accepted into the district registry by DC PA.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">{complaint.registeredAt}</span>
                  </div>

                  {complaint.assignment && (
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-200" />
                      <p className="text-xs font-bold text-slate-900">Officer Assigned</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dispatched to {complaint.assignment.officerName} ({complaint.assignment.stationName}) with Priority {complaint.assignment.priority}.
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">{complaint.assignment.assignedAt}</span>
                    </div>
                  )}

                  {complaint.progressUpdates.map((upd) => (
                    <div key={upd.id} className="relative">
                      <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-200" />
                      <p className="text-xs font-bold text-slate-900">Progress Update Logged</p>
                      <p className="text-xs text-slate-600 mt-0.5">{upd.actionTaken}</p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">{upd.createdAt} &bull; by {upd.officerName}</span>
                    </div>
                  ))}

                  {complaint.resolution && (
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white ring-2 ring-teal-200" />
                      <p className="text-xs font-bold text-teal-900">Final Resolution Submitted</p>
                      <p className="text-xs text-teal-700 mt-0.5">{complaint.resolution.resolutionSummary}</p>
                      <span className="text-[10px] text-teal-500 font-mono block mt-1">{complaint.resolution.submittedAt}</span>
                    </div>
                  )}

                  {complaint.status === 'CLOSED' && (
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-emerald-700 border-2 border-white ring-2 ring-emerald-300" />
                      <p className="text-xs font-bold text-emerald-900">Case Officially Closed</p>
                      <p className="text-xs text-slate-500 mt-0.5">Resolution verified and finalized by District Magistrate.</p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">{complaint.lastUpdatedAt}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: Communication Log */}
      {activeTab === 'communication' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Communication History for {complaint.id}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCommRecipient(complaint.assignment?.officerName || complaint.citizen.phone);
                setIsCommModalOpen(true);
              }}
            >
              Log Communication
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              <div className="p-4 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Phone Call to Investigating Officer</span>
                  <p className="text-slate-500 mt-0.5">
                    Discussed initial survey scheduling and coordination with Taluk Surveyor.
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    Outcome: Officer confirmed spot visit within 48 hours.
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                  ACKNOWLEDGED
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: Audit History */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Immutable District Audit Trail (Append-Only)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="flex justify-between text-slate-500 text-[11px] mb-1">
                  <span>{complaint.registeredAt}</span>
                  <span>IP: 10.14.88.21</span>
                </div>
                <p className="text-slate-800 font-semibold">ACTION: CASE_RECORDED</p>
                <p className="text-slate-600 font-sans mt-0.5">
                  User: K. S. Narayanaswamy (DC_PA) catalogued grievance petition into the district registry.
                </p>
              </div>

              {complaint.assignment && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex justify-between text-slate-500 text-[11px] mb-1">
                    <span>{complaint.assignment.assignedAt}</span>
                    <span>IP: 10.14.88.21</span>
                  </div>
                  <p className="text-slate-800 font-semibold">ACTION: OFFICER_ASSIGNMENT_CREATED</p>
                  <p className="text-slate-600 font-sans mt-0.5">
                    Assigned to {complaint.assignment.officerName} at {complaint.assignment.stationName}.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reminder Confirmation Modal */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="Send Follow-up Reminder"
        description="Dispatch an urgent follow-up notification to the responsible officer."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            This will record an in-app follow-up reminder for{' '}
            <strong>{complaint.assignment?.officerName}</strong> ({complaint.assignment?.stationName})
            and increment the reminder counter to {(complaint.reminderCount || 0) + 1}.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Current overdue days: <strong>{complaint.operationalFlags.includes('OVERDUE') ? '4 days' : 'On Schedule'}</strong>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" size="md" onClick={handleSendReminder}>
              Confirm & Dispatch Reminder
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Communication Modal */}
      <Modal
        isOpen={isCommModalOpen}
        onClose={() => setIsCommModalOpen(false)}
        title="Record Communication"
        description="Log a phone call, official letter, or email concerning this grievance."
        maxWidth="lg"
      >
        <form onSubmit={handleRecordCommunication} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Type</label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value as any)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              >
                <option value="WHATSAPP">WhatsApp Message</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="EMAIL">Email</option>
                <option value="LETTER">Official Letter</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Recipient</label>
              <input
                type="text"
                required
                value={commRecipient}
                onChange={(e) => setCommRecipient(e.target.value)}
                placeholder="Name or phone / email"
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Subject / Purpose</label>
            <input
              type="text"
              required
              value={commSubject}
              onChange={(e) => setCommSubject(e.target.value)}
              placeholder="e.g. Enquiry regarding status of decibel meter inspection"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Summary of Conversation / Letter</label>
            <textarea
              rows={3}
              required
              value={commMessage}
              onChange={(e) => setCommMessage(e.target.value)}
              placeholder="Key points discussed..."
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Outcome / Next Action</label>
            <input
              type="text"
              required
              value={commOutcome}
              onChange={(e) => setCommOutcome(e.target.value)}
              placeholder="e.g. Officer agreed to submit report by Thursday 5 PM"
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsCommModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Communication Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request Escalation Modal */}
      <Modal
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        title="Submit Escalation Request"
        description="Recommend formal escalation to DC Main Admin due to missed deadlines or public sensitivity."
        maxWidth="md"
      >
        <form onSubmit={handleRequestEscalation} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reason for Escalation</label>
            <input
              type="text"
              required
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="e.g. Follow-up overdue by 4 days with repeated citizen distress calls"
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Supporting Administrative Remarks</label>
            <textarea
              rows={3}
              required
              value={escalateRemarks}
              onChange={(e) => setEscalateRemarks(e.target.value)}
              placeholder="Provide context on past reminders, station response, or urgency..."
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 leading-relaxed">
            Escalation requests are reviewed directly by the Deputy Commissioner & District Magistrate for formal intervention orders.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsEscalateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="md">
              Submit Escalation Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassign Officer Modal */}
      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reassign Responsible Officer"
        description="Select a new police station and investigating officer for this case."
        maxWidth="md"
      >
        <form onSubmit={handleReassign} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Police Station</label>
            <select
              required
              value={reassignStationId}
              onChange={(e) => {
                setReassignStationId(e.target.value);
                setReassignOfficerId('');
              }}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Select Station...</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">New Investigating Officer</label>
            <select
              required
              value={reassignOfficerId}
              onChange={(e) => setReassignOfficerId(e.target.value)}
              disabled={!reassignStationId}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white disabled:bg-slate-100"
            >
              <option value="">Select Officer...</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} &bull; {o.designation}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={!reassignOfficerId}>
              Confirm Reassignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Resolution Modal */}
      <Modal
        isOpen={isResolutionModalOpen}
        onClose={() => setIsResolutionModalOpen(false)}
        title="Review Officer Resolution"
        description="Approve to close the grievance, or return to officer with comments."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-700 block">Submitted Resolution:</span>
            <p className="text-slate-800 mt-1">{complaint.resolution?.resolutionSummary}</p>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Official Review Remarks</label>
            <textarea
              rows={3}
              value={reviewRemarks}
              onChange={(e) => setReviewRemarks(e.target.value)}
              placeholder="e.g. Action verified on site. Relief provided to petitioner."
              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleReviewResolution('REJECTED')}
            >
              Return for Clarification
            </Button>
            <Button
              type="button"
              variant="success"
              size="md"
              onClick={() => handleReviewResolution('APPROVED')}
            >
              Approve & Close Grievance
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Inspection Preview Modal */}
      <Modal
        isOpen={isPreviewDocModalOpen}
        onClose={() => setIsPreviewDocModalOpen(false)}
        title={`Petition Document & OCR Inspection: ${selectedDocForInspection?.name || 'Document'}`}
        description={`Classified Archive: ${complaint.id}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <OcrPanel
            documentId={selectedDocForInspection?.id}
            documentName={selectedDocForInspection?.name}
            file={selectedDocForInspection ? { name: selectedDocForInspection.name, size: selectedDocForInspection.size, url: selectedDocForInspection.url } : null}
            rawText={complaint.ocrAiExtraction?.rawText}
            reviewedText={complaint.ocrAiExtraction?.reviewedText}
          />
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewDocModalOpen(false)}>
              Close Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
