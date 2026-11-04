import React from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useNotifications } from '../../providers/NotificationContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Settings, RotateCcw, Server, ShieldCheck, Database, Info } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { resetDemoData } = useAuth();
  const { showToast } = useNotifications();

  const handleReset = () => {
    resetDemoData();
    showToast(
      'Factory Demo State Restored',
      'All grievance cases, follow-ups, escalations, and logs have been reset to default state.',
      'success'
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="District System Settings & Demonstration Controls"
        subtitle="Operational parameters, local mock database controls, and backend API integration diagnostics."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Demonstration Data Reset</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Clicking the reset button will restore all 30 complaints, 5 departments, 6 police stations, 12 officers, follow-up records, and notifications back to the default factory state. Any newly registered complaints or modified records will be cleared.
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
            Use this anytime during your demonstration walkthrough to return the application to a clean state.
          </div>

          <div>
            <Button variant="danger" size="md" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
              Reset Demo Data to Initial Factory State
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Backend API Service Architecture Diagnostics</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-6 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block font-semibold">Active Service Layer</span>
              <span className="font-bold text-slate-900 text-sm">Local Mock Storage Engine</span>
              <span className="text-[10px] text-emerald-700 font-mono block mt-0.5">VITE_USE_MOCK_API=true</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block font-semibold">Target Future Backend URL</span>
              <span className="font-bold text-slate-900 text-sm">/api/v1 (Ready for integration)</span>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Configured in services/api/client.ts</span>
            </div>
          </div>

          <p className="text-slate-500 leading-relaxed pt-2">
            All user operations across JanSetu invoke typed methods on the Service abstraction layer (<code>complaintsService</code>, <code>departmentsService</code>, <code>officersService</code>, <code>followupsService</code>, <code>escalationsService</code>, <code>auditService</code>). A backend developer can seamlessly implement real REST endpoints matching these contracts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
