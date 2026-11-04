import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { reportsService, DashboardStats } from '../../services/api/reports.service';
import { complaintsService } from '../../services/api/complaints.service';
import { Complaint } from '../../types/complaint';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  FileCheck2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assignedCases, setAssignedCases] = useState<Complaint[]>([]);
  const [dueTodayCases, setDueTodayCases] = useState<Complaint[]>([]);
  const [overdueCases, setOverdueCases] = useState<Complaint[]>([]);
  const [newAssignments, setNewAssignments] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOfficerData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const [dashStats, allComps] = await Promise.all([
          reportsService.getDashboardStats(user.id),
          complaintsService.getComplaints({ officerId: user.id }),
        ]);

        const today = new Date().toISOString().split('T')[0];

        setStats(dashStats);
        setAssignedCases(allComps);
        setDueTodayCases(
          allComps.filter((c) => c.assignment?.nextFollowupDate === today && c.status !== 'CLOSED')
        );
        setOverdueCases(
          allComps.filter(
            (c) =>
              c.status !== 'CLOSED' &&
              (c.operationalFlags.includes('OVERDUE') ||
                (c.assignment && c.assignment.nextFollowupDate < today))
          )
        );
        setNewAssignments(allComps.filter((c) => c.status === 'ASSIGNED'));
      } finally {
        setIsLoading(false);
      }
    };

    loadOfficerData();
  }, [user]);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Assigned Cases', value: stats.totalComplaints, icon: Briefcase, color: 'text-slate-800 bg-slate-100', link: '/officer/cases' },
    { label: 'New Assignments', value: stats.newAssignments, icon: Sparkles, color: 'text-blue-700 bg-blue-50', link: '/officer/cases?status=ASSIGNED', urgent: true },
    { label: 'In Progress / Enquiries', value: stats.inProgress, icon: Shield, color: 'text-indigo-700 bg-indigo-50', link: '/officer/cases?status=UNDER_INVESTIGATION' },
    { label: 'Follow-ups Due Today', value: stats.dueToday, icon: Clock, color: 'text-orange-700 bg-orange-50', link: '/officer/cases?filter=dueToday', urgent: true },
    { label: 'Overdue Cases', value: stats.overdueCases, icon: AlertTriangle, color: 'text-rose-700 bg-rose-50', link: '/officer/cases?flag=overdue', urgent: true },
    { label: 'Resolutions Submitted', value: stats.resolutionSubmitted, icon: CheckCircle2, color: 'text-teal-700 bg-teal-50', link: '/officer/cases?status=RESOLUTION_SUBMITTED' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.dashboard.officerGreeting}
        subtitle={t.dashboard.officerSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => navigate('/officer/cases')}>
              View My Case Roster
            </Button>
          </div>
        }
      />

      {/* Station Information Strip */}
      <Card className="bg-slate-900 text-white border-none shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">{user?.name}</span>
              <span className="text-slate-400">
                {user?.designation} &bull; {user?.stationName || 'Koramangala Police Station'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            <span>Badge: {user?.badgeNumber || 'PI-4029'}</span>
            <span>KGID: {user?.employeeId}</span>
          </div>
        </CardContent>
      </Card>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              to={kpi.link}
              className={`block p-4 rounded-xl border bg-white transition hover:shadow-md hover:border-slate-300 relative overflow-hidden ${
                kpi.urgent ? 'border-amber-300 shadow-xs' : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                  {kpi.value}
                </span>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-tight">{kpi.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Row 2: New Assignments Requiring Acknowledgement & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* New Assignments */}
        <div className="lg:col-span-6">
          <Card className="h-full border-blue-200 bg-blue-50/10">
            <CardHeader className="bg-blue-50/40 border-b border-blue-100">
              <CardTitle className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>New Grievance Assignments ({newAssignments.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-blue-100 text-xs">
                {newAssignments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No new pending assignments. All assigned cases acknowledged.
                  </div>
                ) : (
                  newAssignments.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/officer/cases/${c.id}`)}
                      className="p-3.5 hover:bg-blue-50/30 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-900 bg-blue-100 px-1.5 py-0.2 rounded font-bold">
                            {c.id}
                          </span>
                          <span className="font-bold text-slate-900">{c.citizen.name}</span>
                          {c.assignment && <PriorityBadge priority={c.assignment.priority} size="sm" />}
                        </div>
                        <p className="text-slate-700 mt-1 line-clamp-1">{c.details.title}</p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Follow-up due: {c.assignment?.nextFollowupDate}
                        </span>
                      </div>
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/officer/cases/${c.id}`);
                        }}
                      >
                        Acknowledge
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Due Today Follow-ups */}
        <div className="lg:col-span-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Today's Follow-up Actions ({dueTodayCases.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {dueTodayCases.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No investigation reports scheduled for today.
                  </div>
                ) : (
                  dueTodayCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/officer/cases/${c.id}`)}
                      className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                            {c.id}
                          </span>
                          <span className="font-bold text-slate-900">{c.citizen.name}</span>
                        </div>
                        <p className="text-slate-700 mt-1 line-clamp-1">{c.details.title}</p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/officer/cases/${c.id}/update`);
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Overdue Cases requiring immediate explanation */}
      {overdueCases.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/20">
          <CardHeader className="bg-rose-50/50 border-b border-rose-200">
            <CardTitle className="text-sm font-bold text-rose-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Overdue Inquiries Requiring Delay Explanation & Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-rose-100 text-xs">
              {overdueCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/officer/cases/${c.id}`)}
                  className="p-4 hover:bg-rose-50/40 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-rose-900 bg-rose-100 px-2 py-0.5 rounded font-bold">
                        {c.id}
                      </span>
                      <span className="font-bold text-slate-900">{c.details.title}</span>
                    </div>
                    <p className="text-slate-600 line-clamp-1">{c.details.description}</p>
                    <span className="text-[11px] text-rose-800 font-bold block">
                      Target deadline was: {c.assignment?.nextFollowupDate} &bull; Please log action taken immediately.
                    </span>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/officer/cases/${c.id}/update`);
                    }}
                  >
                    Submit Delay Report
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
