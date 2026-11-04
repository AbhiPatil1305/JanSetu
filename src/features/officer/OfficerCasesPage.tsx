import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { complaintsService } from '../../services/api/complaints.service';
import { Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Search, Filter, Eye, Clock, CheckCircle2, RotateCcw } from 'lucide-react';

export const OfficerCasesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCases = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // In demo mode, fetch cases assigned to this officer or station
      const all = await complaintsService.getComplaints();
      const officerCases = all.filter(
        (c) => c.assignment?.officerId === user.id || c.assignment?.stationId === user.stationId
      );
      setCases(officerCases);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [user]);

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          c.id.toLowerCase().includes(q) ||
          c.citizen.name.toLowerCase().includes(q) ||
          c.details.title.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (selectedStatus && c.status !== selectedStatus) return false;
      if (selectedPriority && c.assignment?.priority !== selectedPriority) return false;
      return true;
    });
  }, [cases, searchTerm, selectedStatus, selectedPriority]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assigned Grievance Roster"
        subtitle={`Complaints assigned to ${user?.name} (${user?.stationName || 'Koramangala Police Station'}).`}
        breadcrumbs={[{ label: 'Officer Portal' }, { label: 'Assigned Cases' }]}
      />

      {/* Filter toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assigned cases by ID, citizen, title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-900"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">New / Awaiting Acknowledgment</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {(searchTerm || selectedStatus || selectedPriority) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
                setSelectedPriority('');
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Cases list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading assigned cases...</div>
          ) : filteredCases.length === 0 ? (
            <EmptyState
              title="No Assigned Cases Found"
              description="No grievances match the filter criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider select-none">
                  <tr>
                    <th className="p-3.5 pl-5">Case ID</th>
                    <th className="p-3.5">Citizen Petitioner</th>
                    <th className="p-3.5">Grievance Specifics</th>
                    <th className="p-3.5 text-center">Priority</th>
                    <th className="p-3.5 text-center">Assigned Date</th>
                    <th className="p-3.5 text-center">Next Follow-up</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/officer/cases/${c.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="p-3.5 pl-5 whitespace-nowrap">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {c.id}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{c.citizen.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{c.citizen.phone}</span>
                      </td>

                      <td className="p-3.5 max-w-sm">
                        <p className="font-semibold text-slate-800 line-clamp-1">{c.details.title}</p>
                        <span className="text-[10px] text-slate-400 block truncate">{c.details.incidentLocation}</span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        {c.assignment && <PriorityBadge priority={c.assignment.priority} size="sm" />}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap font-mono text-slate-600">
                        {c.assignment?.assignedAt.split(' ')[0]}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap font-mono">
                        <span
                          className={
                            c.operationalFlags.includes('OVERDUE')
                              ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded'
                              : 'text-slate-800'
                          }
                        >
                          {c.assignment?.nextFollowupDate}
                        </span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={c.status} size="sm" />
                      </td>

                      <td className="p-3.5 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/officer/cases/${c.id}/update`)}
                          >
                            Update
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/officer/cases/${c.id}`)}
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
    </div>
  );
};
