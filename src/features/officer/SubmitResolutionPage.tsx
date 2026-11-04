import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useNotifications } from '../../providers/NotificationContext';
import { complaintsService } from '../../services/api/complaints.service';
import { Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CheckCircle2, ArrowLeft, Upload, Paperclip, AlertCircle, Shield } from 'lucide-react';

export const SubmitResolutionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [resolutionDate, setResolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    complaintsService
      .getComplaintById(id)
      .then((data) => {
        setComplaint(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummary.trim() || !actionTaken.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await complaintsService.submitResolution(complaint.id, {
        id: `res-${Date.now()}`,
        complaintId: complaint.id,
        officerId: user.id,
        officerName: user.name,
        resolutionSummary,
        actionTaken,
        resolutionDate,
        additionalRemarks: additionalRemarks.trim() || undefined,
        supportingDocuments: attachmentName
          ? [{ name: attachmentName, url: '#', size: '1.8 MB' }]
          : undefined,
        submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        reviewStatus: 'PENDING_REVIEW',
      });

      showToast(
        'Resolution Submitted for Verification',
        'Status transitioned to Resolution Submitted. DC PA and Admin notified for review.',
        'success'
      );
      navigate(`/officer/cases/${complaint.id}`);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to submit resolution', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateAttach = () => {
    setAttachmentName('Final_Resolution_Panchanama_Signed.pdf');
    showToast('Evidence Attached', 'Final_Resolution_Panchanama_Signed.pdf attached.', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Submit Final Resolution: ${complaint.id}`}
        subtitle={complaint.details.title}
        breadcrumbs={[
          { label: 'My Assigned Cases', path: '/officer/cases' },
          { label: complaint.id, path: `/officer/cases/${complaint.id}` },
          { label: 'Submit Resolution' },
        ]}
      />

      {/* Advisory Banner */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Statutory Compliance Protocol:</span>
          <span>
            Under District Grievance Rules, investigating officers submit final action reports for official verification. The case status will transition to <strong>Resolution Submitted</strong>. Final case closure is authorized exclusively by the DC PA or District Magistrate.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Resolution Findings & Outcome Report</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Executive Resolution Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="State clearly how the citizen grievance was resolved on the ground..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-800 outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Statutory Police Action Taken <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="e.g. Registered FIR / Removed illegal barricade / Mutual compromise signed before panchas..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-800 outline-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Resolution Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Additional Notes / Citizen Feedback
                </label>
                <input
                  type="text"
                  value={additionalRemarks}
                  onChange={(e) => setAdditionalRemarks(e.target.value)}
                  placeholder="e.g. Complainant expressed full satisfaction with recovery"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="font-bold text-slate-800 block mb-1">
                Signed Panchanama / Clearance Evidence
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
                  className="p-3 border border-dashed border-slate-300 hover:border-teal-500 rounded-lg text-slate-600 hover:text-teal-800 text-xs w-full text-center transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Attach Signed Panchanama / Spot Inspection Closure Report</span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

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

          <Button type="submit" variant="gold" size="lg" isLoading={isSubmitting}>
            SUBMIT RESOLUTION FOR REVIEW
          </Button>
        </div>
      </form>
    </div>
  );
};
