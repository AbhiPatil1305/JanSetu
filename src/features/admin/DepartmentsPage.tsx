import React, { useState, useEffect } from 'react';
import { departmentsService } from '../../services/api/departments.service';
import { Department } from '../../types/department';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Building2, Plus, Edit, Phone, Mail, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const { showToast } = useNotifications();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [head, setHead] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await departmentsService.getDepartments();
      setDepartments(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setHead('');
    setContactEmail('');
    setContactPhone('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setHead(dept.head);
    setContactEmail(dept.contactEmail);
    setContactPhone(dept.contactPhone);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (dept: Department) => {
    const newStatus = dept.status === 'active' ? 'inactive' : 'active';
    try {
      await departmentsService.updateDepartment(dept.id, { status: newStatus });
      showToast('Status Updated', `${dept.name} is now ${newStatus}.`, 'success');
      loadDepartments();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    try {
      if (editingDept) {
        await departmentsService.updateDepartment(editingDept.id, {
          name,
          code,
          head,
          contactEmail,
          contactPhone,
        });
        showToast('Department Updated', `${name} details have been updated.`, 'success');
      } else {
        await departmentsService.addDepartment({
          name,
          code,
          head,
          contactEmail,
          contactPhone,
          status: 'active',
        });
        showToast('Department Added', `${name} created successfully.`, 'success');
      }
      setIsModalOpen(false);
      loadDepartments();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments Management"
        subtitle="Manage participating government departments, designated heads, and oversight units."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Departments' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            Add Department
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} className="hover:shadow-md transition">
            <CardHeader className="bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {dept.code}
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                    {dept.name}
                  </CardTitle>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  dept.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {dept.status}
              </span>
            </CardHeader>
            <CardContent className="space-y-4 p-5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Departmental Head</span>
                <span className="font-semibold text-slate-800 text-sm">{dept.head}</span>
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{dept.contactPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dept.contactEmail}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Units</span>
                  <strong className="font-mono text-slate-800">{dept.stationsCount}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <strong className="font-mono text-slate-800">{dept.totalComplaints}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Open</span>
                  <strong className="font-mono text-blue-700">{dept.openComplaints}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(dept)}
                >
                  {dept.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenEdit(dept)}
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
        title={editingDept ? 'Edit Department Details' : 'Add New Department'}
        description="Enter departmental parameters and designated nodal authority contact."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Code</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. POLICE, BBMP"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Department Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Home & Police Department"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Department Head / Secretary</label>
            <input
              type="text"
              required
              value={head}
              onChange={(e) => setHead(e.target.value)}
              placeholder="e.g. Sri Alok Kumar, IPS"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Email</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="dept@karnataka.gov.in"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 80 2200 1122"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
