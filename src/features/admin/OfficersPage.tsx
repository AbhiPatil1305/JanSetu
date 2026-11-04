import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { officersService } from '../../services/api/officers.service';
import { departmentsService } from '../../services/api/departments.service';
import { complaintsService } from '../../services/api/complaints.service';
import { User } from '../../types/auth';
import { PoliceStation } from '../../types/department';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Users, Plus, Edit, Phone, Mail, Shield, CheckCircle2, Briefcase } from 'lucide-react';

export const OfficersPage: React.FC = () => {
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [officers, setOfficers] = useState<User[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [selectedStationFilter, setSelectedStationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Police Inspector (SHO)');
  const [stationId, setStationId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [offs, stns] = await Promise.all([
        officersService.getOfficers(selectedStationFilter || undefined),
        departmentsService.getStations(),
      ]);
      setOfficers(offs);
      setStations(stns);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStationFilter]);

  const handleOpenAdd = () => {
    setEditingOfficer(null);
    setName('');
    setEmployeeId(`KSP-PSI-2024-${Math.floor(1000 + Math.random() * 9000)}`);
    setDesignation('Police Sub-Inspector');
    setStationId(stations[0]?.id || 'stn-1');
    setPhone('+91 94808 ');
    setEmail('');
    setBadgeNumber(`PSI-${Math.floor(1000 + Math.random() * 9000)}`);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (officer: User) => {
    setEditingOfficer(officer);
    setName(officer.name);
    setEmployeeId(officer.employeeId);
    setDesignation(officer.designation);
    setStationId(officer.stationId || '');
    setPhone(officer.phone);
    setEmail(officer.email);
    setBadgeNumber(officer.badgeNumber || '');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (officer: User) => {
    const newStatus = officer.status === 'active' ? 'inactive' : 'active';
    try {
      await officersService.updateOfficer(officer.id, { status: newStatus });
      showToast('Status Updated', `${officer.name} is now ${newStatus}.`, 'success');
      loadData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employeeId.trim()) return;

    const stn = stations.find((s) => s.id === stationId);

    try {
      if (editingOfficer) {
        await officersService.updateOfficer(editingOfficer.id, {
          name,
          employeeId,
          designation,
          stationId,
          stationName: stn?.name,
          phone,
          email,
          badgeNumber,
        });
        showToast('Officer Updated', `${name} profile updated.`, 'success');
      } else {
        await officersService.addOfficer({
          name,
          email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@ksp.gov.in`,
          employeeId,
          role: 'POLICE_OFFICER',
          designation,
          departmentId: 'dept-1',
          departmentName: 'Home & Police Department',
          stationId,
          stationName: stn?.name,
          badgeNumber,
          phone,
          status: 'active',
        });
        showToast('Officer Added', `${name} enrolled in district roster.`, 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Officers & Investigating Staff"
        subtitle="Manage assigned police personnel, ranks, contact channels, and station deployments."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Officers & Staff' }]}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedStationFilter}
              onChange={(e) => setSelectedStationFilter(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700"
            >
              <option value="">All Police Stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
              Add Officer
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {officers.map((officer) => (
          <Card key={officer.id} className="hover:shadow-md transition">
            <CardHeader className="bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs">
                  {officer.name.charAt(0)}
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {officer.employeeId}
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                    {officer.name}
                  </CardTitle>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  officer.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {officer.status}
              </span>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Designation & Rank</span>
                <span className="font-bold text-slate-800 text-sm block">{officer.designation}</span>
                {officer.badgeNumber && (
                  <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block mt-0.5">
                    Badge: {officer.badgeNumber}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Station Deployment</span>
                <span className="font-semibold text-slate-900">{officer.stationName || 'District Reserve'}</span>
                <span className="text-[11px] text-slate-500 block">{officer.departmentName}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{officer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{officer.email}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/complaints?officerId=${officer.id}`)}
                >
                  View Cases
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleToggleStatus(officer)}>
                    {officer.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdit(officer)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOfficer ? 'Edit Officer Profile' : 'Enroll Investigating Officer'}
        description="Official police roster registration within JanSetu."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Employee ID / KGID</label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="KSP-PI-2015-1102"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Badge / Brass No</label>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="PI-4029"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Officer Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Inspector Ramesh Kumar"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="Police Inspector (SHO)">Police Inspector (SHO)</option>
                <option value="Police Sub-Inspector">Police Sub-Inspector (PSI)</option>
                <option value="Deputy Superintendent of Police">Deputy Superintendent (DSP)</option>
                <option value="Assistant Sub-Inspector">Assistant Sub-Inspector (ASI)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Police Station</label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mobile Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 94808 01011"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@ksp.gov.in"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingOfficer ? 'Update Officer' : 'Enroll Officer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
