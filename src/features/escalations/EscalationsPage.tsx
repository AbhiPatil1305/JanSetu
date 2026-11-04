import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useNotifications } from '../../providers/NotificationContext';
import { escalationsService } from '../../services/api/escalations.service';
import { complaintsService } from '../../services/api/complaints.service';
import { EscalationRequest, EscalationStatus } from '../../types/escalation';
import { Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { Flame, CheckCircle2, XCircle, Clock, Eye, Plus, ShieldAlert, ArrowRight } from 'lucide-react';

export const EscalationsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [escalations, setEscalations] = useState<EscalationRequest[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal (For Admin)
  const [reviewModalReq, setReviewModalReq] = useState<EscalationRequest | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Request Modal (For PA)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [escs, comps] = await Promise.all([
        escalationsService.getEscalations(activeTab === 'ALL' ? undefined : activeTab),
        complaintsService.getComplaints(),
      ]);
      setEscalations(escs);
      setComplaints(comps);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleReviewDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!reviewModalReq || !user) return;
    setIsSubmittingDecision(true);
    try {
      await escalationsService.reviewEscalation(
        reviewModalReq.id,
        decision,
        decisionRemarks || (decision === 'APPROVED' ? 'Approved for direct administrative enquiry.' : 'Escalation rejected; normal follow-up to continue.'),
        user
      );
      showToast(
        decision === 'APPROVED' ? 'Escalation Approved' : 'Escalation Rejected',
        `Formal orders logged for Case ${reviewModalReq.complaintId}.`,
        'success'
      );
      setReviewModalReq(null);
      setDecisionRemarks('');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId || !reason.trim() || !user) return;

    const comp = complaints.find((c) => c.id === selectedComplaintId);
    if (!comp) return;

    try {
      await escalationsService.createEscalationRequest({
        complaintId: comp.id,
        complaintTitle: comp.details.title,
        departmentName: comp.assignment?.departmentName || 'Home & Police Department',
        stationName: comp.assignment?.stationName || 'District Police Station',
        officerId: comp.assignment?.officerId || '',
        officerName: comp.assignment?.officerName || 'Unassigned',
        requestingPaId: user.id,
        requestingPaName: user.name,
        reason,
        remarks,
        daysOverdue: comp.operationalFlags.includes('OVERDUE') ? 4 : 0,
        previousRemindersCount: comp.reminderCount || 1,
      });

      showToast('Escalation Request Dispatched', 'Request routed to DC Main Admin for review.', 'success');
      setIsRequestModalOpen(false);
      setSelectedComplaintId('');
      setReason('');
      setRemarks('');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleViewCase = (caseId: string) => {
    if (role === 'DC_MAIN_ADMIN') navigate(`/admin/complaints/${caseId}`);
    else navigate(`/pa/complaints/${caseId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalations Management & Orders"
        subtitle="Review, approve, or reject formal escalation requests requiring District Magistrate intervention."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Escalations' }]}
        actions={
          role === 'DC_PA' && (
            <Button
              variant="gold"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsRequestModalOpen(true)}
            >
              Request Escalation
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px text-xs sm:text-sm font-semibold">
          {[
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'APPROVED', label: 'Approved Orders' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'ALL', label: 'All Requests' },
          ].map((tItem) => {
            const isActive = activeTab === tItem.id;
            return (
              <button
                key={tItem.id}
                onClick={() => setActiveTab(tItem.id as any)}
                className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-amber-500 text-slate-900 bg-amber-50/20'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tItem.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Escalations Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading escalation records...</div>
          ) : escalations.length === 0 ? (
            <EmptyState
              title="No Escalation Requests Found"
              description="No cases currently match this escalation status category."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider select-none">
                  <tr>
                    <th className="p-3.5 pl-5">Case ID</th>
                    <th className="p-3.5">Grievance Title</th>
                    <th className="p-3.5">Reason for Escalation</th>
                    <th className="p-3.5">Officer & Station</th>
                    <th className="p-3.5 text-center">Overdue Days</th>
                    <th className="p-3.5 text-center">Request Date</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {escalations.map((esc) => (
                    <tr
                      key={esc.id}
                      onClick={() => handleViewCase(esc.complaintId)}
                      className="hover:bg-amber-50/30 cursor-pointer transition"
                    >
                      <td className="p-3.5 pl-5 whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {esc.complaintId}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <p className="font-bold text-slate-900 line-clamp-1">{esc.complaintTitle}</p>
                        <span className="text-[10px] text-slate-400">By: {esc.requestingPaName}</span>
                      </td>

                      <td className="p-3.5 max-w-sm">
                        <p className="font-semibold text-rose-900 line-clamp-2">{esc.reason}</p>
                        {esc.decisionRemarks && (
                          <p className="text-[10px] text-slate-500 mt-1 italic">
                            Order: {esc.decisionRemarks}
                          </p>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{esc.officerName}</span>
                        <span className="text-[10px] text-slate-500">{esc.stationName}</span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap font-mono">
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold">
                          {esc.daysOverdue} days
                        </span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap font-mono text-slate-600">
                        {esc.requestDate.split(' ')[0]}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            esc.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : esc.status === 'REJECTED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-red-100 text-red-800 animate-pulse'
                          }`}
                        >
                          {esc.status}
                        </span>
                      </td>

                      <td className="p-3.5 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {role === 'DC_MAIN_ADMIN' && esc.status === 'PENDING' && (
                            <Button
                              variant="gold"
                              size="sm"
                              onClick={() => setReviewModalReq(esc)}
                            >
                              Decide Order
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCase(esc.complaintId)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Review Modal (For Admin) */}
      <Modal
        isOpen={!!reviewModalReq}
        onClose={() => setReviewModalReq(null)}
        title="Deputy Commissioner Escalation Decision"
        description="Formal intervention order for overdue or critical grievance."
        maxWidth="md"
      >
        {reviewModalReq && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-800">Case: {reviewModalReq.complaintId}</span>
              <p className="text-slate-700">{reviewModalReq.complaintTitle}</p>
              <p className="text-rose-800 font-semibold mt-1">Reason: {reviewModalReq.reason}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">Remarks: {reviewModalReq.remarks}</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Executive Order Remarks / Directives
              </label>
              <textarea
                rows={3}
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder="e.g. Directed ACP Jayanagar to personally verify site and lodge FIR within 24 hours."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-900"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="md"
                disabled={isSubmittingDecision}
                onClick={() => handleReviewDecision('REJECTED')}
              >
                Reject Request
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmittingDecision}
                onClick={() => handleReviewDecision('APPROVED')}
              >
                Approve Escalation Order
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* PA Create Escalation Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit New Escalation Request"
        description="Recommend formal DC intervention for non-compliant or sensitive cases."
        maxWidth="md"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Active Case</label>
            <select
              required
              value={selectedComplaintId}
              onChange={(e) => setSelectedComplaintId(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">Select Grievance...</option>
              {complaints
                .filter((c) => c.status !== 'CLOSED' && !c.isEscalated)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.details.title.substring(0, 50)}...
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reason for Escalation</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Follow-up overdue by 5 days without officer response"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Supporting Case Details</label>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Context regarding past phone reminders or citizen distress..."
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="md" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="md">
              Submit Escalation Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
