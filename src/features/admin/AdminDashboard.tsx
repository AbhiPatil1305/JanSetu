import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { reportsService, DashboardStats, DepartmentReportItem } from '../../services/api/reports.service';
import { complaintsService } from '../../services/api/complaints.service';
import { auditService } from '../../services/api/audit.service';
import { Complaint } from '../../types/complaint';
import { AuditLog } from '../../types/audit';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge, FlagBadge } from '../../components/common/Badge';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  FileText,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Inbox,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [deptReports, setDeptReports] = useState<DepartmentReportItem[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [trendTimeframe, setTrendTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [dashStats, trends, dist, depts, complaints, logs] = await Promise.all([
          reportsService.getDashboardStats(),
          reportsService.getComplaintTrends(),
          reportsService.getStatusDistribution(),
          reportsService.getDepartmentReports(),
          complaintsService.getComplaints(),
          auditService.getAuditLogs(),
        ]);

        setStats(dashStats);
        setTrendData(trends);
        setStatusDistribution(dist);
        setDeptReports(depts);
        setRecentComplaints(complaints.slice(0, 5));
        setRecentActivity(logs.slice(0, 5));
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [trendTimeframe]);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: t.dashboard.kpis.totalComplaints,
      value: stats.totalComplaints,
      icon: FileText,
      color: 'text-slate-800 bg-slate-100',
      link: '/admin/complaints',
      desc: 'All catalogued district grievances',
    },
    {
      label: t.dashboard.kpis.openCases,
      value: stats.openCases,
      icon: Clock,
      color: 'text-blue-700 bg-blue-50',
      link: '/admin/complaints?status=open',
      desc: 'Active grievances under action',
    },
    {
      label: t.dashboard.kpis.assignedCases,
      value: stats.assignedCases,
      icon: Users,
      color: 'text-indigo-700 bg-indigo-50',
      link: '/admin/complaints?status=assigned',
      desc: 'Investigating officers dispatched',
    },
    {
      label: t.dashboard.kpis.awaitingAssignment,
      value: stats.awaitingAssignment,
      icon: Inbox,
      color: 'text-amber-700 bg-amber-50',
      link: '/admin/complaints?filter=awaiting',
      desc: 'Pending PA station allocation',
    },
    {
      label: t.dashboard.kpis.dueToday,
      value: stats.dueToday,
      icon: Clock,
      color: 'text-orange-700 bg-orange-50',
      link: '/admin/followups?tab=dueToday',
      desc: 'Follow-up enquiry due today',
    },
    {
      label: t.dashboard.kpis.overdueCases,
      value: stats.overdueCases,
      icon: AlertTriangle,
      color: 'text-rose-700 bg-rose-50',
      link: '/admin/complaints?flag=overdue',
      desc: 'Past statutory follow-up deadline',
      urgent: true,
    },
    {
      label: t.dashboard.kpis.escalatedCases,
      value: stats.escalatedCases,
      icon: Flame,
      color: 'text-red-700 bg-red-100',
      link: '/admin/escalations',
      desc: 'Requiring District Magistrate orders',
      urgent: true,
    },
    {
      label: t.dashboard.kpis.closedCases,
      value: stats.closedCases,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50',
      link: '/admin/complaints?status=closed',
      desc: 'Fully investigated and verified',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t.dashboard.adminGreeting}
        subtitle={t.dashboard.adminSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/reports')}
            >
              Export Report Data
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => navigate('/admin/escalations')}
            >
              Review Escalations ({stats.escalatedCases})
            </Button>
          </div>
        }
      />

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className={`block p-4 rounded-xl border bg-white transition hover:shadow-md hover:border-slate-300 relative group overflow-hidden ${
                kpi.urgent ? 'border-rose-200 shadow-xs' : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                  {kpi.value}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate">{kpi.label}</p>
                <p className="text-[10px] text-slate-400 mt-1 truncate">{kpi.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Section: Inflow Trend & Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>{t.dashboard.charts.complaintTrend}</span>
                </CardTitle>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                  {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTrendTimeframe(period)}
                      className={`px-2.5 py-0.5 rounded capitalize ${
                        trendTimeframe === period ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#FFF',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="registered"
                      name="Registered Grievances"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#F59E0B' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved Cases"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case Status Distribution Donut */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-bold">
                {t.dashboard.charts.statusDistribution}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-600">
                {statusDistribution.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}:</span>
                    <strong className="text-slate-900">{item.value}</strong>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Department Compliance Matrix & Critical Attention Required */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Performance Table */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{t.dashboard.charts.departmentPerformance}</span>
              </CardTitle>
              <Link to="/admin/departments" className="text-xs text-blue-600 hover:underline font-medium">
                View all departments &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5 text-center">Total Cases</th>
                      <th className="p-3.5 text-center">Open</th>
                      <th className="p-3.5 text-center">Resolved</th>
                      <th className="p-3.5 text-center text-rose-600">Overdue</th>
                      <th className="p-3.5 text-right">Compliance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {deptReports.map((dept) => (
                      <tr key={dept.departmentId} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 text-slate-900 font-bold">{dept.departmentName}</td>
                        <td className="p-3.5 text-center font-mono">{dept.totalCases}</td>
                        <td className="p-3.5 text-center font-mono text-blue-700">{dept.openCases}</td>
                        <td className="p-3.5 text-center font-mono text-emerald-700">{dept.closedCases}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                          {dept.overdueCases}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono font-bold">{dept.resolutionPercentage}%</span>
                            <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${dept.resolutionPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attention Required Card */}
        <div className="lg:col-span-4">
          <Card className="border-rose-200 bg-rose-50/10">
            <CardHeader className="bg-rose-50/40 border-b border-rose-100">
              <CardTitle className="text-sm font-bold text-rose-950 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>{t.dashboard.charts.attentionRequired}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-white border border-rose-200 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Case JNS-2026-BLR-0001</span>
                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                    4d Overdue
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-1">Koramangala 80ft Pub Noise Violation</p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Officer: Insp. Ramesh Kumar</span>
                  <Link to="/admin/complaints/JNS-2026-BLR-0001" className="text-blue-600 font-semibold">
                    Inspect &rarr;
                  </Link>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white border border-amber-200 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Case JNS-2026-BLR-0004</span>
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                    No Update 15d
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-1">Malleshwaram Walkway Encroachment</p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Officer: Insp. Manjunath Gowda</span>
                  <Link to="/admin/complaints/JNS-2026-BLR-0004" className="text-blue-600 font-semibold">
                    Inspect &rarr;
                  </Link>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white border border-red-200 shadow-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Case JNS-2026-BLR-0009</span>
                  <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                    Unassigned
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-1">Illegal Tree Felling in Malleshwaram</p>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span>Registered 3 days ago</span>
                  <Link to="/admin/complaints/JNS-2026-BLR-0009" className="text-blue-600 font-semibold">
                    Assign Now &rarr;
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Recent Complaints and Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Grievances */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">
                {t.dashboard.charts.recentComplaints}
              </CardTitle>
              <Link to="/admin/complaints" className="text-xs text-blue-600 hover:underline font-medium">
                View all grievances &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {recentComplaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/admin/complaints/${c.id}`)}
                    className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                          {c.id}
                        </span>
                        <span className="font-bold text-slate-800">{c.citizen.name}</span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-1">{c.details.title}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Officer: {c.assignment?.officerName || 'Awaiting assignment'} &bull; {c.assignment?.stationName}
                      </span>
                    </div>
                    <span className="text-blue-600 font-medium">View &rarr;</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Activity Stream */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{t.dashboard.charts.recentActivity}</span>
              </CardTitle>
              <Link to="/admin/audit-logs" className="text-xs text-blue-600 hover:underline font-medium">
                Audit logs &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 text-xs">
                {recentActivity.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-bold text-slate-800">{log.userName}</span>
                      <span className="font-mono">{log.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-slate-700 font-medium">{log.description}</p>
                    {log.complaintId && (
                      <span className="text-[10px] font-mono text-amber-700 font-bold mt-1 block">
                        Case: {log.complaintId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
