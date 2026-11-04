import React, { useState, useEffect, useMemo } from 'react';
import { auditService } from '../../services/api/audit.service';
import { AuditLog } from '../../types/audit';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Shield, Search, Filter, History, RotateCcw, Clock } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    auditService.getAuditLogs().then((data) => {
      setLogs(data);
      setIsLoading(false);
    });
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          log.description.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          (log.complaintId && log.complaintId.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (selectedRole && log.userRole !== selectedRole) return false;
      if (selectedModule && log.module !== selectedModule) return false;
      return true;
    });
  }, [logs, searchTerm, selectedRole, selectedModule]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="District System Audit Trail"
        subtitle="Cryptographically sealed, append-only chronological record of all administrative operations."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Audit Trail' }]}
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, user, case ID, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900 outline-none"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Roles</option>
            <option value="DC_MAIN_ADMIN">DC_MAIN_ADMIN</option>
            <option value="DC_PA">DC_PA</option>
            <option value="POLICE_OFFICER">POLICE_OFFICER</option>
          </select>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Modules</option>
            <option value="Complaints">Complaints</option>
            <option value="Assignment">Assignment</option>
            <option value="Investigations">Investigations</option>
            <option value="Escalations">Escalations</option>
            <option value="Communications">Communications</option>
          </select>

          {(searchTerm || selectedRole || selectedModule) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRole('');
                setSelectedModule('');
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              title="No Audit Records Found"
              description="No audit events matched the filter criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider font-sans select-none">
                  <tr>
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">Actor / User</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5">Action Code</th>
                    <th className="p-3.5">Case ID</th>
                    <th className="p-3.5 pr-5">Event Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-5 whitespace-nowrap text-slate-500">
                        {log.timestamp}
                      </td>

                      <td className="p-3.5 whitespace-nowrap font-sans font-bold text-slate-900">
                        {log.userName}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {log.userRole}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap font-sans text-slate-700">
                        {log.module}
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-amber-800 font-bold">
                        {log.action}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {log.complaintId ? (
                          <span className="font-bold text-slate-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {log.complaintId}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3.5 pr-5 font-sans text-slate-700 max-w-md">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
