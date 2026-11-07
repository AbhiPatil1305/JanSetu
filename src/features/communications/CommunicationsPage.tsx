import React, { useState, useEffect } from 'react';
import { followupsService } from '../../services/api/followups.service';
import { complaintsService } from '../../services/api/complaints.service';
import { CommunicationRecord, CommunicationType } from '../../types/communication';
import { Complaint } from '../../types/complaint';
import { useAuth } from '../../providers/AuthContext';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Shield,
  Search,
} from 'lucide-react';

export const CommunicationsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [communications, setCommunications] = useState<CommunicationRecord[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [complaintId, setComplaintId] = useState('');
  const [type, setType] = useState<CommunicationType>('PHONE_CALL');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [outcome, setOutcome] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [comms, comps] = await Promise.all([
        followupsService.getCommunications(),
        complaintsService.getComplaints(),
      ]);
      setCommunications(comms);
      setComplaints(comps);
      if (comps.length > 0 && !complaintId) {
        setComplaintId(comps[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    if (complaints.length > 0) {
      setComplaintId(complaints[0].id);
      setRecipient(complaints[0].assignment?.officerName || '+91 94808 ...');
    }
    setType('PHONE_CALL');
    setSubject('');
    setMessage('');
    setOutcome('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintId || !recipient.trim() || !subject.trim() || !user) return;

    try {
      await followupsService.recordCommunication({
        complaintId,
        type,
        sender: `${user.name} (${role})`,
        recipient,
        subject,
        message,
        outcome,
        deliveryStatus: 'DELIVERED',
      });
      showToast('Communication Logged', 'Record archived in official case communication log.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const filteredCommunications = communications.filter((c) => {
    if (selectedType && c.type !== selectedType) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        c.complaintId.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.recipient.toLowerCase().includes(q) ||
        c.sender.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTypeIcon = (commType: CommunicationType) => {
    switch (commType) {
      case 'PHONE_CALL':
        return <Phone className="w-4 h-4 text-emerald-600" />;
      case 'WHATSAPP':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'LETTER':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Communication Log"
        subtitle="Catalogued records of phone calls, official letters, emails, and departmental memos."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Communication Log' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            Record Communication
          </Button>
        }
      />

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Case ID, Recipient, Subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-900"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Channels</option>
            <option value="WHATSAPP">WhatsApp Message</option>
            <option value="PHONE_CALL">Phone Call</option>
            <option value="EMAIL">Email</option>
            <option value="LETTER">Official Letter</option>
            <option value="IN_APP">In-App Notification</option>
          </select>
        </CardContent>
      </Card>

      {/* Communications list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading communications log...</div>
          ) : filteredCommunications.length === 0 ? (
            <EmptyState
              title="No Communication Records"
              description="No communication logs found matching criteria."
            />
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {filteredCommunications.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-slate-100 flex-shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {item.complaintId}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{item.subject}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{item.timestamp}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">{item.message}</p>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div>
                        <span>Sender: <strong>{item.sender}</strong></span> &bull;{' '}
                        <span>Recipient: <strong>{item.recipient}</strong></span>
                      </div>
                      {item.outcome && (
                        <div className="font-medium text-slate-800">
                          Outcome: <span className="italic">{item.outcome}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.deliveryStatus && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-800 flex-shrink-0">
                      {item.deliveryStatus}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Communication Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record New Communication"
        description="Catalog an official phone conversation, email dispatch, or departmental notice."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Associated Grievance</label>
            <select
              value={complaintId}
              onChange={(e) => {
                setComplaintId(e.target.value);
                const c = complaints.find((comp) => comp.id === e.target.value);
                if (c) setRecipient(c.assignment?.officerName || c.citizen.phone);
              }}
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {complaints.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.details.title.substring(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Channel / Medium</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="WHATSAPP">WhatsApp Message</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="EMAIL">Email</option>
                <option value="LETTER">Official Letter / Memo</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Recipient Name / Number</label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Insp. Ramesh Kumar"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Enquiry regarding spot survey of Sy No. 44"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Details & Remarks</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Key matters communicated during the interaction..."
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Outcome / Agreed Timeline</label>
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Officer agreed to submit report by Thursday 5 PM"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Log Communication
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
