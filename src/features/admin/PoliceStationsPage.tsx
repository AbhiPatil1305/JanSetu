import React, { useState, useEffect } from 'react';
import { departmentsService } from '../../services/api/departments.service';
import { PoliceStation, Department } from '../../types/department';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Shield, Plus, Edit, Phone, MapPin, User, CheckCircle2 } from 'lucide-react';

export const PoliceStationsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<PoliceStation | null>(null);

  // Form fields
  const [departmentId, setDepartmentId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [inChargeName, setInChargeName] = useState('');
  const [inChargeRank, setInChargeRank] = useState('Police Inspector (SHO)');

  const loadStations = async () => {
    setIsLoading(true);
    try {
      const [stns, depts] = await Promise.all([
        departmentsService.getStations(selectedDeptFilter || undefined),
        departmentsService.getDepartments(),
      ]);
      setStations(stns);
      setDepartments(depts);
      if (depts.length > 0 && !departmentId) {
        setDepartmentId(depts[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, [selectedDeptFilter]);

  const handleOpenAdd = () => {
    setEditingStation(null);
    setDepartmentId(departments[0]?.id || '');
    setCode('');
    setName('');
    setLocation('');
    setContactNumber('');
    setInChargeName('');
    setInChargeRank('Police Inspector (SHO)');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (station: PoliceStation) => {
    setEditingStation(station);
    setDepartmentId(station.departmentId);
    setCode(station.code);
    setName(station.name);
    setLocation(station.location);
    setContactNumber(station.contactNumber);
    setInChargeName(station.inChargeName);
    setInChargeRank(station.inChargeRank);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (station: PoliceStation) => {
    const newStatus = station.status === 'active' ? 'inactive' : 'active';
    try {
      await departmentsService.updateStation(station.id, { status: newStatus });
      showToast('Station Status Updated', `${station.name} is now ${newStatus}.`, 'success');
      loadStations();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    try {
      if (editingStation) {
        await departmentsService.updateStation(editingStation.id, {
          departmentId,
          code,
          name,
          location,
          contactNumber,
          inChargeName,
          inChargeRank,
        });
        showToast('Station Updated', `${name} updated successfully.`, 'success');
      } else {
        await departmentsService.addStation({
          departmentId,
          code,
          name,
          location,
          contactNumber,
          inChargeName,
          inChargeRank,
          status: 'active',
        });
        showToast('Station Added', `${name} added to police directory.`, 'success');
      }
      setIsModalOpen(false);
      loadStations();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Police Stations & Units Management"
        subtitle="Manage territorial police jurisdictions, station house officers (SHO), and active case loads."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Police Stations' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            Add Police Station
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((stn) => (
          <Card key={stn.id} className="hover:shadow-md transition">
            <CardHeader className="bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {stn.code}
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                    {stn.name}
                  </CardTitle>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  stn.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {stn.status}
              </span>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-xs">
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{stn.location}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Station In-Charge (SHO)</span>
                <span className="font-bold text-slate-900 text-sm block">{stn.inChargeName}</span>
                <span className="text-[11px] text-slate-500">{stn.inChargeRank}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{stn.contactNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Officers</span>
                  <strong className="font-mono text-slate-800">{stn.officersCount}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Active Cases</span>
                  <strong className="font-mono text-amber-700">{stn.activeCases}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => handleToggleStatus(stn)}>
                  {stn.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(stn)}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStation ? 'Edit Station Details' : 'Add New Police Station'}
        description="Configure station code, territorial jurisdiction, and designated SHO."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Station Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. KRM-PS, IND-PS"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Station Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Koramangala Police Station"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Territorial Location / Address</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Full address and postal code"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">In-Charge Officer Name</label>
              <input
                type="text"
                required
                value={inChargeName}
                onChange={(e) => setInChargeName(e.target.value)}
                placeholder="e.g. Inspector Ramesh Kumar"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rank / Designation</label>
              <input
                type="text"
                required
                value={inChargeRank}
                onChange={(e) => setInChargeRank(e.target.value)}
                placeholder="e.g. Police Inspector (SHO)"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
            <input
              type="text"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+91 80 2294 3462"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingStation ? 'Update Station' : 'Create Station'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
