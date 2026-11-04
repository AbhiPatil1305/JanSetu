import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { Bell, CheckCheck, Clock, Flame, Shield, CheckCircle2 } from 'lucide-react';

export const OfficerNotificationsPage: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ASSIGNMENT':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'REMINDER':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'OVERDUE':
        return <Clock className="w-5 h-5 text-rose-600" />;
      case 'RESOLUTION':
        return <CheckCircle2 className="w-5 h-5 text-teal-600" />;
      case 'ESCALATION':
        return <Flame className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Officer Notification Centre"
        subtitle="Official notices, case assignments, PA reminders, and resolution reviews."
        breadcrumbs={[{ label: 'Officer Portal' }, { label: 'Notifications' }]}
        actions={
          notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={() => markAllAsRead()}
            >
              Mark All as Read
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <EmptyState
              title="No Notifications"
              description="Your officer inbox is currently up to date."
            />
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) navigate(notif.link);
                  }}
                  className={`p-4 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3.5 ${
                    !notif.isRead ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-slate-200 flex-shrink-0 shadow-2xs">
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-sm leading-snug">
                        {notif.title}
                      </p>
                      <span className="text-[11px] font-mono text-slate-400">{notif.timestamp}</span>
                    </div>

                    <p className="text-slate-600 mt-1 leading-relaxed">{notif.message}</p>

                    {notif.complaintId && (
                      <span className="inline-block mt-2 font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                        Case: {notif.complaintId}
                      </span>
                    )}
                  </div>

                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
