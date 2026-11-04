import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { Button } from '../../components/common/Button';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleReturn = () => {
    if (role === 'DC_MAIN_ADMIN') navigate('/admin/dashboard');
    else if (role === 'DC_PA') navigate('/pa/dashboard');
    else if (role === 'POLICE_OFFICER') navigate('/officer/dashboard');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 — Unauthorized Access</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Your current authenticated role (<strong>{role || 'Guest'}</strong>) does not possess statutory authorization to access this administrative module.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={handleReturn}>
            Return to Authorized Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
