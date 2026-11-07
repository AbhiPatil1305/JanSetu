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

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export const sanitizeWhatsAppPhone = (phone?: string): string => {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return digits || '917676394332';
};

export const generateFollowupMessage = (record: FollowupRecord, lang: 'en' | 'kn' = 'en'): string => {
  const isKn = lang === 'kn';
  const statusClean = (record.status || 'UNDER_INVESTIGATION').replace(/_/g, ' ');

  if (isKn) {
    return `*ಜನಸೇತು - ಅಧಿಕೃತ ಕುಂದುಕೊರತೆ ಅನುಸರಣಾ ಸಂದೇಶ*
━━━━━━━━━━━━━━━━━━━━
📋 *ಪ್ರಕರಣ ಸಂಖ್ಯೆ:* ${record.complaintId}
👤 *ಅರ್ಜಿದಾರರು:* ${record.citizenName}
📝 *ವಿಷಯ:* ${record.complaintTitle}
🏛️ *ಠಾಣೆ / ವಿಭಾಗ:* ${record.stationName}
👮 *ತನಿಖಾಧಿಕಾರಿ:* ${record.officerName}
📅 *ಮುಂದಿನ ಅನುಸರಣಾ ದಿನಾಂಕ:* ${record.nextFollowupDate}
⚡ *ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ:* ${statusClean}

ಮಾನ್ಯರೇ, ತಮ್ಮ ಕುಂದುಕೊರತೆ ಅರ್ಜಿಯ ವಿಚಾರಣೆಯು ಜಿಲ್ಲಾಡಳಿತದ ಮೇಲ್ವಿಚಾರಣೆಯಲ್ಲಿ ಪ್ರಗತಿಯಲ್ಲಿದೆ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗೆ ಪ್ರಕರಣ ಸಂಖ್ಯೆಯನ್ನು ತಿಳಿಸಿ.

- *ಜಿಲ್ಲಾಧಿಕಾರಿಗಳ ಕಚೇರಿ, ಬೆಂಗಳೂರು ನಗರ*
(ಜನಸೇತು ಡಿಜಿಟಲ್ ಪೋರ್ಟಲ್)`;
  }

  return `*JanSetu - Official Grievance Follow-up*
━━━━━━━━━━━━━━━━━━━━
📋 *Case ID:* ${record.complaintId}
👤 *Citizen:* ${record.citizenName}
📝 *Grievance:* ${record.complaintTitle}
🏛️ *Station / Unit:* ${record.stationName}
👮 *Investigating Officer:* ${record.officerName}
📅 *Next Follow-up Date:* ${record.nextFollowupDate}
⚡ *Current Status:* ${statusClean}

Dear Citizen, your registered grievance is actively being investigated under the supervision of the District Administration. For queries, please quote your Case ID.

- *Office of the Deputy Commissioner, Bengaluru Urban*
(JanSetu Grievance Portal)`;
};

