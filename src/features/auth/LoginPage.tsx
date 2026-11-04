import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthContext';
import { useLanguage } from '../../providers/LanguageContext';
import { useNotifications } from '../../providers/NotificationContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Building,
  Scale,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let emailToSubmit = identifier.trim();
    if (!emailToSubmit || !password.trim()) {
      setError('Please provide your Employee ID / Email and Password.');
      return;
    }

    // Auto-resolve demo shortcuts to full email for backend validation
    const lower = emailToSubmit.toLowerCase();
    if (lower === 'admin') emailToSubmit = 'admin@jansetu.demo';
    else if (lower === 'pa') emailToSubmit = 'pa@jansetu.demo';
    else if (lower === 'officer') emailToSubmit = 'officer@jansetu.demo';
    else if (!emailToSubmit.includes('@')) {
      setError('Please enter a valid official email address (e.g. admin@jansetu.demo).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const loggedUser = await login(emailToSubmit, password);
      showToast(
        'Authentication Successful',
        `Welcome, ${loggedUser.name} (${loggedUser.designation})`,
        'success'
      );

      // Role-based redirection
      if (loggedUser.role === 'DC_MAIN_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (loggedUser.role === 'DC_PA') {
        navigate('/pa/dashboard', { replace: true });
      } else if (loggedUser.role === 'POLICE_OFFICER') {
        navigate('/officer/dashboard', { replace: true });
      } else {
        navigate('/unauthorized', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || t.login.invalidCredentials);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (email: string) => {
    setIdentifier(email);
    setPassword('JanSetu@123');
    setError(null);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    setTimeout(() => {
      setIsForgotModalOpen(false);
      setForgotSent(false);
      setForgotEmail('');
      showToast('Reset Instructions Dispatched', 'Temporary recovery code sent to official mail (simulated).', 'info');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT SECTION: Government Branding & Mission */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle geometric pattern overlay */}
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Branding */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Scale className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-wide text-white font-sans">{t.appName}</h1>
                  <p className="text-[11px] text-amber-400 font-medium tracking-tight">Government of Karnataka</p>
                </div>
              </div>

              {/* Language pill */}
              <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-0.5 rounded ${language === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('kn')}
                  className={`px-2 py-0.5 rounded font-kannada ${language === 'kn' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}
                >
                  ಕನ್ನಡ
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pilot: Police Department</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-white font-sans">
                {t.tagline}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                JanSetu ensures that every registered citizen grievance is immediately assigned to an accountable officer, monitored transparently with time-bound follow-ups, and resolved with verifiable audit records.
              </p>
            </div>
          </div>

          {/* Features list */}
          <div className="relative z-10 py-6 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-300">
                Single-flow AI OCR extraction, verification & officer dispatch
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-300">
                Time-bound follow-ups & automated escalation triggers
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-300">
                Immutable activity audit logs & bilingual English/Kannada UI
              </p>
            </div>
          </div>

          {/* Bottom Security Notice */}
          <div className="relative z-10 border-t border-slate-700/80 pt-4">
            <div className="flex items-start gap-2.5 text-[11px] text-slate-400 leading-snug">
              <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{t.login.securityNotice}</span>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Sign In Form & Quick Demo Logins */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
                {t.login.welcome}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{t.login.signInSubtitle}</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.login.employeeId}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin@jansetu.demo or IAS-KN-2012-088"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t.login.password}</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t.login.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                  />
                  <span>{t.login.rememberMe}</span>
                </label>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                {t.login.signInButton}
              </Button>
            </form>

            {/* Quick Demo Access Box */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {t.login.demoAccess}
                </span>
                <span className="text-[11px] font-mono text-slate-500">Pass: JanSetu@123</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{t.login.demoNote}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('admin@jansetu.demo')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-amber-50/80 hover:border-amber-300 text-left transition group"
                >
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                    DC Main Admin
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">admin@jansetu.demo</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('pa@jansetu.demo')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-amber-50/80 hover:border-amber-300 text-left transition group"
                >
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                    DC PA
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">pa@jansetu.demo</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoFill('officer@jansetu.demo')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-amber-50/80 hover:border-amber-300 text-left transition group"
                >
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-900">
                    Police Officer
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">officer@jansetu.demo</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Official Password"
        description="Enter your registered official email or employee ID to receive a password reset link."
        maxWidth="md"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Official Email Address
            </label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="e.g. officer@jansetu.demo"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-slate-800 outline-none"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            For demonstration, you can use any demo account email (e.g. <strong>admin@jansetu.demo</strong>).
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsForgotModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={forgotSent}>
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
