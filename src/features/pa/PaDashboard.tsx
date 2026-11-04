import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { reportsService, DashboardStats } from '../../services/api/reports.service';
import { complaintsService } from '../../services/api/complaints.service';
import { followupsService } from '../../services/api/followups.service';
import { Complaint } from '../../types/complaint';
import { FollowupRecord } from '../../types/followup';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  FilePlus2,
  FileText,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Calendar,
  Sparkles,
  Phone,
  ChevronRight,
  Shield,
} from 'lucide-react';

export const PaDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [overdueCases, setOverdueCases] = useState<Complaint[]>([]);
  const [dueTodayFollowups, setDueTodayFollowups] = useState<FollowupRecord[]>([]);
  const [resolutionCases, setResolutionCases] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [dashStats, allComps, fols] = await Promise.all([
          reportsService.getDashboardStats(),
          complaintsService.getComplaints(),
          followupsService.getFollowups(),
        ]);
        setStats(dashStats);
        setRecentComplaints(allComps.slice(0, 5));
        setOverdueCases(allComps.filter((c) => c.operationalFlags.includes('OVERDUE')).slice(0, 4));
        setResolutionCases(allComps.filter((c) => c.status === 'RESOLUTION_SUBMITTED'));

        const today = new Date().toISOString().split('T')[0];
        setDueTodayFollowups(fols.filter((f) => f.nextFollowupDate === today).slice(0, 4));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: t.dashboard.kpis.totalComplaints, value: stats.totalComplaints, icon: FileText, color: 'text-slate-800 bg-slate-100', link: '/pa/complaints' },
    { label: t.dashboard.kpis.newAssignments, value: stats.newAssignments, icon: Sparkles, color: 'text-blue-700 bg-blue-50', link: '/pa/complaints?status=ASSIGNED' },
    { label: t.dashboard.kpis.awaitingAssignment, value: stats.awaitingAssignment, icon: AlertTriangle, color: 'text-amber-800 bg-amber-100', link: '/pa/complaints?filter=awaiting', urgent: true },
    { label: t.dashboard.kpis.assignedCases, value: stats.assignedCases, icon: Shield, color: 'text-indigo-700 bg-indigo-50', link: '/pa/complaints' },
    { label: t.dashboard.kpis.dueToday, value: stats.dueToday, icon: Clock, color: 'text-orange-700 bg-orange-50', link: '/pa/followups?tab=dueToday' },
    { label: t.dashboard.kpis.overdueCases, value: stats.overdueCases, icon: AlertTriangle, color: 'text-rose-700 bg-rose-50', link: '/pa/followups?tab=overdue', urgent: true },
    { label: t.dashboard.kpis.awaitingOfficerResponse, value: stats.awaitingOfficerResponse, icon: Clock, color: 'text-purple-700 bg-purple-50', link: '/pa/followups?tab=awaitingResponse' },
    { label: t.dashboard.kpis.escalatedCases, value: stats.escalatedCases, icon: Flame, color: 'text-red-700 bg-red-100', link: '/pa/escalations' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.dashboard.paGreeting}
        subtitle={t.dashboard.paSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="gold"
              size="sm"
              leftIcon={<FilePlus2 className="w-4 h-4" />}
              onClick={() => navigate('/pa/register-complaint')}
            >
              Register New Complaint
            </Button>
          </div>
        }
      />

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                  {kpi.value}
                </span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate">{kpi.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Action Hero Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-none shadow-md">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Priority Operational Gateway</span>
            </div>
            <h3 className="text-xl font-bold font-sans">
              Single-Workflow Grievance Registration & Officer Dispatch
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload scanned Kannada or English petitions, inspect AI OCR extraction and bilingual summaries, verify citizen jurisdiction, and dispatch directly to the responsible police officer in one guided flow.
            </p>
          </div>

          <Button
            variant="gold"
            size="lg"
            leftIcon={<FilePlus2 className="w-5 h-5" />}
            onClick={() => navigate('/pa/register-complaint')}
          >
            Launch Guided Registration
          </Button>
        </CardContent>
      </Card>

      {/* Row 2: Today's Tasks & Overdue Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Follow-up Tasks */}
        <div className="lg:col-span-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>Today's Follow-ups ({dueTodayFollowups.length})</span>
              </CardTitle>
              <Link to="/pa/followups?tab=dueToday" className="text-xs text-blue-600 font-medium hover:underline">
                View all &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {dueTodayFollowups.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No follow-ups due today. All active cases are scheduled for future dates.
                  </div>
                ) : (
                  dueTodayFollowups.map((fol) => (
                    <div
                      key={fol.id}
                      onClick={() => navigate(`/pa/complaints/${fol.complaintId}`)}
                      className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                            {fol.complaintId}
                          </span>
                          <span className="font-bold text-slate-900">{fol.officerName}</span>
                          <span className="text-slate-400">({fol.stationName})</span>
                        </div>
                        <p className="text-slate-700 mt-1 line-clamp-1">{fol.complaintTitle}</p>
                      </div>
                      <span className="text-blue-600 font-semibold">View &rarr;</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Follow-ups */}
        <div className="lg:col-span-6">
          <Card className="h-full border-rose-200 bg-rose-50/10">
            <CardHeader className="bg-rose-50/40 border-b border-rose-100">
              <CardTitle className="text-sm font-bold text-rose-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Overdue Follow-ups Requiring PA Action</span>
              </CardTitle>
              <Link to="/pa/followups?tab=overdue" className="text-xs text-rose-700 font-bold hover:underline">
                View overdue ({stats.overdueCases}) &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {overdueCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/pa/complaints/${c.id}`)}
                    className="p-3.5 hover:bg-rose-50/30 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded font-bold border border-rose-200">
                          {c.id}
                        </span>
                        <span className="font-bold text-slate-900">{c.assignment?.officerName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Overdue
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1 line-clamp-1">{c.details.title}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pa/complaints/${c.id}`);
                    }}>
                      Action
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Awaiting Resolution Review & Recent Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Awaiting Resolution Review */}
        <div className="lg:col-span-5">
          <Card className="border-teal-200 bg-teal-50/10">
            <CardHeader className="bg-teal-50/40 border-b border-teal-100">
              <CardTitle className="text-sm font-bold text-teal-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Awaiting Resolution Verification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-teal-100 text-xs">
                {resolutionCases.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No resolution submissions currently pending review.
                  </div>
                ) : (
                  resolutionCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/pa/complaints/${c.id}`)}
                      className="p-3.5 hover:bg-teal-50/30 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-teal-900">{c.id}</span>
                        <p className="font-semibold text-slate-900 mt-0.5 line-clamp-1">{c.details.title}</p>
                        <span className="text-[10px] text-teal-700 block">
                          Officer: {c.resolution?.officerName}
                        </span>
                      </div>
                      <span className="text-teal-800 font-bold text-xs bg-teal-100 px-2 py-0.5 rounded">
                        Review &rarr;
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Case Registrations */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Recent Registrations</CardTitle>
              <Link to="/pa/complaints" className="text-xs text-blue-600 font-medium hover:underline">
                View all &rarr;
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {recentComplaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/pa/complaints/${c.id}`)}
                    className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                          {c.id}
                        </span>
                        <span className="font-bold text-slate-900">{c.citizen.name}</span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-1">{c.details.title}</p>
                    </div>
                    <span className="text-blue-600 font-medium">Inspect &rarr;</span>
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
