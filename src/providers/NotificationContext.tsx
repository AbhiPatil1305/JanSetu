import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification } from '../types/notification';
import { notificationsService } from '../services/api/notifications.service';
import { mockStorage } from '../services/mock/mockStorage';
import { useAuth } from './AuthContext';
import { getCurrentBackendRole } from '../services/api/client';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  showToast: (title: string, message?: string, type?: Toast['type']) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const backendRole = getCurrentBackendRole(user);
    if (backendRole === 'DATA_ENTRY_OPERATOR') {
      setNotifications([]);
      return;
    }
    const data = await notificationsService.getNotifications(user);
    setNotifications(data);
  }, [user]);

  useEffect(() => {
    refreshNotifications();

    const interval = setInterval(() => {
      refreshNotifications();
    }, 20000);

    const unsubscribe = mockStorage.subscribe(() => {
      refreshNotifications();
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refreshNotifications]);

  const markAsRead = async (id: string) => {
    await notificationsService.markAsRead(id);
    await refreshNotifications();
  };

  const markAllAsRead = async () => {
    await notificationsService.markAllAsRead(user || undefined);
    await refreshNotifications();
  };

  const showToast = (title: string, message?: string, type: Toast['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        showToast,
        refreshNotifications,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          const bgColors = {
            success: 'bg-white border-green-500/30 text-slate-900 shadow-lg shadow-green-950/5',
            error: 'bg-white border-red-500/30 text-slate-900 shadow-lg shadow-red-950/5',
            warning: 'bg-white border-amber-500/30 text-slate-900 shadow-lg shadow-amber-950/5',
            info: 'bg-white border-blue-500/30 text-slate-900 shadow-lg shadow-blue-950/5',
          }[toast.type];

          const Icon = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
            info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border transition-all transform duration-200 animate-in slide-in-from-bottom-2 ${bgColors}`}
            >
              {Icon}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{toast.title}</p>
                {toast.message && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
