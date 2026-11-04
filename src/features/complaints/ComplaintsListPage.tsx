import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import { complaintsService } from '../../services/api/complaints.service';
import { departmentsService } from '../../services/api/departments.service';
import { officersService } from '../../services/api/officers.service';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../../types/complaint';
import { Department, PoliceStation } from '../../types/department';
import { User } from '../../types/auth';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge, FlagBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  Filter,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  Flame,
  Building2,
  Shield,
  FilePlus2,
} from 'lucide-react';

export const ComplaintsListPage: React.FC = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyEscalated, setOnlyEscalated] = useState(false);
  const [onlyAwaiting, setOnlyAwaiting] = useState(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<'id' | 'date' | 'priority' | 'daysPending'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [comps, depts, stns, offs] = await Promise.all([
        complaintsService.getComplaints(),
        departmentsService.getDepartments(),
        departmentsService.getStations(),
        officersService.getOfficers(),
      ]);
      setComplaints(comps);
      setDepartments(depts);
      setStations(stns);
      setOfficers(offs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and sort complaints
  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.citizen.name.toLowerCase().includes(q) ||
          c.citizen.phone.includes(q) ||
          c.details.title.toLowerCase().includes(q) ||
          (c.assignment && c.assignment.officerName.toLowerCase().includes(q))
      );
    }

    if (selectedDept) {
      result = result.filter((c) => c.assignment?.departmentId === selectedDept);
    }

    if (selectedStation) {
      result = result.filter((c) => c.assignment?.stationId === selectedStation);
    }

    if (selectedOfficer) {
      result = result.filter((c) => c.assignment?.officerId === selectedOfficer);
    }

    if (selectedStatus) {
      result = result.filter((c) => c.status === selectedStatus);
    }

    if (selectedPriority) {
      result = result.filter((c) => c.assignment?.priority === selectedPriority);
    }

    if (onlyOverdue) {
      result = result.filter((c) => c.operationalFlags.includes('OVERDUE'));
    }

    if (onlyEscalated) {
      result = result.filter((c) => c.isEscalated || c.operationalFlags.includes('ESCALATED'));
    }

    if (onlyAwaiting) {
      result = result.filter((c) => c.status === 'AWAITING_ASSIGNMENT' || !c.assignment);
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a.registeredAt;
      let valB: any = b.registeredAt;

      if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortField === 'daysPending') {
        valA = a.daysPending;
        valB = b.daysPending;
      } else if (sortField === 'priority') {
        const priorityWeights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        valA = a.assignment ? priorityWeights[a.assignment.priority] || 0 : 0;
        valB = b.assignment ? priorityWeights[b.assignment.priority] || 0 : 0;
      }

      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return result;
  }, [
    complaints,
    searchTerm,
    selectedDept,
    selectedStation,
    selectedOfficer,
    selectedStatus,
    selectedPriority,
    onlyOverdue,
    onlyEscalated,
    onlyAwaiting,
    sortField,
    sortOrder,
  ]);

  // Paginated slice
  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, page, pageSize]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Case ID',
      'Citizen Name',
      'Mobile',
      'Title',
      'Department',
      'Police Station',
      'Officer',
      'Priority',
      'Status',
      'Overdue',
      'Next Follow-up',
      'Registered Date',
    ];

    const rows = filteredComplaints.map((c) => [
      c.id,
      `"${c.citizen.name}"`,
      c.citizen.phone,
      `"${c.details.title.replace(/"/g, '""')}"`,
      `"${c.assignment?.departmentName || 'Unassigned'}"`,
      `"${c.assignment?.stationName || 'Unassigned'}"`,
      `"${c.assignment?.officerName || 'Unassigned'}"`,
      c.assignment?.priority || 'None',
      c.status,
      c.operationalFlags.includes('OVERDUE') ? 'YES' : 'NO',
      c.assignment?.nextFollowupDate || 'None',
      c.registeredAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JanSetu_Grievances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('CSV Export Ready', `Exported ${filteredComplaints.length} grievances to CSV.`, 'success');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDept('');
    setSelectedStation('');
    setSelectedOfficer('');
    setSelectedStatus('');
    setSelectedPriority('');
    setOnlyOverdue(false);
    setOnlyEscalated(false);
    setOnlyAwaiting(false);
    setPage(1);
  };

  const handleCaseClick = (caseId: string) => {
    if (role === 'DC_MAIN_ADMIN') navigate(`/admin/complaints/${caseId}`);
    else if (role === 'DC_PA') navigate(`/pa/complaints/${caseId}`);
    else navigate(`/officer/cases/${caseId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="District Grievance Registry"
        subtitle={`Central directory of ${complaints.length} registered public complaints and police follow-ups.`}
        breadcrumbs={[{ label: 'Grievances' }]}
        actions={
          <div className="flex items-center gap-2">
            {role === 'DC_PA' && (
              <Button
                variant="gold"
                size="sm"
                leftIcon={<FilePlus2 className="w-4 h-4" />}
                onClick={() => navigate('/pa/register-complaint')}
              >
                Register Grievance
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Top row: Search and active flags */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Case ID, Citizen Name, Mobile, Title, Officer..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              <button
                onClick={() => {
                  setOnlyOverdue(!onlyOverdue);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                  onlyOverdue
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Overdue Cases</span>
              </button>

              <button
                onClick={() => {
                  setOnlyEscalated(!onlyEscalated);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                  onlyEscalated
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Escalated</span>
              </button>

              <button
                onClick={() => {
                  setOnlyAwaiting(!onlyAwaiting);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                  onlyAwaiting
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Awaiting Assignment</span>
              </button>

              {(searchTerm ||
                selectedDept ||
                selectedStation ||
                selectedOfficer ||
                selectedStatus ||
                selectedPriority ||
                onlyOverdue ||
                onlyEscalated ||
                onlyAwaiting) && (
                <button
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition flex items-center gap-1"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom row: Dropdowns for Status, Priority, Department, Station, Officer */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-xs">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="AWAITING_ASSIGNMENT">Awaiting Assignment</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="AWAITING_INFORMATION">Awaiting Information</option>
              <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <select
              value={selectedStation}
              onChange={(e) => {
                setSelectedStation(e.target.value);
                setPage(1);
              }}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 truncate"
            >
              <option value="">All Police Stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedOfficer}
              onChange={(e) => {
                setSelectedOfficer(e.target.value);
                setPage(1);
              }}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 truncate"
            >
              <option value="">All Officers</option>
              {officers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortField(f as any);
                setSortOrder(o as any);
              }}
              className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="date-desc">Newest Registered</option>
              <option value="date-asc">Oldest Registered</option>
              <option value="daysPending-desc">Longest Pending</option>
              <option value="priority-desc">Highest Priority</option>
              <option value="id-asc">Case ID Asc</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Complaints Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading district registry...</div>
          ) : paginatedComplaints.length === 0 ? (
            <EmptyState
              title="No Grievances Found"
              description="No cases match your active filter criteria. Try clearing filters or searching another keyword."
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider select-none">
                  <tr>
                    <th className="p-3.5 pl-5">Case ID</th>
                    <th className="p-3.5">Citizen Petitioner</th>
                    <th className="p-3.5">Grievance Title</th>
                    <th className="p-3.5">Police Station</th>
                    <th className="p-3.5">Assigned Officer</th>
                    <th className="p-3.5 text-center">Priority</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Follow-up Date</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedComplaints.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleCaseClick(c.id)}
                      className="hover:bg-amber-50/30 cursor-pointer transition"
                    >
                      {/* Case ID + Flags */}
                      <td className="p-3.5 pl-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {c.id}
                          </span>
                          {c.operationalFlags.includes('OVERDUE') && (
                            <span className="w-2 h-2 rounded-full bg-rose-600" title="Overdue Follow-up" />
                          )}
                          {c.isEscalated && (
                            <span title="Escalated">
                              <Flame className="w-3.5 h-3.5 text-red-600 fill-current" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Citizen */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{c.citizen.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{c.citizen.phone}</span>
                      </td>

                      {/* Title */}
                      <td className="p-3.5 max-w-xs">
                        <p className="font-semibold text-slate-800 line-clamp-1">{c.details.title}</p>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {c.details.category} &bull; {c.details.incidentLocation}
                        </span>
                      </td>

                      {/* Station */}
                      <td className="p-3.5 whitespace-nowrap text-slate-700">
                        {c.assignment ? (
                          <span>{c.assignment.stationName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Officer */}
                      <td className="p-3.5 whitespace-nowrap">
                        {c.assignment ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">{c.assignment.officerName}</span>
                            <span className="text-[10px] text-slate-500">{c.assignment.officerDesignation}</span>
                          </div>
                        ) : (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            Awaiting Assignment
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {c.assignment ? (
                          <PriorityBadge priority={c.assignment.priority} size="sm" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={c.status} size="sm" />
                      </td>

                      {/* Follow-up Date */}
                      <td className="p-3.5 text-center whitespace-nowrap font-mono text-slate-700">
                        {c.assignment ? (
                          <span
                            className={
                              c.operationalFlags.includes('OVERDUE')
                                ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded'
                                : ''
                            }
                          >
                            {c.assignment.nextFollowupDate}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCaseClick(c.id);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination Footer */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="p-1 border border-slate-200 rounded bg-white text-slate-700"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                Showing {(page - 1) * pageSize + 1} -{' '}
                {Math.min(page * pageSize, filteredComplaints.length)} of {filteredComplaints.length} records
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-3 font-semibold text-slate-800">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
