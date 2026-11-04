import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import { followupsService } from '../../services/api/followups.service';
import { FollowupRecord } from '../../types/followup';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, FlagBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Clock,
  Send,
  Phone,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Calendar,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export const FollowupsMonitoringPage: React.FC = () => {
  const { role, user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as any) || 'all';

  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Send Reminder Modal
  const [reminderModalRecord, setReminderModalRecord] = useState<FollowupRecord | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Record Comm Modal
  const [commModalRecord, setCommModalRecord] = useState<FollowupRecord | null>(null);
  const [commType, setCommType] = useState<'PHONE_CALL' | 'EMAIL' | 'LETTER'>('PHONE_CALL');
  const [commSubject, setCommSubject] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [commOutcome, setCommOutcome] = useState('');

  const loadFollowups = async () => {
    setIsLoading(true);
    try {
      const data = await followupsService.getFollowups(activeTab === 'all' ? undefined : activeTab);
      setFollowups(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowups();
  }, [activeTab]);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSendReminder = async () => {
    if (!reminderModalRecord) return;
    setIsSendingReminder(true);
    try {
      await followupsService.sendReminder(
        reminderModalRecord.complaintId,
        reminderModalRecord.officerName
      );
      showToast(
        'Follow-up Reminder Dispatched',
        `Notification delivered to ${reminderModalRecord.officerName}.`,
        'success'
      );
      setReminderModalRecord(null);
      loadFollowups();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleRecordCommSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commModalRecord || !user) return;

    try {
      await followupsService.recordCommunication({
        complaintId: commModalRecord.complaintId,
        type: commType,
        sender: `${user.name} (${role})`,
        recipient: commModalRecord.officerName,
        subject: commSubject,
        message: commMessage,
        outcome: commOutcome,
        deliveryStatus: 'DELIVERED',
      });
      showToast('Communication Logged', 'Record appended to case communication log.', 'success');
      setCommModalRecord(null);
      setCommSubject('');
      setCommMessage('');
      setCommOutcome('');
      loadFollowups();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleViewCase = (caseId: string) => {
    if (role === 'DC_MAIN_ADMIN') navigate(`/admin/complaints/${caseId}`);
    else if (role === 'DC_PA') navigate(`/pa/complaints/${caseId}`);
    else navigate(`/officer/cases/${caseId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-up Monitoring & Reminders"
        subtitle="Oversight of active investigating officer deadlines, reminder dispatches, and overdue case tracking."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Follow-ups' }]}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px text-xs sm:text-sm font-semibold">
          {[
            { id: 'all', label: 'All Follow-ups' },
            { id: 'dueToday', label: 'Due Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'overdue', label: 'Overdue Cases' },
            { id: 'noRecentUpdate', label: 'No Recent Update' },
            { id: 'awaitingResponse', label: 'Awaiting Officer Response' },
          ].map((tItem) => {
            const isActive = activeTab === tItem.id;
            return (
              <button
                key={tItem.id}
                onClick={() => handleTabChange(tItem.id)}
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

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading follow-up records...</div>
          ) : followups.length === 0 ? (
            <EmptyState
              title="No Follow-up Records Found"
              description="There are currently no cases matching this follow-up filter category."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider select-none">
                  <tr>
                    <th className="p-3.5 pl-5">Case ID</th>
                    <th className="p-3.5">Grievance Title</th>
                    <th className="p-3.5">Investigating Officer</th>
                    <th className="p-3.5 text-center">Last Action Date</th>
                    <th className="p-3.5 text-center">Next Follow-up</th>
                    <th className="p-3.5 text-center">Days Overdue</th>
                    <th className="p-3.5 text-center">Reminders Sent</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {followups.map((fol) => (
                    <tr
                      key={fol.id}
                      onClick={() => handleViewCase(fol.complaintId)}
                      className="hover:bg-amber-50/30 cursor-pointer transition"
                    >
                      <td className="p-3.5 pl-5 whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {fol.complaintId}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <p className="font-bold text-slate-900 line-clamp-1">{fol.complaintTitle}</p>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{fol.latestUpdatePreview}</span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{fol.officerName}</span>
                        <span className="text-[10px] text-slate-500">{fol.stationName}</span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap font-mono text-slate-600">
                        {fol.lastActionDate}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap font-mono">
                        <span
                          className={
                            fol.daysOverdue > 0
                              ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded'
                              : 'text-slate-800'
                          }
                        >
                          {fol.nextFollowupDate}
                        </span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        {fol.daysOverdue > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                            {fol.daysOverdue} days
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">On Schedule</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          {fol.reminderHistoryCount}
                        </span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={fol.status} size="sm" />
                      </td>

                      <td className="p-3.5 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Send In-App Reminder"
                            onClick={() => setReminderModalRecord(fol)}
                          >
                            <Send className="w-3.5 h-3.5 text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Record Phone Call / Note"
                            onClick={() => {
                              setCommModalRecord(fol);
                              setCommSubject(`Follow-up enquiry: ${fol.complaintId}`);
                            }}
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCase(fol.complaintId)}
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

      {/* Send Reminder Modal */}
      <Modal
        isOpen={!!reminderModalRecord}
        onClose={() => setReminderModalRecord(null)}
        title="Send Urgent Follow-up Reminder"
        description="Notify the investigating police officer through their official JanSetu inbox."
        maxWidth="md"
      >
        {reminderModalRecord && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-800">Case: {reminderModalRecord.complaintId}</span>
              <p className="text-slate-600">{reminderModalRecord.complaintTitle}</p>
              <div className="flex justify-between items-center text-slate-500 pt-1 font-mono text-[11px]">
                <span>Officer: {reminderModalRecord.officerName}</span>
                <span>Station: {reminderModalRecord.stationName}</span>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Dispatching this reminder will generate a high-priority notification for the officer and log the action in the permanent district follow-up audit trail.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="md" onClick={() => setReminderModalRecord(null)}>
                Cancel
              </Button>
              <Button
                variant="gold"
                size="md"
                isLoading={isSendingReminder}
                onClick={handleSendReminder}
              >
                Send Official Reminder
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Communication Modal */}
      <Modal
        isOpen={!!commModalRecord}
        onClose={() => setCommModalRecord(null)}
        title="Record Officer Communication"
        description="Document a telephonic follow-up or administrative memo."
        maxWidth="md"
      >
        {commModalRecord && (
          <form onSubmit={handleRecordCommSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Type</label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value as any)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="PHONE_CALL">Phone Call</option>
                <option value="EMAIL">Official Email</option>
                <option value="LETTER">Departmental Memo</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Subject</label>
              <input
                type="text"
                required
                value={commSubject}
                onChange={(e) => setCommSubject(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Details & Remarks</label>
              <textarea
                rows={3}
                required
                value={commMessage}
                onChange={(e) => setCommMessage(e.target.value)}
                placeholder="Spoke with SHO regarding spot verification..."
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Outcome / Promised Action</label>
              <input
                type="text"
                required
                value={commOutcome}
                onChange={(e) => setCommOutcome(e.target.value)}
                placeholder="e.g. Officer will upload mahazar by 5 PM tomorrow"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="md" onClick={() => setCommModalRecord(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                Log Follow-up Communication
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
