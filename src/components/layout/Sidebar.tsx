import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  Building2,
  Shield,
  Users,
  Clock,
  Flame,
  MessageSquare,
  BarChart3,
  UserCog,
  BellRing,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { user, role, logout } = useAuth();
  const { t } = useLanguage();

  if (!user || !role) return null;

  // Role-specific navigation items
  const navItems = (() => {
    switch (role) {
      case 'DC_MAIN_ADMIN':
        return [
          { label: t.navigation.dashboard, path: '/admin/dashboard', icon: LayoutDashboard },
          { label: t.navigation.complaints, path: '/admin/complaints', icon: FileText },
          { label: t.navigation.departments, path: '/admin/departments', icon: Building2 },
          { label: t.navigation.policeStations, path: '/admin/stations', icon: Shield },
          { label: t.navigation.officers, path: '/admin/officers', icon: Users },
          { label: t.navigation.followups, path: '/admin/followups', icon: Clock },
          { label: t.navigation.escalations, path: '/admin/escalations', icon: Flame },
          { label: t.navigation.reports, path: '/admin/reports', icon: BarChart3 },
          { label: t.navigation.userManagement, path: '/admin/users', icon: UserCog },
          { label: t.navigation.reminderSettings, path: '/admin/reminder-settings', icon: BellRing },
          { label: t.navigation.auditLogs, path: '/admin/audit-logs', icon: History },
          { label: t.navigation.settings, path: '/admin/settings', icon: Settings },
        ];
      case 'DC_PA':
        return [
          { label: t.navigation.dashboard, path: '/pa/dashboard', icon: LayoutDashboard },
          { label: t.navigation.registerComplaint, path: '/pa/register-complaint', icon: FilePlus2, highlight: true },
          { label: t.navigation.complaints, path: '/pa/complaints', icon: FileText },
          { label: t.navigation.followups, path: '/pa/followups', icon: Clock },
          { label: t.navigation.communications, path: '/pa/communications', icon: MessageSquare },
          { label: t.navigation.escalations, path: '/pa/escalations', icon: Flame },
          { label: t.navigation.reports, path: '/pa/reports', icon: BarChart3 },
        ];
      case 'POLICE_OFFICER':
        return [
          { label: t.navigation.dashboard, path: '/officer/dashboard', icon: LayoutDashboard },
          { label: t.navigation.myCases, path: '/officer/cases', icon: Briefcase },
          { label: t.navigation.notifications, path: '/officer/notifications', icon: BellRing },
          { label: t.navigation.profile, path: '/officer/profile', icon: ShieldCheck },
        ];
      default:
        return [];
    }
  })();

  const roleLabels = {
    DC_MAIN_ADMIN: 'DC Main Admin',
    DC_PA: 'DC Personal Assistant',
    POLICE_OFFICER: 'Police Officer',
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 select-none shadow-xl',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            {/* Government Emblem / Scale icon */}
            <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L20 7V13C20 18 12 22 12 22C12 22 4 18 4 13V7L12 2Z" fill="currentColor" fillOpacity="0.15" />
              <path d="M12 7V17M8 12H16" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg text-white tracking-wide leading-none font-sans">
                {t.appName}
              </span>
              <span className="text-[10px] text-amber-400 font-medium tracking-tight mt-1 truncate">
                Govt of Karnataka
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden lg:flex items-center justify-center"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Role Pill Banner */}
      {!collapsed && (
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Access Scope</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {roleLabels[role]}
            </span>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                  item.highlight && !collapsed && 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
                  collapsed && 'justify-center px-0'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {item.highlight && !collapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <button
          onClick={() => logout()}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-rose-950/30 hover:text-rose-300 hover:border-rose-900/50 border border-transparent transition-all',
            collapsed && 'justify-center px-0'
          )}
          title={collapsed ? t.navigation.logout : undefined}
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-300" />
          {!collapsed && <span>{t.navigation.logout}</span>}
        </button>
      </div>
    </aside>
  );
};
