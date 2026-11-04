import React from 'react';
import { ComplaintStatus, ComplaintPriority, OperationalFlag } from '../../types/complaint';
import { useLanguage } from '../../providers/LanguageContext';
import { AlertTriangle, Clock, Flame, CheckCircle, ShieldAlert } from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { t } = useLanguage();

  const config: Record<
    ComplaintStatus,
    { bg: string; text: string; border: string; label: string; dot: string }
  > = {
    REGISTERED: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-500',
      label: t.statuses.REGISTERED,
    },
    AWAITING_ASSIGNMENT: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      dot: 'bg-amber-500',
      label: t.statuses.AWAITING_ASSIGNMENT,
    },
    ASSIGNED: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-600',
      label: t.statuses.ASSIGNED,
    },
    UNDER_INVESTIGATION: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
      dot: 'bg-indigo-600',
      label: t.statuses.UNDER_INVESTIGATION,
    },
    AWAITING_INFORMATION: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
      dot: 'bg-purple-600',
      label: t.statuses.AWAITING_INFORMATION,
    },
    RESOLUTION_SUBMITTED: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
      dot: 'bg-teal-600',
      label: t.statuses.RESOLUTION_SUBMITTED,
    },
    CLOSED: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-600',
      label: t.statuses.CLOSED,
    },
  };

  const item = config[status] || config.REGISTERED;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${item.bg} ${item.text} ${item.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
};

interface FlagBadgeProps {
  flag: OperationalFlag;
  size?: 'sm' | 'md';
}

export const FlagBadge: React.FC<FlagBadgeProps> = ({ flag, size = 'md' }) => {
  const { t } = useLanguage();

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2 py-1 text-xs font-semibold';

  if (flag === 'OVERDUE') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border bg-rose-50 text-rose-700 border-rose-300 ${sizeClasses}`}
      >
        <Clock className="w-3.5 h-3.5 text-rose-600" />
        <span>{t.flags.OVERDUE}</span>
      </span>
    );
  }

  if (flag === 'ESCALATED') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border bg-red-600 text-white border-red-700 shadow-sm ${sizeClasses}`}
      >
        <Flame className="w-3.5 h-3.5 fill-current text-amber-300" />
        <span>{t.flags.ESCALATED}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border bg-slate-100 text-slate-700 border-slate-300 ${sizeClasses}`}
    >
      <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
      <span>{t.flags.NO_RECENT_UPDATE}</span>
    </span>
  );
};

interface PriorityBadgeProps {
  priority: ComplaintPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const { t } = useLanguage();

  const config: Record<
    ComplaintPriority,
    { bg: string; text: string; border: string; label: string; icon?: React.ReactNode }
  > = {
    LOW: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      label: t.priorities.LOW,
    },
    MEDIUM: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-300',
      label: t.priorities.MEDIUM,
    },
    HIGH: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-400',
      label: t.priorities.HIGH,
    },
    CRITICAL: {
      bg: 'bg-rose-100',
      text: 'text-rose-800',
      border: 'border-rose-400',
      label: t.priorities.CRITICAL,
      icon: <ShieldAlert className="w-3 h-3 text-rose-700 inline" />,
    },
  };

  const item = config[priority] || config.MEDIUM;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded ${item.bg} ${item.text} border ${item.border} ${sizeClasses}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
