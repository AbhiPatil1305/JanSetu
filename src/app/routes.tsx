import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthContext';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';

// Auth Pages
import { LoginPage } from '../features/auth/LoginPage';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage';

// Shared Components
import { CaseDetailsView } from '../components/complaints/CaseDetailsView';
import { ComplaintsListPage } from '../features/complaints/ComplaintsListPage';

// DC Main Admin Pages
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { DepartmentsPage } from '../features/admin/DepartmentsPage';
import { PoliceStationsPage } from '../features/admin/PoliceStationsPage';
import { OfficersPage } from '../features/admin/OfficersPage';
import { FollowupsMonitoringPage } from '../features/followups/FollowupsMonitoringPage';
import { EscalationsPage } from '../features/escalations/EscalationsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { UsersManagementPage } from '../features/admin/UsersManagementPage';
import { ReminderSettingsPage } from '../features/admin/ReminderSettingsPage';
import { AuditLogsPage } from '../features/admin/AuditLogsPage';
import { AdminSettingsPage } from '../features/admin/AdminSettingsPage';

// DC PA Pages
import { PaDashboard } from '../features/pa/PaDashboard';
import { RegisterComplaintPage } from '../features/pa/RegisterComplaintPage';
import { CommunicationsPage } from '../features/communications/CommunicationsPage';

// Police Officer Pages
import { OfficerDashboard } from '../features/officer/OfficerDashboard';
import { OfficerCasesPage } from '../features/officer/OfficerCasesPage';
import { SubmitProgressPage } from '../features/officer/SubmitProgressPage';
import { SubmitResolutionPage } from '../features/officer/SubmitResolutionPage';
import { OfficerNotificationsPage } from '../features/officer/OfficerNotificationsPage';
import { OfficerProfilePage } from '../features/officer/OfficerProfilePage';

// Root Redirection Component
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (user.role === 'DC_MAIN_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'DC_PA') return <Navigate to="/pa/dashboard" replace />;
  if (user.role === 'POLICE_OFFICER') return <Navigate to="/officer/dashboard" replace />;

  return <Navigate to="/unauthorized" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* DC MAIN ADMIN MODULE */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['DC_MAIN_ADMIN']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="complaints" element={<ComplaintsListPage />} />
        <Route path="complaints/:id" element={<CaseDetailsView />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="stations" element={<PoliceStationsPage />} />
        <Route path="officers" element={<OfficersPage />} />
        <Route path="followups" element={<FollowupsMonitoringPage />} />
        <Route path="escalations" element={<EscalationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersManagementPage />} />
        <Route path="reminder-settings" element={<ReminderSettingsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* DC PA MODULE */}
      <Route
        path="/pa"
        element={
          <ProtectedRoute allowedRoles={['DC_PA']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pa/dashboard" replace />} />
        <Route path="dashboard" element={<PaDashboard />} />
        <Route path="register-complaint" element={<RegisterComplaintPage />} />
        <Route path="complaints" element={<ComplaintsListPage />} />
        <Route path="complaints/:id" element={<CaseDetailsView />} />
        <Route path="followups" element={<FollowupsMonitoringPage />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="escalations" element={<EscalationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* POLICE OFFICER MODULE */}
      <Route
        path="/officer"
        element={
          <ProtectedRoute allowedRoles={['POLICE_OFFICER']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/officer/dashboard" replace />} />
        <Route path="dashboard" element={<OfficerDashboard />} />
        <Route path="cases" element={<OfficerCasesPage />} />
        <Route path="cases/:id" element={<CaseDetailsView />} />
        <Route path="cases/:id/update" element={<SubmitProgressPage />} />
        <Route path="cases/:id/resolution" element={<SubmitResolutionPage />} />
        <Route path="notifications" element={<OfficerNotificationsPage />} />
        <Route path="profile" element={<OfficerProfilePage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
