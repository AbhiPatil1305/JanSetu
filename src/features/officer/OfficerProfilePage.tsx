import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useNotifications } from '../../providers/NotificationContext';
import { officersService } from '../../services/api/officers.service';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Shield, Phone, Mail, User as UserIcon, Building2, Save } from 'lucide-react';

export const OfficerProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { showToast } = useNotifications();

  const [phone, setPhone] = useState(user?.phone || '+91 94808 01011');
  const [email, setEmail] = useState(user?.email || 'officer@jansetu.demo');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.phone) setPhone(user.phone);
    if (user?.email) setEmail(user.email);
  }, [user?.phone, user?.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      await officersService.updateOfficer(user.id, {
        phone,
        email,
      });
      updateCurrentUser({ phone, email });
      showToast('Profile Updated', `Official contact phone updated to ${phone}.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Official Officer Profile"
        subtitle="Departmental service credentials, active jurisdiction, and contact records."
        breadcrumbs={[{ label: 'Officer Portal' }, { label: 'Profile' }]}
      />

      <Card>
        <CardHeader className="bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 font-bold text-xl flex items-center justify-center shadow-sm">
              {user?.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">{user?.name}</CardTitle>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                KGID: {user?.employeeId} &bull; Badge: {user?.badgeNumber || 'PI-4029'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
            Active Duty
          </span>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold">Rank / Designation</span>
                <span className="font-bold text-slate-900 text-sm">{user?.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Police Station</span>
                <span className="font-bold text-slate-900 text-sm">
                  {user?.stationName || 'Koramangala Police Station'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Parent Department</span>
                <span className="font-semibold text-slate-800">Home & Police Department</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Role Authority</span>
                <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                  POLICE_OFFICER
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                Editable Official Contact Information
              </h4>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Official Mobile Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Departmental Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" variant="primary" size="md" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Save Contact Updates
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
