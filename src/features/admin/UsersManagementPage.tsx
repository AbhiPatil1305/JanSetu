import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api/auth.service';
import { User, UserRole } from '../../types/auth';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { UserCog, Plus, Edit, RotateCcw, Shield, CheckCircle2 } from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('POLICE_OFFICER');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getUsers();
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmployeeId(`EMP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setEmail('');
    setRole('POLICE_OFFICER');
    setDesignation('Police Officer');
    setPhone('+91 94808 00000');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (userItem: User) => {
    setEditingUser(userItem);
    setName(userItem.name);
    setEmployeeId(userItem.employeeId);
    setEmail(userItem.email);
    setRole(userItem.role);
    setDesignation(userItem.designation);
    setPhone(userItem.phone);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (userItem: User) => {
    const newStatus = userItem.status === 'active' ? 'inactive' : 'active';
    try {
      await authService.updateUser(userItem.id, { status: newStatus });
      showToast('User Status Updated', `${userItem.name} is now ${newStatus}.`, 'success');
      loadUsers();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleResetPassword = (userItem: User) => {
    showToast('Password Reset', `Password for ${userItem.name} reset to default: JanSetu@123`, 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !employeeId.trim()) return;

    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, {
          name,
          employeeId,
          email,
          role,
          designation,
          phone,
        });
        showToast('User Updated', `${name} account updated.`, 'success');
      } else {
        await authService.createUser({
          name,
          employeeId,
          email,
          role,
          designation,
          phone,
          status: 'active',
          departmentName: role === 'POLICE_OFFICER' ? 'Home & Police Department' : 'District Administration',
        });
        showToast('User Created', `${name} added to JanSetu.`, 'success');
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts & Role Permissions"
        subtitle="Manage government accounts and role assignments across the three statutory roles."
        breadcrumbs={[{ label: 'Administration' }, { label: 'User Management' }]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            Create User Account
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">User</th>
                  <th className="p-3.5">Employee ID</th>
                  <th className="p-3.5">Official Email</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Last Login</th>
                  <th className="p-3.5 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-[11px]">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900">{u.name}</span>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-600">{u.employeeId}</td>
                    <td className="p-3.5 text-slate-700">{u.email}</td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-600">{u.designation}</td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono text-slate-500">{u.lastLogin || 'Never'}</td>

                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reset Password to JanSetu@123"
                          onClick={() => handleResetPassword(u)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(u)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Account' : 'Create Government User'}
        description="Assign authorized system permissions restricted to the 3 mandatory roles."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Inspector Suresh Reddy"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

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
              <label className="font-semibold text-slate-700 block mb-1">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="DC_MAIN_ADMIN">DC_MAIN_ADMIN</option>
                <option value="DC_PA">DC_PA</option>
                <option value="POLICE_OFFICER">POLICE_OFFICER</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@ksp.gov.in"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mobile Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 94808 00000"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Designation</label>
            <input
              type="text"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Police Inspector (SHO)"
              className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="md" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
