import React, { useState, useEffect } from 'react';
import { reportsService, DashboardStats, DepartmentReportItem, OfficerReportItem } from '../../services/api/reports.service';
import { departmentsService } from '../../services/api/departments.service';
import { Department, PoliceStation } from '../../types/department';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  Building2,
  Users,
  Shield,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { showToast } = useNotifications();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deptReports, setDeptReports] = useState<DepartmentReportItem[]>([]);
  const [officerReports, setOfficerReports] = useState<OfficerReportItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);

  // Filter states
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [dateRange, setDateRange] = useState('30days');
  const [activeReportTab, setActiveReportTab] = useState<'departments' | 'officers' | 'summary'>('departments');

  // PDF Preview modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true);
      try {
        const [dashStats, depts, offs, deptList, stnList] = await Promise.all([
          reportsService.getDashboardStats(),
          reportsService.getDepartmentReports(),
          reportsService.getOfficerReports(),
          departmentsService.getDepartments(),
          departmentsService.getStations(),
        ]);
        setStats(dashStats);
        setDeptReports(depts);
        setOfficerReports(offs);
        setDepartments(deptList);
        setStations(stnList);
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, []);

  // Filtered reports
  const filteredDeptReports = deptReports.filter((d) => (!selectedDept ? true : d.departmentId === selectedDept));
  const filteredOfficerReports = officerReports.filter((o) => {
    if (selectedStation) {
      return o.stationName.includes(stations.find((s) => s.id === selectedStation)?.name || '');
    }
    return true;
  });

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeReportTab === 'departments') {
      headers = ['Department Name', 'Total Complaints', 'Open', 'Closed', 'Overdue', 'Resolution %'];
      rows = filteredDeptReports.map((d) => [
        `"${d.departmentName}"`,
        d.totalCases.toString(),
        d.openCases.toString(),
        d.closedCases.toString(),
        d.overdueCases.toString(),
        `${d.resolutionPercentage}%`,
      ]);
    } else {
      headers = ['Officer Name', 'Station', 'Assigned Cases', 'Active', 'Resolved', 'Overdue', 'Compliance Rate'];
      rows = filteredOfficerReports.map((o) => [
        `"${o.officerName}"`,
        `"${o.stationName}"`,
        o.totalAssigned.toString(),
        o.activeCases.toString(),
        o.resolvedCases.toString(),
        o.overdueCases.toString(),
        `${o.complianceRate}%`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JanSetu_${activeReportTab}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Report Export Complete', `Generated CSV for ${activeReportTab}.`, 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="District Grievance Reports & Performance Analytics"
        subtitle="Departmental compliance rates, police station statistics, and officer disposal audits."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reports & Analytics' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setIsPdfModalOpen(true)}
            >
              Generate Official PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Filter Parameters:</span>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days (Current Month)</option>
            <option value="90days">Last Quarter</option>
            <option value="year">Current Fiscal Year 2026</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Police Stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Summary KPI Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <Card className="p-4 bg-white">
            <span className="text-slate-400 block font-semibold">Total Complaints Audited</span>
            <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
              {stats.totalComplaints}
            </span>
          </Card>
          <Card className="p-4 bg-white">
            <span className="text-slate-400 block font-semibold">Resolved & Verified Cases</span>
            <span className="text-2xl font-extrabold text-emerald-700 font-mono mt-1 block">
              {stats.closedCases}
            </span>
          </Card>
          <Card className="p-4 bg-white">
            <span className="text-slate-400 block font-semibold">Overall Disposal Rate</span>
            <span className="text-2xl font-extrabold text-blue-700 font-mono mt-1 block">
              {Math.round((stats.closedCases / Math.max(1, stats.totalComplaints)) * 100)}%
            </span>
          </Card>
          <Card className="p-4 bg-white">
            <span className="text-slate-400 block font-semibold">Average Resolution Time</span>
            <span className="text-2xl font-extrabold text-amber-600 font-mono mt-1 block">
              5.8 Days
            </span>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4 pb-px text-xs sm:text-sm font-semibold">
          {[
            { id: 'departments', label: 'Departmental Compliance Matrix' },
            { id: 'officers', label: 'Investigating Officer Performance' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveReportTab(t.id as any)}
              className={`py-3 px-3 border-b-2 whitespace-nowrap transition ${
                activeReportTab === t.id
                  ? 'border-amber-500 text-slate-900 bg-amber-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: Departmental Report */}
      {activeReportTab === 'departments' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-5">Department</th>
                    <th className="p-3.5 text-center">Total Inflow</th>
                    <th className="p-3.5 text-center">Active Enquiries</th>
                    <th className="p-3.5 text-center">Closed Cases</th>
                    <th className="p-3.5 text-center text-rose-600">Overdue Follow-ups</th>
                    <th className="p-3.5 text-center">Avg Resolution Time</th>
                    <th className="p-3.5 text-right pr-5">Disposal Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDeptReports.map((dept) => (
                    <tr key={dept.departmentId} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-5 text-slate-900 font-bold">{dept.departmentName}</td>
                      <td className="p-3.5 text-center font-mono">{dept.totalCases}</td>
                      <td className="p-3.5 text-center font-mono text-blue-700">{dept.openCases}</td>
                      <td className="p-3.5 text-center font-mono text-emerald-700">{dept.closedCases}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                        {dept.overdueCases}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-600">
                        {dept.averageResolutionDays} days
                      </td>
                      <td className="p-3.5 pr-5 text-right font-mono font-bold">
                        <span className="text-emerald-700">{dept.resolutionPercentage}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: Officer Report */}
      {activeReportTab === 'officers' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-5">Officer Name</th>
                    <th className="p-3.5">Police Station</th>
                    <th className="p-3.5 text-center">Total Assigned</th>
                    <th className="p-3.5 text-center">Active Cases</th>
                    <th className="p-3.5 text-center">Resolved</th>
                    <th className="p-3.5 text-center text-rose-600">Overdue Follow-ups</th>
                    <th className="p-3.5 text-right pr-5">Compliance Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOfficerReports.map((off) => (
                    <tr key={off.officerId} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-5 text-slate-900 font-bold">{off.officerName}</td>
                      <td className="p-3.5 text-slate-600">{off.stationName}</td>
                      <td className="p-3.5 text-center font-mono">{off.totalAssigned}</td>
                      <td className="p-3.5 text-center font-mono text-blue-700">{off.activeCases}</td>
                      <td className="p-3.5 text-center font-mono text-emerald-700">{off.resolvedCases}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                        {off.overdueCases}
                      </td>
                      <td className="p-3.5 pr-5 text-right font-mono font-bold">
                        <span
                          className={
                            off.complianceRate >= 80
                              ? 'text-emerald-700'
                              : off.complianceRate >= 50
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }
                        >
                          {off.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Official PDF Preview Modal (Demonstration) */}
      <Modal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Official Government Audit Report (Demonstration Preview)"
        description="Standard District Grievance Compliance Dossier — Form K-12"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs font-serif leading-relaxed">
          <div className="p-6 bg-slate-50 border border-slate-300 rounded-xl space-y-4 text-slate-900 shadow-inner">
            <div className="text-center pb-3 border-b border-slate-300">
              <h2 className="font-bold text-sm uppercase tracking-wider">
                GOVERNMENT OF KARNATAKA &bull; DEPUTY COMMISSIONER'S OFFICE
              </h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                DISTRICT GRIEVANCE REDRESSAL MONITORING CELL &bull; BENGALURU URBAN
              </p>
              <p className="text-[11px] font-bold text-amber-800 mt-1">
                COMPLIANCE & DISPOSAL REPORT — FISCAL PERIOD {new Date().getFullYear()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <strong>Generated On:</strong> {new Date().toLocaleString()}
              </div>
              <div className="text-right">
                <strong>Reporting Officer:</strong> Dr. Rajendra Prasad, IAS
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">1. Executive Summary</h4>
              <p className="text-[11px] text-slate-700">
                During the audited monitoring cycle, 30 public grievance petitions were received and assigned. 22 complaints pertain to the Home & Police Department pilot division. Overall disposal rate stands at 78.4% with an average follow-up turnaround of 5.8 days.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">2. Critical Directives</h4>
              <p className="text-[11px] text-slate-700">
                Four cases in Koramangala and Malleshwaram police stations were issued formal escalation notices due to overdue site inspections. Station House Officers have been ordered to complete proceedings within 48 hours.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
              <span>JanSetu Electronic Seal &bull; Digitally Verified</span>
              <div className="text-right">
                <span className="block font-bold text-slate-900">District Magistrate / Deputy Commissioner</span>
                <span>Bengaluru Urban District</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsPdfModalOpen(false)}>
              Close Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                window.print();
                setIsPdfModalOpen(false);
              }}
            >
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
