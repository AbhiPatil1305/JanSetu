import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/api/audit.service';
import { ReminderSettings } from '../../types/audit';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BellRing, Save, CheckCircle2, AlertCircle, Clock, Shield } from 'lucide-react';

export const ReminderSettingsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    auditService.getReminderSettings().then(setSettings);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      await auditService.updateReminderSettings(settings);
      showToast('Settings Updated', 'Automated follow-up and escalation threshold rules updated successfully.', 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Follow-up Reminder & Escalation Rules"
        subtitle="Configure automated notification schedules, delay thresholds, and escalation triggers."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reminder Rules' }]}
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Follow-up & Overdue Trigger Thresholds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Lead Time Reminder (Days before follow-up)
                </label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={settings.reminderBeforeFollowupDays}
                  onChange={(e) =>
                    setSettings({ ...settings, reminderBeforeFollowupDays: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sends advance notification to investigating officer before due date.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Overdue Notification Delay (Hours past deadline)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={settings.overdueNotificationDelayHours}
                  onChange={(e) =>
                    setSettings({ ...settings, overdueNotificationDelayHours: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Grace period before flagging case as Overdue in district dashboard.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  No-Update Warning Threshold (Days)
                </label>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={settings.noUpdateThresholdDays}
                  onChange={(e) =>
                    setSettings({ ...settings, noUpdateThresholdDays: Number(e.target.value) })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Flags case with 'No Recent Update' badge if officer has not logged progress.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Automatic Escalation Recommendation Threshold (Days)
                </label>
                <input
                  type="number"
                  min={2}
                  max={14}
                  value={settings.escalationRecommendationThresholdDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      escalationRecommendationThresholdDays: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Prompts DC PA to recommend formal escalation to District Magistrate.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="font-semibold text-slate-800 block mb-1">
                Automated Reminder Cadence
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'DAILY', label: 'Daily (Strict)' },
                  { id: 'TWICE_WEEKLY', label: 'Twice Weekly' },
                  { id: 'WEEKLY', label: 'Weekly' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, reminderFrequency: item.id as any })}
                    className={`p-3 rounded-lg border text-center font-semibold transition ${
                      settings.reminderFrequency === item.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600" />
              <span>Simulated Delivery Channels</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6 text-xs">
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">In-App Official Notification Drawer</span>
                <span className="text-slate-500 text-[11px]">
                  Real-time alerts displayed in JanSetu header bell.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.channels.inApp}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    channels: { ...settings.channels, inApp: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-slate-900"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Official Police Mobile SMS Alert (Simulated)</span>
                <span className="text-slate-500 text-[11px]">
                  Simulates SMS dispatch to registered officer phone (+91 94808...).
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.channels.smsSimulated}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    channels: { ...settings.channels, smsSimulated: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-slate-900"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Official Departmental Email (Simulated)</span>
                <span className="text-slate-500 text-[11px]">
                  Simulates automated email dispatch to officer@ksp.gov.in.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.channels.emailSimulated}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    channels: { ...settings.channels, emailSimulated: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-slate-900"
              />
            </label>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
              Note: Demonstration environment. SMS and Email channels update mock communication logs without consuming live gateway credits.
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="submit" variant="primary" size="md" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Reminder Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
