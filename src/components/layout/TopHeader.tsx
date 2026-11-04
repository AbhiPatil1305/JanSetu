import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import {
  Bell,
  Search,
  Globe,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { complaintsService } from '../../services/api/complaints.service';
import { Complaint } from '../../types/complaint';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, role, logout, switchRoleDemo, resetDemoData } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead, showToast } = useNotifications();
  const navigate = useNavigate();

  // Dropdown states
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Complaint[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await complaintsService.getComplaints({ search: searchQuery });
        setSearchResults(results.slice(0, 6));
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCaseSelect = (caseId: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (role === 'DC_MAIN_ADMIN') navigate(`/admin/complaints/${caseId}`);
    else if (role === 'DC_PA') navigate(`/pa/complaints/${caseId}`);
    else navigate(`/officer/cases/${caseId}`);
  };

  const handleResetData = () => {
    resetDemoData();
    showToast('Demo Data Reset', 'All grievance records have been reset to factory demo state.', 'info');
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        {/* Left: Mobile hamburger & Global Search button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600 text-xs transition w-44 sm:w-64"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{t.common.search}</span>
            <kbd className="hidden sm:inline-block ml-auto px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded font-mono text-slate-400">
              /
            </kbd>
          </button>
        </div>

        {/* Right: Language, Notifications, User profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md transition ${
                language === 'en'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('kn')}
              className={`px-2.5 py-1 rounded-md transition font-kannada ${
                language === 'kn'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ಕನ್ನಡ
            </button>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-rose-600 rounded-full px-1 border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{t.navigation.notifications}</h4>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.link) {
                            navigate(notif.link);
                            setIsNotifOpen(false);
                          }
                        }}
                        className={`p-3.5 hover:bg-slate-50 transition cursor-pointer text-left flex items-start gap-3 ${
                          !notif.isRead ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            !notif.isRead ? 'bg-amber-500' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-snug">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{notif.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-slate-100 text-center bg-slate-50/50">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      if (role === 'POLICE_OFFICER') navigate('/officer/notifications');
                      else navigate(role === 'DC_MAIN_ADMIN' ? '/admin/audit-logs' : '/pa/communications');
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1"
                  >
                    <span>View all events</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                  {user?.name}
                </span>
                <span className="text-[10px] text-slate-500 leading-none truncate max-w-[140px]">
                  {user?.designation}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400 font-mono">{user?.employeeId}</p>
                  <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {user?.designation}
                  </span>
                </div>

                {/* Role Switcher Demo section for rapid testing */}
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/70">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Demo Switch Role:
                  </span>
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    <button
                      onClick={() => {
                        switchRoleDemo('DC_MAIN_ADMIN');
                        setIsUserMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded text-center font-medium border ${
                        role === 'DC_MAIN_ADMIN'
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => {
                        switchRoleDemo('DC_PA');
                        setIsUserMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded text-center font-medium border ${
                        role === 'DC_PA'
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      DC PA
                    </button>
                    <button
                      onClick={() => {
                        switchRoleDemo('POLICE_OFFICER');
                        setIsUserMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded text-center font-medium border ${
                        role === 'POLICE_OFFICER'
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Officer
                    </button>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleResetData}
                    className="w-full px-4 py-2 text-left text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.common.resetDemoData}</span>
                  </button>

                  <button
                    onClick={() => logout()}
                    className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.navigation.logout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-1" />
              <input
                type="text"
                autoFocus
                placeholder="Search by Case ID (e.g. JNS-2026-BLR-0001), Citizen Name, Mobile, Title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none text-slate-900 placeholder:text-slate-400"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200 font-mono"
              >
                ESC
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {isSearching ? (
                <div className="p-6 text-center text-xs text-slate-400">Searching records...</div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleCaseSelect(c.id)}
                      className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {c.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{c.citizen.name}</span>
                          <span className="text-[11px] text-slate-400">({c.citizen.phone})</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">{c.details.title}</p>
                      </div>
                      <span className="text-[11px] text-blue-600 font-medium">View &rarr;</span>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="p-6 text-center text-xs text-slate-400">No cases matched "{searchQuery}"</div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Type at least 2 characters to search across 30+ district grievances.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