export const FollowupsMonitoringPage: React.FC = () => {
  const { role, user } = useAuth();
  const { t, language } = useLanguage();
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
  const [commType, setCommType] = useState<'PHONE_CALL' | 'EMAIL' | 'LETTER' | 'WHATSAPP'>('PHONE_CALL');
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

  const handleWhatsAppRedirect = async (record: FollowupRecord, customText?: string) => {
    const cleanPhone = sanitizeWhatsAppPhone(record.citizenPhone || '7676394332');
    const msg = customText || generateFollowupMessage(record, language);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;

    // Open WhatsApp Web or mobile app in a new tab/window
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    // Automatically record communication in JanSetu audit log
    try {
      await followupsService.recordCommunication({
        complaintId: record.complaintId,
        type: 'WHATSAPP',
        sender: `${user?.name || 'DC PA'} (${role || 'DC_PA'})`,
        recipient: `${record.citizenName} (+${cleanPhone})`,
        subject: `WhatsApp Follow-up: ${record.complaintId}`,
        message: msg,
        outcome: `WhatsApp follow-up launched for citizen mobile +${cleanPhone}`,
        deliveryStatus: 'SENT',
      });
      showToast(
        'WhatsApp Follow-up Launched',
        `Opened WhatsApp chat for ${record.citizenName} (+${cleanPhone}). Communication logged.`,
        'success'
      );
      loadFollowups();
    } catch (err: any) {
      console.error('Failed to log WhatsApp communication:', err);
    }
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
        actions={
          <Button
            variant="outline"
            size="sm"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold shadow-xs flex items-center gap-1.5"
            onClick={() => {
              const baseRecord = followups[0] || {
                id: 'fol-test',
                complaintId: 'JNS-2026-BLR-0001',
                complaintTitle: 'Commercial Noise Violation & Illegal Night Pub Operation',
                citizenName: 'Chandrashekar S. Murthy',
                citizenPhone: '+91 76763 94332',
                officerPhone: '+91 94808 01011',
                departmentName: 'Home & Police Department',
                stationName: 'Koramangala Police Station',
                officerId: 'user-officer-1',
                officerName: 'Inspector Ramesh Kumar',
                lastActionDate: '2026-11-04',
                nextFollowupDate: '2026-11-08',
                daysOverdue: 0,
                reminderHistoryCount: 1,
                status: 'UNDER_INVESTIGATION' as any,
                flags: [],
              };
              handleWhatsAppRedirect({ ...baseRecord, citizenPhone: '+91 76763 94332' });
            }}
          >
            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            <span>Test WhatsApp (7676394332)</span>
          </Button>
        }
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
                    <th className="p-3.5">Grievance & Citizen</th>
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
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800">{fol.citizenName}</span>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppRedirect(fol);
                            }}
                            className="font-mono text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1 transition"
                            title="Click to WhatsApp this registered number"
                          >
                            <WhatsAppIcon className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{fol.citizenPhone || '+91 76763 94332'}</span>
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{fol.latestUpdatePreview}</span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{fol.officerName}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span>{fol.stationName}</span>
                          {fol.officerPhone && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-emerald-700 font-semibold">{fol.officerPhone}</span>
                            </>
                          )}
                        </div>
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
                            variant="outline"
                            size="sm"
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 font-semibold shadow-xs flex items-center gap-1"
                            title={`Send WhatsApp Follow-up to ${fol.citizenName} (${fol.citizenPhone || '+91 76763 94332'})`}
                            onClick={() => handleWhatsAppRedirect(fol)}
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Send In-App Reminder to Officer"
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
                <span>Officer: {reminderModalRecord.officerName} {reminderModalRecord.officerPhone ? `(${reminderModalRecord.officerPhone})` : ''}</span>
                <span>Station: {reminderModalRecord.stationName}</span>
              </div>
            </div>

            {/* WhatsApp Direct Citizen Follow-up Action */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  <span>Citizen WhatsApp Dispatch</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-mono">
                  {reminderModalRecord.citizenName} ({reminderModalRecord.citizenPhone || '+91 76763 94332'})
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shrink-0"
                onClick={() => {
                  handleWhatsAppRedirect(reminderModalRecord);
                  setReminderModalRecord(null);
                }}
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                <span>Open in WhatsApp</span>
              </Button>
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
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setCommType(newType);
                  if (newType === 'WHATSAPP' && commModalRecord) {
                    setCommSubject(`WhatsApp Follow-up: ${commModalRecord.complaintId}`);
                    setCommMessage(generateFollowupMessage(commModalRecord, language));
                    setCommOutcome(`Dispatched via WhatsApp to ${commModalRecord.citizenPhone || '+91 76763 94332'}`);
                  }
                }}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="WHATSAPP">WhatsApp Follow-up Message</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="EMAIL">Official Email</option>
                <option value="LETTER">Departmental Memo</option>
              </select>
            </div>

            {commType === 'WHATSAPP' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-emerald-900 block">Citizen Registered Mobile</span>
                  <span className="text-[11px] font-mono text-emerald-700">
                    +{sanitizeWhatsAppPhone(commModalRecord.citizenPhone || '7676394332')} ({commModalRecord.citizenName})
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shrink-0"
                  onClick={() => handleWhatsAppRedirect(commModalRecord, commMessage)}
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                  <span>Open in WhatsApp</span>
                </Button>
              </div>
            )}

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
