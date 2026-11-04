import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useNotifications } from '../../providers/NotificationContext';
import { complaintsService } from '../../services/api/complaints.service';
import { Complaint, ComplaintStatus } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  FileText,
  Clock,
  Upload,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';

export const SubmitProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [actionTaken, setActionTaken] = useState('');
  const [progressDescription, setProgressDescription] = useState('');
  const [enquiryRemarks, setEnquiryRemarks] = useState('');
  const [currentStatus, setCurrentStatus] = useState<ComplaintStatus>('UNDER_INVESTIGATION');
  const [nextFollowupDate, setNextFollowupDate] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
  );
  const [reasonForDelay, setReasonForDelay] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    complaintsService
      .getComplaintById(id)
      .then((data) => {
        setComplaint(data);
        setCurrentStatus(data.status);
        setIsLoading(false);
      })
      .catch((err) => {
        showToast('Error', err.message, 'error');
        navigate('/officer/cases');
      });
  }, [id]);

  if (isLoading || !complaint) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading case details...</div>;
  }

  const isOverdue =
    complaint.operationalFlags.includes('OVERDUE') ||
    (complaint.assignment && complaint.assignment.nextFollowupDate < new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTaken.trim() || !user) return;

    if (isOverdue && !reasonForDelay.trim()) {
      showToast('Delay Explanation Required', 'This case is overdue. Please explain the reason for delay.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await complaintsService.submitProgressUpdate(complaint.id, {
        id: `upd-${Date.now()}`,
        complaintId: complaint.id,
        officerId: user.id,
        officerName: user.name,
        officerDesignation: user.designation,
        actionTaken,
        progressDescription,
        enquiryRemarks,
        currentStatus,
        nextFollowupDate,
        reasonForDelay: reasonForDelay.trim() || undefined,
        attachments: attachmentName
          ? [{ name: attachmentName, url: '#', size: '1.2 MB' }]
          : undefined,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      showToast(
        'Investigation Progress Logged',
        `Follow-up rescheduled to ${nextFollowupDate}. DC PA notified.`,
        'success'
      );
      navigate(`/officer/cases/${complaint.id}`);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to submit update', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateAttach = () => {
    setAttachmentName('Field_Inquiry_Mahazar_Report.pdf');
    showToast('Evidence Attached', 'Field_Inquiry_Mahazar_Report.pdf attached.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Submit Progress Update: ${complaint.id}`}
        subtitle={complaint.details.title}
        breadcrumbs={[
          { label: 'My Assigned Cases', path: '/officer/cases' },
          { label: complaint.id, path: `/officer/cases/${complaint.id}` },
          { label: 'Submit Progress' },
        ]}
      />

      {/* Case Context Summary Card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Petitioner: {complaint.citizen.name}</span>
              <span className="text-slate-400 font-mono">({complaint.citizen.phone})</span>
            </div>
            <StatusBadge status={complaint.status} size="sm" />
          </div>
          <p className="text-slate-600 line-clamp-2">{complaint.details.description}</p>
          <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500 font-mono">
            <span>Directives: {complaint.assignment?.instructions}</span>
            <span>Target Follow-up: {complaint.assignment?.nextFollowupDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Overdue alert banner if applicable */}
      {isOverdue && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Follow-up Overdue Advisory:</span>
            <span>
              This grievance has exceeded the scheduled follow-up deadline. Statutory rules require investigating officers to provide a detailed justification for the administrative delay.
            </span>
          </div>
        </div>
      )}

      {/* Progress Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Investigation Progress & Action Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Summary of Action Taken <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="e.g. Visited site at 14:00 hrs with Village Accountant. Issued Section 91 notice."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Detailed Progress Description
              </label>
              <textarea
                rows={3}
                value={progressDescription}
                onChange={(e) => setProgressDescription(e.target.value)}
                placeholder="Elaborate on witness statements recorded, boundary markers inspected, or notices issued..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-800 outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Enquiry / Site Findings & Next Steps
              </label>
              <textarea
                rows={2}
                value={enquiryRemarks}
                onChange={(e) => setEnquiryRemarks(e.target.value)}
                placeholder="Observations made during spot inspection..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-800 outline-none leading-relaxed"
              />
            </div>

            {/* Overdue delay reason field */}
            {isOverdue && (
              <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200">
                <label className="font-bold text-rose-900 block mb-1">
                  Reason for Statutory Delay <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reasonForDelay}
                  onChange={(e) => setReasonForDelay(e.target.value)}
                  placeholder="e.g. Deployed on high-security VVIP bandobast / Surveyor unavailable due to election duties"
                  className="w-full p-2.5 border border-rose-300 rounded-lg text-sm text-slate-900 bg-white"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Updated Lifecycle Status</label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as ComplaintStatus)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="UNDER_INVESTIGATION">Under Investigation (Active Enquiry)</option>
                  <option value="AWAITING_INFORMATION">Awaiting Citizen / Department Documents</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Next Scheduled Follow-up Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            {/* Supporting Document / Evidence */}
            <div className="pt-4 border-t border-slate-100">
              <label className="font-bold text-slate-800 block mb-1">
                Supporting Investigation Evidence / Mahazar (Optional)
              </label>
              {attachmentName ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono font-medium text-slate-800">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    {attachmentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachmentName(null)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSimulateAttach}
                  className="p-3 border border-dashed border-slate-300 hover:border-amber-500 rounded-lg text-slate-600 hover:text-amber-800 text-xs w-full text-center transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Attach Field Inquiry Panchanama / Notice Copy</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Previous Progress Entries in chronological view */}
        {complaint.progressUpdates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Previous Recorded Updates</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {complaint.progressUpdates.map((upd) => (
                <div key={upd.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                    <span>{upd.officerName}</span>
                    <span>{upd.createdAt}</span>
                  </div>
                  <p className="font-bold text-slate-800">{upd.actionTaken}</p>
                  <p className="text-slate-600">{upd.enquiryRemarks}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(`/officer/cases/${complaint.id}`)}
          >
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
            Submit Official Progress Update
          </Button>
        </div>
      </form>
    </div>
  );
};
