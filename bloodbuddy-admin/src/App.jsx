import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './supabaseClient';
import bloodBuddyLogo from './assets/bloodbuddy-logo-transparent.png';

const NAV = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'analytics', label: 'Reports', icon: '▥' },
  { id: 'reports', label: 'Moderation & Reports', icon: '⚑' },
  { id: 'users', label: 'Community Users', icon: '♙' },
  { id: 'requests', label: 'Blood Requests', icon: '✚' },
  { id: 'audit', label: 'Audit Trail', icon: '▤', superOnly: true },
  { id: 'settings', label: 'User Settings', icon: '⚙' },
];

const cx = (...v) => v.filter(Boolean).join(' ');
const dateTime = (v) => v ? new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const dateOnly = (v) => v ? new Date(v).toLocaleDateString([], { dateStyle: 'medium' }) : '—';
const labelize = (v) => String(v || 'unknown').replaceAll('_', ' ');
const formatBlood = (bt) => bt && bt !== "Not provided / I don't know" ? String(bt).replace('-', '−') : 'Not set';
const inputDateValue = (date) => { const d = new Date(date); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; };
const startOfCurrentMonth = () => { const d = new Date(); return inputDateValue(new Date(d.getFullYear(), d.getMonth(), 1)); };
const todayInputDate = () => inputDateValue(new Date());

// Cohesive BloodBuddy Logo SVG from LandingPage & DESIGNG
function BrandLogo({ size = 'md' }) {
  const dims = size === 'lg' ? 'w-[50px] h-[50px]' : 'w-[50px] h-[50px]';
  return (
    <img
      src={bloodBuddyLogo}
      alt="BloodBuddy"
      className={cx(dims, 'flex-none object-contain drop-shadow-[0_4px_10px_rgba(164,18,31,0.20)]')}
    />
  );
}

// Theme Switcher Button matching LandingPage & DESIGNG
function ThemeToggleButton({ theme, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cx(
        'p-2 mr-1 text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-white transition',
        className
      )}
    >
      {theme === 'dark' ? (
        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// Toast Notification styled like DESIGNG.txt
function Toast({ notice, onClose }) {
  if (!notice?.message) return null;

  let bgConfig = 'bg-brand-surface dark:bg-[#25141a] border-brand-line dark:border-[#3b2328] text-brand-ink dark:text-[#f8ece9]';
  let iconConfig = (
    <svg className="w-5 h-5 text-brand-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (notice.type === 'success') {
    bgConfig = 'bg-[#f0f9f4] dark:bg-[#173326] border-[#cceadc] dark:border-brand-ok text-[#115a35] dark:text-[#58cf92]';
    iconConfig = (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  } else if (notice.type === 'error') {
    bgConfig = 'bg-[#fdf3f4] dark:bg-[#3a1a20] border-[#f4c8cb] dark:border-[#6f0818] text-[#d42b3a] dark:text-[#f2606f]';
    iconConfig = (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }

  return (
    <div role="status" className={cx('fixed top-20 right-4 sm:right-6 z-[100] flex items-start gap-3 p-4 border rounded-2xl shadow-custom animate-[rise_0.3s_ease_both] max-w-sm w-full', bgConfig)}>
      <div className="flex-none mt-0.5">{iconConfig}</div>
      <p className="flex-1 text-[13.5px] font-bold leading-snug pr-2">{notice.message}</p>
      <button onClick={onClose} className="flex-none opacity-60 hover:opacity-100 transition p-0.5 -mt-0.5 -mr-1" aria-label="Dismiss notification">✕</button>
    </div>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-brand-bg2 dark:bg-[#1e1013] text-brand-muted dark:text-[#c2a8a9] border border-brand-line dark:border-[#3b2328]',
    good: 'bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92] border border-brand-ok/25',
    warn: 'bg-amber-50 dark:bg-[#332610] text-amber-700 dark:text-[#e8b64d] border border-amber-200 dark:border-amber-900/50',
    bad: 'bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] border border-brand-accent/25',
    blue: 'bg-blue-50 dark:bg-[#1a2533] text-blue-700 dark:text-[#60a5fa] border border-blue-200 dark:border-blue-900/50',
    purple: 'bg-violet-50 dark:bg-[#2a173d] text-violet-700 dark:text-[#c4b5fd] border border-violet-200 dark:border-violet-900/50',
  };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold capitalize', tones[tone] || tones.neutral)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function toneForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['verified', 'fulfilled', 'resolved', 'completed', 'active', 'accepted'].includes(s)) return 'good';
  if (['pending', 'open', 'matched', 'not_submitted', 'in_review', 'submitted'].includes(s)) return 'warn';
  if (['rejected', 'cancelled', 'dismissed', 'restricted', 'declined', 'did_not_donate'].includes(s)) return 'bad';
  return 'neutral';
}

function StatCard({ label, value, hint, icon, tint = 'accent' }) {
  const tints = {
    accent: 'bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] border-brand-accent/20',
    gold: 'bg-amber-50 dark:bg-[#332610] text-amber-700 dark:text-[#e8b64d] border-amber-200 dark:border-amber-900/50',
    green: 'bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92] border-brand-ok/20',
    red: 'bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] border-brand-accent/20',
    blue: 'bg-blue-50 dark:bg-[#1a2533] text-blue-700 dark:text-[#60a5fa] border-blue-200 dark:border-blue-900/50',
  };
  return (
    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] p-6 shadow-custom transition-colors duration-300">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[11.5px] font-bold uppercase tracking-[0.14em] text-brand-muted dark:text-[#c2a8a9]">{label}</span>
        <span className={cx('grid h-11 w-11 flex-none place-items-center rounded-2xl border text-lg font-bold', tints[tint] || tints.accent)}>{icon}</span>
      </div>
      <p className="mt-4 font-display text-[36px] font-extrabold leading-none tracking-tight text-brand-ink dark:text-[#f8ece9]">{value}</p>
      <p className="mt-2 text-[13px] text-brand-muted dark:text-[#c2a8a9]">{hint}</p>
    </div>
  );
}

function Empty({ title, text }) {
  return (
    <div className="grid min-h-56 place-items-center px-6 py-12 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] text-2xl text-brand-accent dark:text-[#ff7d8b]">
          ♡
        </div>
        <h3 className="text-[18px] font-display font-bold text-brand-ink dark:text-[#f8ece9]">{title}</h3>
        <p className="mt-1.5 max-w-sm text-[14px] text-brand-muted dark:text-[#c2a8a9] mx-auto leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 dark:bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'max-h-[90vh] w-full overflow-y-auto rounded-[24px] bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] p-7 md:p-10 shadow-custom animate-[rise_0.2s_ease_both]',
          wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
          <div>
            <h3 className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9] tracking-tight">{title}</h3>
            {subtitle && <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-brand-line dark:border-[#3b2328] text-brand-muted hover:text-brand-ink dark:hover:text-white transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </section>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(Array(8).fill(''));
  const [forgotOtpAttempts, setForgotOtpAttempts] = useState(0);
  const [forgotExpiresIn, setForgotExpiresIn] = useState(0);
  const [forgotResendCooldown, setForgotResendCooldown] = useState(0);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const forgotOtpRefs = useRef([]);

  // Login MFA challenge (Supabase AAL2)
  const [showLoginMfaModal, setShowLoginMfaModal] = useState(false);
  const [loginMfaCode, setLoginMfaCode] = useState('');
  const [loginMfaFactorId, setLoginMfaFactorId] = useState('');
  const [loginMfaChallengeId, setLoginMfaChallengeId] = useState('');
  const [loginMfaError, setLoginMfaError] = useState('');
  const [isVerifyingLoginMfa, setIsVerifyingLoginMfa] = useState(false);
  const mfaChallengeInFlight = useRef(false);
  const loginMfaRefs = useRef([]);

  const [activeTab, setActiveTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notice, setNotice] = useState(null);
  const [pageError, setPageError] = useState('');

  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [requestFilter, setRequestFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState('all');
  const [reportDateStart, setReportDateStart] = useState(startOfCurrentMonth);
  const [reportDateEnd, setReportDateEnd] = useState(todayInputDate);
  const [reportExporting, setReportExporting] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Account settings / security
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [showDisableMfaModal, setShowDisableMfaModal] = useState(false);
  const [mfaStep, setMfaStep] = useState(1);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTargetId, setRoleTargetId] = useState('');
  const [roleTargetRole, setRoleTargetRole] = useState('admin');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const AVATAR_OPTIONS = ['bg-[#c9253a]','bg-[#1d7a4b]','bg-[#2563eb]','bg-[#d97706]','bg-[#7c3aed]','bg-[#db2777]','bg-[#1e1013]'];

  const isSuperAdmin = profile?.role === 'super_admin';
  const canAdmin = profile?.role === 'admin' || isSuperAdmin;

  // Global Theme Sync (works on Login, Unauthorized, and Dashboard screens)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const checkMfaStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setIs2FAEnabled(!!data?.all?.some((f) => f.factor_type === 'totp' && f.status === 'verified'));
    } catch (err) { console.warn('Could not check MFA status:', err.message); }
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const fullName = editFullName.trim();
    if (!profile?.id || !fullName) { flash('Please enter your full name.', 'error'); return; }
    setIsSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName, avatar_color: editAvatarColor }).eq('id', profile.id);
      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, full_name: fullName, avatar_color: editAvatarColor } : prev);
      setShowEditProfileModal(false); flash('Profile updated successfully.', 'success');
    } catch (err) { console.error(err); flash(`Failed to update profile: ${err.message || 'Please try again.'}`, 'error'); }
    finally { setIsSavingProfile(false); }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { flash('Password must be at least 8 characters.', 'error'); return; }
    if (newPassword !== confirmNewPassword) { flash('Passwords do not match.', 'error'); return; }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPasswordModal(false); setNewPassword(''); setConfirmNewPassword(''); flash('Password updated securely.', 'success');
    } catch (err) { console.error(err); flash(`Failed to update password: ${err.message || 'Please try again.'}`, 'error'); }
    finally { setIsSavingPassword(false); }
  };

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setShowEditProfileModal(false);
      setShowPasswordModal(false);
      setShowMfaModal(false);
      setShowDisableMfaModal(true);
    } else {
      setMfaStep(1);
      setMfaError('');
      setMfaVerifyCode('');
      setShowEditProfileModal(false);
      setShowPasswordModal(false);
      setShowDisableMfaModal(false);
      setShowMfaModal(true);
    }
  };

  const startEnrollMfa = async () => {
    setIsEnrollingMfa(true); setMfaError('');
    try {
      const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      for (const factor of (existing?.all || []).filter((f) => f.factor_type === 'totp' && f.status !== 'verified')) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id }); if (error) throw error;
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'BloodBuddy', friendlyName: 'BloodBuddy Admin Auth' });
      if (error) throw error;
      setMfaFactorId(data.id); setMfaQrCode(data.totp.uri); setMfaSecret(data.totp.secret); setMfaStep(2);
    } catch (err) { setMfaError(err.message || 'Failed to start MFA setup.'); }
    finally { setIsEnrollingMfa(false); }
  };

  const handleCopySecret = async () => {
    if (!mfaSecret) return;
    try {
      await navigator.clipboard.writeText(mfaSecret);
      flash('Authenticator setup key copied.', 'success');
    } catch {
      flash('Could not copy the setup key. You can copy it manually.', 'error');
    }
  };

  const verifyMfaCode = async (e) => {
    e.preventDefault(); if (!mfaVerifyCode || !mfaFactorId) return;
    setIsEnrollingMfa(true); setMfaError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId }); if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.data.id, code: mfaVerifyCode }); if (verify.error) throw verify.error;
      setIs2FAEnabled(true); setShowMfaModal(false); setMfaVerifyCode(''); flash('Two-Factor Authentication successfully enabled.', 'success');
    } catch (err) { console.error(err); setMfaError('Invalid code. Please check your authenticator app and try again.'); }
    finally { setIsEnrollingMfa(false); }
  };

  const disableMfa = async () => {
    setIsDisablingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors(); if (error) throw error;
      for (const factor of (data?.all || []).filter((f) => f.factor_type === 'totp' && f.status === 'verified')) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id }); if (unenrollError) throw unenrollError;
      }
      setIs2FAEnabled(false); setShowDisableMfaModal(false); flash('Two-Factor Authentication disabled.', 'success');
    } catch (err) { console.error(err); flash(`Failed to disable MFA: ${err.message || 'Please try again.'}`, 'error'); }
    finally { setIsDisablingMfa(false); }
  };

  const openRoleModal = () => { if (!isSuperAdmin) return; setRoleTargetId(''); setRoleTargetRole('admin'); setShowRoleModal(true); };
  const saveAdministratorRole = async (e) => {
    e.preventDefault(); if (!isSuperAdmin || !roleTargetId || !['admin','super_admin'].includes(roleTargetRole)) return;
    if (roleTargetId === session?.user?.id) { flash('You cannot change your own administrator role here.', 'error'); return; }
    setIsSavingRole(true);
    try {
      const target = users.find((u) => u.id === roleTargetId);
      const { error } = await supabase.from('profiles').update({ role: roleTargetRole }).eq('id', roleTargetId); if (error) throw error;
      await logAuditAction('CHANGE_ROLE', 'profiles', roleTargetId, `Role changed to ${roleTargetRole}`);
      setShowRoleModal(false); flash(`${target?.full_name || 'Account'} is now ${labelize(roleTargetRole)}.`, 'success'); await loadAdminData(profile.role);
    } catch (err) { console.error(err); flash(`Could not change role: ${err.message || 'Please try again.'}`, 'error'); }
    finally { setIsSavingRole(false); }
  };

  const flash = useCallback((message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const checkAdminRole = useCallback(async (userId) => {
    setAuthLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_restricted, avatar_color')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setAuthError(`Could not load your profile: ${error.message}`);
    } else {
      setProfile(data || null);
      setAuthError('');
      if (data?.role === 'admin' || data?.role === 'super_admin') checkMfaStatus();
    }
    setAuthLoading(false);
  }, []);

  const handleAuthenticatedSession = useCallback(async (nextSession) => {
    if (!nextSession?.user?.id) {
      setSession(null);
      setProfile(null);
      setAuthLoading(false);
      return;
    }

    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      const needsAal2 = aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2';
      if (needsAal2) {
        if (mfaChallengeInFlight.current) return;
        mfaChallengeInFlight.current = true;

        const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors();
        if (factorError) throw factorError;
        const factor = (factorData?.all || []).find((item) => item.factor_type === 'totp' && item.status === 'verified');
        if (!factor) {
          throw new Error('Your account requires 2FA, but no verified authenticator factor was found.');
        }

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError) throw challengeError;

        setLoginMfaFactorId(factor.id);
        setLoginMfaChallengeId(challengeData.id);
        setLoginMfaCode('');
        setLoginMfaError('');
        setShowLoginMfaModal(true);
        setAuthLoading(false);
        return;
      }

      setSession(nextSession);
      await checkAdminRole(nextSession.user.id);
    } catch (err) {
      console.error('Admin authentication security check failed:', err);
      setSession(null);
      setProfile(null);
      setAuthError(err.message || 'Unable to verify your administrator security settings.');
      setAuthLoading(false);
      await supabase.auth.signOut();
    } finally {
      mfaChallengeInFlight.current = false;
    }
  }, [checkAdminRole]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        setAuthError(error.message);
        setAuthLoading(false);
        return;
      }
      Promise.resolve(handleAuthenticatedSession(data?.session || null));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setShowLoginMfaModal(false);
        setLoginMfaCode('');
        setLoginMfaError('');
        setSession(null);
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      // SIGNED_IN is intentionally processed through the AAL2 gate above.
      // Do not render the admin workspace until the authenticator code is verified.
      if (event === 'SIGNED_IN') {
        Promise.resolve().then(() => handleAuthenticatedSession(nextSession));
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [handleAuthenticatedSession]);

  const loadAdminData = useCallback(async (role = profile?.role) => {
    if (!role || !['admin', 'super_admin'].includes(role)) return;
    setDataLoading(true);
    setPageError('');

    const jobs = await Promise.all([
      supabase
        .from('reports')
        .select('*, reporter:reporter_id(id, full_name), reported:reported_user_id(id, full_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, blood_type, role, is_restricted, id_verification_status, is_available_donor, readiness_passed, created_at, city, avatar_color')
        .order('created_at', { ascending: false }),
      supabase
        .from('blood_requests')
        .select('*, profiles:requester_id(full_name), donor:selected_donor_id(id, full_name, blood_type)')
        .order('created_at', { ascending: false }),
      role === 'super_admin'
        ? supabase.from('audit_logs').select('*, actor:actor_id(full_name)').order('created_at', { ascending: false }).limit(150)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const labels = ['reports', 'profiles', 'blood requests', 'audit logs'];
    const errors = jobs.map((j, i) => (j.error ? `${labels[i]}: ${j.error.message}` : null)).filter(Boolean);

    setReports(jobs[0].data || []);
    setUsers(jobs[1].data || []);
    setRequests(jobs[2].data || []);
    setAuditLogs(jobs[3].data || []);

    if (errors.length) setPageError(errors.join(' · '));
    setDataLoading(false);
  }, [profile?.role]);

  useEffect(() => {
    if (canAdmin) loadAdminData(profile.role);
  }, [canAdmin, profile?.role, loadAdminData]);

  const logAuditAction = async (action, entity, targetId, details) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('audit_logs').insert([
      { actor_id: session.user.id, action, target_entity: entity, target_id: targetId, details },
    ]);
    if (error) console.warn('Audit log insert failed:', error.message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoginMfaError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const handleLoginMfaChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const chars = loginMfaCode.split('');
    while (chars.length < 6) chars.push('');
    chars[index] = clean;
    setLoginMfaCode(chars.join('').slice(0, 6));
    if (loginMfaError) setLoginMfaError('');
    if (clean && index < 5) loginMfaRefs.current[index + 1]?.focus();
  };

  const handleLoginMfaKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !loginMfaCode[index] && index > 0) loginMfaRefs.current[index - 1]?.focus();
  };

  const handleLoginMfaPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    setLoginMfaCode(pasted);
    setLoginMfaError('');
    loginMfaRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const verifyLoginMfa = async (e) => {
    e.preventDefault();
    if (loginMfaCode.length !== 6 || !loginMfaFactorId || !loginMfaChallengeId || isVerifyingLoginMfa) return;

    setIsVerifyingLoginMfa(true);
    setLoginMfaError('');
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: loginMfaFactorId,
        challengeId: loginMfaChallengeId,
        code: loginMfaCode,
      });
      if (error) throw error;

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) throw new Error('MFA verification succeeded, but the admin session could not be restored.');

      setShowLoginMfaModal(false);
      setLoginMfaCode('');
      setLoginMfaChallengeId('');
      setLoginMfaFactorId('');
      setSession(sessionData.session);
      await checkAdminRole(sessionData.session.user.id);
    } catch (err) {
      console.error('Admin login MFA verification failed:', err);
      setLoginMfaError('Invalid or expired code. Open your authenticator app and enter the newest 6-digit code.');
    } finally {
      setIsVerifyingLoginMfa(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email.trim());
    setForgotPasswordStep('email');
    setForgotOtp(Array(8).fill(''));
    setForgotOtpAttempts(0);
    setForgotExpiresIn(0);
    setForgotResendCooldown(0);
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotShowPassword(false);
    setForgotShowConfirmPassword(false);
    setShowForgotPasswordModal(true);
  };

  const closeForgotPassword = () => {
    if (forgotLoading) return;
    setShowForgotPasswordModal(false);
    setForgotPasswordStep('email');
    setForgotOtp(Array(8).fill(''));
    setForgotError('');
  };

  useEffect(() => {
    if (!showForgotPasswordModal || forgotPasswordStep !== 'otp') return undefined;
    const timer = window.setInterval(() => {
      setForgotExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setForgotResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showForgotPasswordModal, forgotPasswordStep]);

  const handleForgotOtpChange = (index, value) => {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').slice(-1);
    setForgotOtp((prev) => { const next = [...prev]; next[index] = clean; return next; });
    if (forgotError) setForgotError('');
    if (clean && index < 7) forgotOtpRefs.current[index + 1]?.focus();
  };

  const handleForgotOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtp[index] && index > 0) forgotOtpRefs.current[index - 1]?.focus();
  };

  const handleForgotOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    if (!pasted) return;
    const next = Array(8).fill('');
    [...pasted].forEach((char, i) => { next[i] = char; });
    setForgotOtp(next);
    forgotOtpRefs.current[Math.min(pasted.length, 7)]?.focus();
    setForgotError('');
  };

  const sendForgotRecoveryCode = async () => {
    const target = forgotEmail.trim();
    if (!target) { setForgotError('Please enter your BloodBuddy email address.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: window.location.origin });
      if (error) throw error;
      setEmail(target);
      setForgotPasswordStep('otp');
      setForgotOtp(Array(8).fill(''));
      setForgotOtpAttempts(0);
      setForgotExpiresIn(300);
      setForgotResendCooldown(60);
      window.setTimeout(() => forgotOtpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setForgotError(err.message || 'Could not send the recovery code. Please try again.');
    } finally { setForgotLoading(false); }
  };

  const verifyForgotRecoveryCode = async () => {
    const token = forgotOtp.join('');
    if (token.length !== 8) { setForgotError('Please enter the complete 8-digit code.'); return; }
    if (forgotExpiresIn === 0) { setForgotError('The recovery code has expired. Please request a new one.'); return; }
    if (forgotOtpAttempts >= 3) { setForgotError('Maximum verification attempts reached. Please request a new code.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email: forgotEmail.trim(), token, type: 'recovery' });
      if (error) {
        const attempts = forgotOtpAttempts + 1;
        setForgotOtpAttempts(attempts);
        throw new Error(`Invalid code. You have ${Math.max(0, 3 - attempts)} attempt(s) remaining.`);
      }
      setForgotPasswordStep('password');
      setForgotError('');
    } catch (err) {
      setForgotError(err.message || 'Could not verify the recovery code.');
    } finally { setForgotLoading(false); }
  };

  const resendForgotRecoveryCode = async () => {
    if (forgotResendCooldown > 0 || forgotLoading) return;
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setForgotOtp(Array(8).fill(''));
      setForgotOtpAttempts(0);
      setForgotExpiresIn(300);
      setForgotResendCooldown(60);
      window.setTimeout(() => forgotOtpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setForgotError(err.message || 'Could not resend the recovery code.');
    } finally { setForgotLoading(false); }
  };

  const updateForgotPassword = async () => {
    if (forgotNewPassword.length < 8) { setForgotError('Password must be at least 8 characters.'); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setForgotError('Passwords do not match.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: forgotNewPassword });
      if (error) throw error;
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      setShowForgotPasswordModal(false);
      setForgotPasswordStep('email');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotOtp(Array(8).fill(''));
      flash('Password updated successfully. You can now sign in securely.', 'success');
      if (sessionData?.session) await handleAuthenticatedSession(sessionData.session);
    } catch (err) {
      setForgotError(err.message || 'Could not update your password.');
    } finally { setForgotLoading(false); }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) flash(error.message, 'error');
    else {
      setSession(null);
      setProfile(null);
      setActiveTab('overview');
    }
  };

  const executeToggleRestriction = async (targetUser) => {
    if (!canAdmin || targetUser.id === session?.user?.id) return;
    if (targetUser.role === 'super_admin' && !isSuperAdmin) {
      flash('Only a super admin can modify a super-admin account.', 'error');
      return;
    }
    const next = !targetUser.is_restricted;
    setBusyId(targetUser.id);
    setConfirmDialog(null);

    const { error } = await supabase.from('profiles').update({ is_restricted: next }).eq('id', targetUser.id);
    if (error) {
      flash(`Could not update account: ${error.message}`, 'error');
    } else {
      await logAuditAction(next ? 'RESTRICT_USER' : 'REACTIVATE_USER', 'profiles', targetUser.id, `Set restricted status to ${next}`);
      flash(`${targetUser.full_name || 'User'} is now ${next ? 'restricted' : 'active'}.`, 'success');
      await loadAdminData(profile.role);
    }
    setBusyId(null);
  };

  const executeRoleChange = async (targetUser, newRole) => {
    if (!isSuperAdmin || targetUser.id === session?.user?.id) return;
    if (!['user', 'admin', 'super_admin'].includes(newRole)) return;
    if (targetUser.role === 'super_admin' && newRole !== 'super_admin') return;
    setBusyId(targetUser.id);
    setConfirmDialog(null);

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetUser.id);
    if (error) {
      flash(`Could not change role: ${error.message}`, 'error');
    } else {
      await logAuditAction('CHANGE_ROLE', 'profiles', targetUser.id, `Role changed to ${newRole}`);
      flash(`Role updated to ${newRole}.`, 'success');
      await loadAdminData(profile.role);
    }
    setBusyId(null);
  };

  const executeReportStatusUpdate = async (report, status) => {
    if (!canAdmin) return;
    setBusyId(report.id);
    setConfirmDialog(null);

    const { error } = await supabase.from('reports').update({ status }).eq('id', report.id);
    if (error) {
      flash(`Could not update report: ${error.message}`, 'error');
    } else {
      await logAuditAction(status === 'resolved' ? 'RESOLVE_REPORT' : 'DISMISS_REPORT', 'reports', report.id, `Report status changed to ${status}`);
      flash(`Report marked ${status}.`, 'success');
      setSelectedReport(null);
      await loadAdminData(profile.role);
    }
    setBusyId(null);
  };

  const filteredUsers = useMemo(() => users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch = [u.full_name, u.id, u.city, u.blood_type, u.role].some((x) => String(x || '').toLowerCase().includes(q));
    const matchesFilter =
      userFilter === 'all' ||
      (userFilter === 'restricted'
        ? u.is_restricted
        : userFilter === 'pending_id'
        ? ['pending', 'submitted', 'in_review'].includes(String(u.id_verification_status || '').toLowerCase())
        : userFilter === 'verified'
        ? u.id_verification_status === 'verified'
        : userFilter === 'admins'
        ? ['admin', 'super_admin'].includes(u.role)
        : true);
    return matchesSearch && matchesFilter;
  }), [users, search, userFilter]);

  const filteredReports = useMemo(() => reports.filter((r) => {
    const q = search.toLowerCase();
    const text = [r.reason, r.details, r.status, r.reporter?.full_name, r.reported?.full_name].join(' ').toLowerCase();
    return text.includes(q) && (
      reportFilter === 'all' ||
      (reportFilter === 'open'
        ? !['resolved', 'dismissed'].includes(String(r.status || '').toLowerCase())
        : String(r.status || '').toLowerCase() === reportFilter)
    );
  }), [reports, search, reportFilter]);

  const filteredRequests = useMemo(() => requests.filter((r) => {
    const q = search.toLowerCase();
    const text = [r.patient_name, r.blood_type, r.hospital_name, r.city, r.status, r.profiles?.full_name, r.donor?.full_name].join(' ').toLowerCase();
    return text.includes(q) && (requestFilter === 'all' || String(r.status || '').toLowerCase() === requestFilter);
  }), [requests, search, requestFilter]);

  const reportRange = useMemo(() => {
    const start = new Date(`${reportDateStart}T00:00:00`);
    const end = new Date(`${reportDateEnd}T23:59:59.999`);
    const valid = start <= end;
    const completed = valid ? requests.filter((r) => {
      const status = String(r.donor_donation_status || '').toLowerCase();
      if (status !== 'completed') return false;
      const date = new Date(r.updated_at || r.created_at);
      return date >= start && date <= end;
    }) : [];
    const byBlood = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bloodType) => ({
      bloodType,
      count: completed.filter((r) => (r.donor?.blood_type || r.blood_type) === bloodType).length,
    }));
    const unknownCount = completed.filter((r) => !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(r.donor?.blood_type || r.blood_type)).length;
    const cities = Object.entries(completed.reduce((acc, r) => {
      const city = r.city || 'Not specified';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]);
    const uniqueDonors = new Set(completed.map((r) => r.selected_donor_id).filter(Boolean)).size;
    return { valid, completed, byBlood, unknownCount, cities, uniqueDonors, totalRequests: valid ? requests.filter((r) => { const d = new Date(r.created_at); return d >= start && d <= end; }).length : 0 };
  }, [requests, reportDateStart, reportDateEnd]);

  const exportDonationReport = () => {
    if (!reportRange.valid || reportExporting) return;
    setReportExporting(true);
    try {
      const escapeCsv = (value) => `\"${String(value ?? '').replaceAll('\"', '\"\"')}\"`;
      const lines = [
        ['BloodBuddy Donation Report'],
        ['Date range', `${reportDateStart} to ${reportDateEnd}`],
        ['Generated', new Date().toLocaleString()],
        [],
        ['Summary'],
        ['Total completed donations', reportRange.completed.length],
        ['Unique donors', reportRange.uniqueDonors],
        ['Blood type', 'Donations'],
        ...reportRange.byBlood.map((row) => [row.bloodType, row.count]),
        ...(reportRange.unknownCount ? [['Unknown / not provided', reportRange.unknownCount]] : []),
        [],
        ['Donation Details'],
        ['Donation date', 'Blood type', 'Donor', 'Patient', 'Hospital', 'City', 'Request status'],
        ...reportRange.completed.map((r) => [
          dateOnly(r.updated_at || r.created_at),
          formatBlood(r.donor?.blood_type || r.blood_type),
          r.donor?.full_name || 'Unknown',
          r.patient_name || 'Patient request',
          r.hospital_name || 'Not specified',
          r.city || 'Not specified',
          labelize(r.status || 'fulfilled'),
        ]),
      ];
      const csv = lines.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloodbuddy-donation-report-${reportDateStart}-to-${reportDateEnd}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash('Donation report exported as CSV.', 'success');
    } finally { setReportExporting(false); }
  };

  const openReports = reports.filter((r) => !['resolved', 'dismissed'].includes(String(r.status || '').toLowerCase())).length;
  const pendingVerification = users.filter((u) => ['pending', 'submitted', 'in_review'].includes(String(u.id_verification_status || '').toLowerCase())).length;
  const openRequests = requests.filter((r) => ['open', 'matched'].includes(String(r.status || '').toLowerCase())).length;
  const restrictedUsers = users.filter((u) => u.is_restricted).length;

  const setTab = (id) => {
    setActiveTab(id);
    setSearch('');
    setMobileNavOpen(false);
  };

  const pageTitles = {
    overview: ['Admin Overview', 'Real-time community snapshot, active requests, and moderation priorities.'],
    analytics: ['Reports', 'Review donation activity across a selected date range and export a shareable report.'],
    reports: ['Moderation & Reports', 'Review community incident reports and record moderation outcomes.'],
    users: ['Community Directory', 'Manage community accounts, verification states, and platform roles.'],
    requests: ['Blood Requests', 'Monitor live blood requests and donor coordination states across facilities.'],
    audit: ['Audit Trail', 'Accountable log of administrative actions (Super Admin access only).'],
    settings: ['Account Settings', 'Manage your personal identity, login credentials, and account security.'],
  };

  // 1. LOADING SCREEN (With Theme Support)
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] font-body transition-colors duration-300">
        <div className="text-center animate-[rise_0.3s_ease_both]">
          <div className="mx-auto mb-4 flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <p className="font-display text-[18px] font-bold">Loading BloodBuddy Admin…</p>
          <p className="mt-1 text-[13px] text-brand-muted dark:text-[#c2a8a9]">Verifying session & security permissions</p>
        </div>
      </div>
    );
  }

  // 2. LOGIN SCREEN (Cohesive with LandingPage.jsx + Theme Toggle in Header)
  if (!session) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] font-body flex flex-col transition-colors duration-300 relative overflow-hidden">
        {/* Background Radial Glow from LandingPage */}
        <div className="absolute inset-x-0 -top-16 bottom-0 -z-10 bg-[radial-gradient(60%_70%_at_85%_30%,#fbe3e0,transparent_70%),radial-gradient(40%_50%_at_0%_0%,#f4e7e1,transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_85%_30%,#3a1a20,transparent_70%),radial-gradient(40%_50%_at_0%_0%,#1e1013,transparent_70%)] transition-colors duration-300" />

        {/* Cohesive Top Header with Theme Switcher */}
        <header className="sticky top-0 z-30 bg-brand-bg/90 dark:bg-[#150a0c]/90 backdrop-blur-md border-b border-brand-line dark:border-[#3b2328] transition-colors duration-300">
          <div className="max-w-[1160px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-display font-extrabold text-[22px] tracking-tight text-brand-ink dark:text-[#f8ece9]">
              <BrandLogo />
              <span>BloodBuddy</span>
              <span className="ml-1 rounded-full bg-brand-blush dark:bg-[#3a1a20] px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">
                Admin
              </span>
            </div>
            <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {/* Split Hero + Login Card */}
        <main className="flex-1 flex items-center py-10 md:py-16 px-4 md:px-6">
          <div className="max-w-[1160px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] font-mono text-[12.5px] tracking-widest uppercase">
                Administrative Workspace
              </span>
              <h1 className="font-display font-extrabold text-[40px] md:text-[62px] leading-[1.08] tracking-tight text-balance text-brand-ink dark:text-[#f8ece9]">
                Keep community blood matching <span className="text-brand-accent dark:text-[#ff7d8b]">safe & accountable.</span>
              </h1>
              <p className="text-[16.5px] md:text-[18px] text-brand-muted dark:text-[#c2a8a9] max-w-[34em] leading-relaxed">
                Review community reports, manage donor verification statuses, and monitor emergency blood requests across hospitals in real time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 max-w-[560px]">
                <div className="p-4 rounded-2xl bg-brand-surface/80 dark:bg-[#25141a]/80 border border-brand-line dark:border-[#3b2328]">
                  <strong className="block text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">Role-Gated</strong>
                  <span className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">RLS-enforced admin & super admin access.</span>
                </div>
                <div className="p-4 rounded-2xl bg-brand-surface/80 dark:bg-[#25141a]/80 border border-brand-line dark:border-[#3b2328]">
                  <strong className="block text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">Privacy First</strong>
                  <span className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">Sensitive ID files stay protected.</span>
                </div>
                <div className="p-4 rounded-2xl bg-brand-surface/80 dark:bg-[#25141a]/80 border border-brand-line dark:border-[#3b2328]">
                  <strong className="block text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">Audit Logged</strong>
                  <span className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">Every moderation decision is tracked.</span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-[460px] mx-auto bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] p-7 md:p-10 shadow-custom transition-colors duration-300">
              <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">Authorized Personnel</span>
              <h2 className="font-display font-extrabold text-[28px] tracking-tight mt-1 text-brand-ink dark:text-[#f8ece9]">Sign in to Admin Portal</h2>
              {authError && (
                <div role="alert" className="mt-5 rounded-2xl border border-[#f4c8cb] dark:border-[#6f0818] bg-[#fdf3f4] dark:bg-[#3a1a20] p-4 text-[13.5px] font-medium text-[#d42b3a] dark:text-[#f2606f]">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="admin-email" className="block text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">
                    Email address <span className="text-brand-accent dark:text-[#ff7d8b]">*</span>
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@bloodbuddy.ph"
                    className="w-full text-[15px] text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-2xl px-4 h-[50px] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="admin-password" className="text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9]">
                      Password <span className="text-brand-accent dark:text-[#ff7d8b]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      disabled={false}
                      className="text-[12.5px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full text-[15px] text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-2xl px-4 pr-16 h-[50px] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 px-2 text-[12.5px] font-bold text-brand-muted hover:text-brand-ink dark:text-[#c2a8a9] dark:hover:text-white transition"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-4 font-bold text-[15.5px] py-4 bg-brand-btn dark:bg-[#c9253a] text-white rounded-xl shadow-[0_8px_20px_-10px_#a4121f] dark:shadow-[0_8px_20px_-10px_#c9253a] hover:bg-brand-btnHover dark:hover:bg-[#e03349] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Sign in securely <span aria-hidden="true">→</span>
                </button>
              </form>

            </div>
          </div>
        </main>

        <footer className="border-t border-brand-line dark:border-[#3b2328] py-6 px-4 md:px-6 text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">
          <div className="max-w-[1160px] mx-auto flex flex-wrap justify-between gap-4">
            <span>BloodBuddy Administrative Portal · Every Drop Counts</span>
            <span>Computer Studies Department · University of Caloocan City</span>
          </div>
        </footer>

        {showForgotPasswordModal && createPortal(
          <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-brand-ink/45 p-4 backdrop-blur-sm dark:bg-black/70" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
            <section className="relative w-full max-w-[448px] rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom animate-[rise_0.2s_ease_both] dark:border-[#3b2328] dark:bg-[#25141a]">
              <button type="button" onClick={closeForgotPassword} disabled={forgotLoading} className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-xl text-[22px] text-brand-muted hover:text-brand-ink dark:text-[#c2a8a9] dark:hover:text-white disabled:opacity-40" aria-label="Close password recovery">×</button>
              <div className="mb-5 flex justify-center"><div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-brand-blush text-brand-accent dark:bg-[#3a1a20] dark:text-[#ff7d8b]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div></div>
              {forgotPasswordStep === 'email' && (
                <>
                  <h3 id="forgot-password-title" className="font-display text-center text-[28px] font-extrabold leading-tight tracking-tight text-brand-ink dark:text-[#f8ece9]">Reset Your Password</h3>
                  <p className="mx-auto mt-2.5 max-w-[22em] text-center text-[14px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">Enter your email address to receive an 8-digit verification code.</p>
                  {forgotError && <div role="alert" className="mt-5 rounded-xl border border-[#f4c8cb] bg-[#fdf3f4] p-3 text-[12.5px] font-medium text-[#d42b3a] dark:border-[#6f0818] dark:bg-[#3a1a20] dark:text-[#f2606f]">{forgotError}</div>}
                  <form onSubmit={(e) => { e.preventDefault(); sendForgotRecoveryCode(); }} className="mt-7">
                    <label className="mb-1.5 block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">Email Address</label>
                    <div className="relative"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9]"><svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></div><input type="email" required autoFocus value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }} placeholder="name@example.com" className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg py-3 pl-11 pr-4 text-[15px] text-brand-ink outline-none transition focus:border-brand-accent focus:shadow-[0_0_0_4px_rgba(164,18,31,0.12)] dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]" /></div>
                    <button type="submit" disabled={forgotLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-btn py-4 text-[15px] font-bold text-white shadow-[0_8px_20px_-10px_#a4121f] transition hover:bg-brand-btnHover disabled:opacity-50 dark:bg-[#c9253a] dark:hover:bg-[#e03349]">{forgotLoading ? 'Sending…' : 'Send Recovery Code'} <span>→</span></button>
                  </form>
                </>
              )}

              {forgotPasswordStep === 'otp' && (
                <>
                  <h3 id="forgot-password-title" className="font-display text-center text-[28px] font-extrabold leading-tight tracking-tight text-brand-ink dark:text-[#f8ece9]">Verify Email</h3>
                  <p className="mx-auto mt-2.5 max-w-[22em] text-center text-[14px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">We sent an 8-digit code to <strong className="text-brand-ink dark:text-[#f8ece9]">{forgotEmail}</strong>. Enter it below to continue.</p>
                  {forgotError && <div role="alert" className="mt-5 rounded-xl border border-[#f4c8cb] bg-[#fdf3f4] p-3 text-center text-[12.5px] font-medium text-[#d42b3a] dark:border-[#6f0818] dark:bg-[#3a1a20] dark:text-[#f2606f]">{forgotError}</div>}
                  <form onSubmit={(e) => { e.preventDefault(); verifyForgotRecoveryCode(); }} className="mt-7">
                    <label className="mb-2.5 block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">8-Digit OTP Code</label>
                    <div className="flex gap-1.5 sm:gap-2" onPaste={handleForgotOtpPaste}>{forgotOtp.map((value, index) => <input key={index} ref={(el) => (forgotOtpRefs.current[index] = el)} type="text" inputMode="text" maxLength={1} value={value} onChange={(e) => handleForgotOtpChange(index, e.target.value)} onKeyDown={(e) => handleForgotOtpKeyDown(index, e)} disabled={forgotLoading || forgotOtpAttempts >= 3 || forgotExpiresIn === 0} autoFocus={index === 0} className="h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-brand-line bg-brand-bg text-center text-[17px] font-bold text-brand-ink outline-none transition focus:border-brand-accent focus:shadow-[0_0_0_4px_rgba(164,18,31,0.12)] dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]" aria-label={`OTP digit ${index + 1}`} />)}</div>
                    <div className="mt-5 text-center"><p className="text-[13px] font-medium text-brand-muted dark:text-[#c2a8a9]">{forgotExpiresIn > 0 && forgotOtpAttempts < 3 ? <>Code expires in <span className="font-bold text-brand-accent dark:text-[#ff7d8b]">{Math.floor(forgotExpiresIn / 60)}:{String(forgotExpiresIn % 60).padStart(2, '0')}</span></> : <span className="font-bold text-brand-accent dark:text-[#ff7d8b]">{forgotOtpAttempts >= 3 ? 'Maximum attempts reached.' : 'Code expired.'}</span>}</p><button type="button" onClick={resendForgotRecoveryCode} disabled={forgotResendCooldown > 0 || forgotLoading} className="mt-1.5 text-[13px] font-bold text-brand-accent hover:underline disabled:opacity-50 dark:text-[#ff7d8b]">{forgotResendCooldown > 0 ? `Resend available in ${forgotResendCooldown}s` : "Didn't receive OTP? Resend"}</button></div>
                    <button type="submit" disabled={forgotLoading || forgotOtp.join('').length !== 8 || forgotOtpAttempts >= 3 || forgotExpiresIn === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-btn py-4 text-[15px] font-bold text-white shadow-[0_8px_20px_-10px_#a4121f] transition hover:bg-brand-btnHover disabled:opacity-50 dark:bg-[#c9253a] dark:hover:bg-[#e03349]">{forgotLoading ? 'Verifying…' : 'Verify OTP Code'} <span>→</span></button>
                  </form>
                </>
              )}

              {forgotPasswordStep === 'password' && (
                <>
                  <h3 id="forgot-password-title" className="font-display text-center text-[28px] font-extrabold leading-tight tracking-tight text-brand-ink dark:text-[#f8ece9]">Set New Password</h3>
                  <p className="mx-auto mt-2.5 max-w-[22em] text-center text-[14px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">Create a new, strong password to secure your administrator account.</p>
                  {forgotError && <div role="alert" className="mt-5 rounded-xl border border-[#f4c8cb] bg-[#fdf3f4] p-3 text-[12.5px] font-medium text-[#d42b3a] dark:border-[#6f0818] dark:bg-[#3a1a20] dark:text-[#f2606f]">{forgotError}</div>}
                  <form onSubmit={(e) => { e.preventDefault(); updateForgotPassword(); }} className="mt-7 space-y-4">
                    <div><label className="mb-1.5 block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">New Password</label><div className="relative"><input type={forgotShowPassword ? 'text' : 'password'} minLength={8} required value={forgotNewPassword} onChange={(e) => { setForgotNewPassword(e.target.value); setForgotError(''); }} placeholder="Create a strong password" className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 pr-14 text-[15px] text-brand-ink outline-none focus:border-brand-accent dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]" /><button type="button" onClick={() => setForgotShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-[12.5px] font-bold text-brand-muted dark:text-[#c2a8a9]">{forgotShowPassword ? 'Hide' : 'Show'}</button></div></div>
                    <div><label className="mb-1.5 block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">Confirm Password</label><div className="relative"><input type={forgotShowConfirmPassword ? 'text' : 'password'} minLength={8} required value={forgotConfirmPassword} onChange={(e) => { setForgotConfirmPassword(e.target.value); setForgotError(''); }} placeholder="Confirm your password" className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 pr-14 text-[15px] text-brand-ink outline-none focus:border-brand-accent dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]" /><button type="button" onClick={() => setForgotShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-[12.5px] font-bold text-brand-muted dark:text-[#c2a8a9]">{forgotShowConfirmPassword ? 'Hide' : 'Show'}</button></div></div>
                    <button type="submit" disabled={forgotLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-btn py-4 text-[15px] font-bold text-white shadow-[0_8px_20px_-10px_#a4121f] transition hover:bg-brand-btnHover disabled:opacity-50 dark:bg-[#c9253a] dark:hover:bg-[#e03349]">{forgotLoading ? 'Updating…' : 'Update Password & Log In'} <span>→</span></button>
                  </form>
                </>
              )}

              <div className="mt-7 border-t border-brand-line pt-6 text-center text-[13.5px] text-brand-muted dark:border-[#3b2328] dark:text-[#c2a8a9]">Remembered your password? <button type="button" onClick={closeForgotPassword} disabled={forgotLoading} className="font-bold text-brand-accent hover:underline dark:text-[#ff7d8b]">Sign in</button></div>
            </section>
          </div>,
          document.body
        )}

        {showLoginMfaModal && createPortal(
          <div className="fixed inset-0 z-[10002] flex items-center justify-center overflow-y-auto bg-brand-ink/45 p-4 backdrop-blur-sm dark:bg-black/70" role="dialog" aria-modal="true" aria-labelledby="login-mfa-title">
            <section className="relative w-full max-w-[448px] rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom animate-[rise_0.2s_ease_both] dark:border-[#3b2328] dark:bg-[#25141a]">
              <div className="mb-5 flex justify-center"><div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-brand-blush text-brand-accent dark:bg-[#3a1a20] dark:text-[#ff7d8b]"><svg viewBox="0 0 30 34" className="h-5 w-5"><path d="M15 1C15 1 2 15 2 22.5a13 13 0 0 0 26 0C28 15 15 1 15 1Z" fill="currentColor"/></svg></div></div>
              <button type="button" onClick={async () => { if (isVerifyingLoginMfa) return; setShowLoginMfaModal(false); setLoginMfaCode(''); setLoginMfaError(''); await supabase.auth.signOut(); }} className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-xl text-[22px] text-brand-muted hover:text-brand-ink dark:text-[#c2a8a9] dark:hover:text-white" aria-label="Close two-factor authentication">×</button>
              <h3 id="login-mfa-title" className="font-display text-center text-[28px] font-extrabold leading-tight tracking-tight text-brand-ink dark:text-[#f8ece9]">Two-Factor<br className="sm:hidden" /> Authentication</h3>
              <p className="mx-auto mt-2.5 max-w-[20em] text-center text-[14px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">Enter the 6-digit code from your authenticator app to log in.</p>
              {loginMfaError && <div role="alert" className="mt-5 rounded-xl border border-[#f4c8cb] bg-[#fdf3f4] p-3 text-center text-[12.5px] font-medium text-[#d42b3a] dark:border-[#6f0818] dark:bg-[#3a1a20] dark:text-[#f2606f]">{loginMfaError}</div>}
              <form onSubmit={verifyLoginMfa} className="mt-7">
                <label className="mb-2.5 block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">6-Digit Authenticator Code</label>
                <div className="flex gap-1.5 sm:gap-2" onPaste={handleLoginMfaPaste}>
                  {Array.from({length: 6}).map((_, index) => (
                    <input key={index} ref={(el) => (loginMfaRefs.current[index] = el)} type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={loginMfaCode[index] || ''} onChange={(e) => handleLoginMfaChange(index, e.target.value)} onKeyDown={(e) => handleLoginMfaKeyDown(index, e)} disabled={isVerifyingLoginMfa} autoFocus={index === 0} className="h-14 min-w-0 flex-1 rounded-xl border-[1.5px] border-brand-line bg-brand-bg text-center font-mono text-[20px] font-bold text-brand-ink outline-none transition focus:border-brand-accent focus:shadow-[0_0_0_4px_rgba(164,18,31,0.12)] dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]" aria-label={`Authenticator digit ${index + 1}`} />
                  ))}
                </div>
                <button type="button" onClick={async () => { if (isVerifyingLoginMfa) return; setShowLoginMfaModal(false); setLoginMfaCode(''); setLoginMfaError(''); await supabase.auth.signOut(); }} disabled={isVerifyingLoginMfa} className="mx-auto mt-6 block text-[13px] font-bold text-brand-muted hover:text-brand-ink dark:text-[#c2a8a9] dark:hover:text-[#f8ece9]">Cancel and return to login</button>
                <button type="submit" disabled={isVerifyingLoginMfa || loginMfaCode.length !== 6} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-btn py-4 text-[15px] font-bold text-white shadow-[0_8px_20px_-10px_#a4121f] transition hover:bg-brand-btnHover disabled:opacity-50 dark:bg-[#c9253a] dark:hover:bg-[#e03349]">{isVerifyingLoginMfa ? 'Verifying…' : 'Verify Authenticator'} <span aria-hidden="true">→</span></button>
              </form>
              <div className="mt-7 border-t border-brand-line pt-6 text-center text-[13.5px] text-brand-muted dark:border-[#3b2328] dark:text-[#c2a8a9]">Remembered your password? <button type="button" onClick={async () => { if (isVerifyingLoginMfa) return; setShowLoginMfaModal(false); setLoginMfaCode(''); setLoginMfaError(''); await supabase.auth.signOut(); }} className="font-bold text-brand-accent hover:underline dark:text-[#ff7d8b]">Sign in</button></div>
            </section>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // 3. UNAUTHORIZED SCREEN (With Theme Toggle)
  if (!canAdmin) {
    return (
      <div className="min-h-screen bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] font-body flex flex-col transition-colors duration-300">
        <header className="border-b border-brand-line dark:border-[#3b2328] bg-brand-bg/90 dark:bg-[#150a0c]/90 backdrop-blur-md">
          <div className="max-w-[1160px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-display font-extrabold text-[22px] tracking-tight">
              <BrandLogo />
              <span>BloodBuddy</span>
            </div>
            <ThemeToggleButton theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        <div className="flex-1 grid place-items-center p-5">
          <div className="w-full max-w-md rounded-[28px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] p-8 text-center shadow-custom">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-blush dark:bg-[#3a1a20] text-2xl text-brand-accent dark:text-[#ff7d8b]">
              ⌁
            </div>
            <h1 className="mt-5 font-display text-[24px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Admin Access Required</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">
              You are signed in as <strong>{session.user.email}</strong>, but your account role is currently <code className="font-mono text-brand-accent dark:text-[#ff7d8b]">{profile?.role || 'user'}</code>. Ask a Super Admin to upgrade your role in the <code className="font-mono">profiles</code> table.
            </p>
            {authError && <p className="mt-3 text-xs text-brand-accent">{authError}</p>}
            <button
              onClick={handleLogout}
              className="mt-6 w-full py-3.5 rounded-2xl bg-brand-btn dark:bg-[#c9253a] text-[14.5px] font-bold text-white shadow-[0_8px_20px_-10px_#a4121f] hover:bg-brand-btnHover transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => !n.superOnly || isSuperAdmin);
  const title = pageTitles[activeTab] || pageTitles.overview;
  const adminInitials = (profile?.full_name || session.user.email || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // 4. MAIN AUTHENTICATED ADMIN WORKSPACE
  return (
    <div className="min-h-screen bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] font-body transition-colors duration-300">
      <Toast notice={notice} onClose={() => setNotice(null)} />

      <div className="min-h-screen lg:flex">
        {mobileNavOpen && (
          <button
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-30 bg-brand-ink/40 dark:bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Cohesive Sidebar */}
        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 flex flex-col bg-brand-surface dark:bg-[#1e1013] border-r border-brand-line dark:border-[#3b2328] transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            sidebarCollapsed ? 'w-[88px]' : 'w-[280px]',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className={cx('flex items-center border-b border-brand-line dark:border-[#3b2328] h-[72px]', sidebarCollapsed ? 'justify-center px-3' : 'gap-3 px-6')}>
            <BrandLogo />
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-[20px] tracking-tight text-brand-ink dark:text-[#f8ece9] leading-none">BloodBuddy</p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Admin Workspace</p>
              </div>
            )}
            <button
              type="button"
              className={cx('grid h-9 w-9 place-items-center rounded-xl border border-brand-line dark:border-[#3b2328] text-brand-muted hover:text-brand-ink dark:hover:text-white hover:bg-brand-bg2 dark:hover:bg-[#25141a] transition', sidebarCollapsed ? '' : 'lg:ml-auto')}
              onClick={() => { if (window.innerWidth < 1024) setMobileNavOpen(false); else setSidebarCollapsed(v => !v); }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-[17px] leading-none">{sidebarCollapsed ? '›' : '‹'}</span>
            </button>
          </div>

          <div className="px-4 pt-6 flex-1 overflow-y-auto">
            {!sidebarCollapsed && <p className="px-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-muted dark:text-[#c2a8a9]">Navigation</p>}
            <nav className="mt-3 space-y-1.5">
              {visibleNav.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={cx(
                      'group flex w-full items-center rounded-2xl py-3 text-left text-[14px] font-bold transition', sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3.5',
                      isActive
                        ? 'bg-brand-btn dark:bg-[#c9253a] text-white shadow-[0_8px_20px_-10px_#a4121f]'
                        : 'text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#25141a] hover:text-brand-ink dark:hover:text-[#f8ece9]'
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-8 w-8 place-items-center rounded-xl text-base transition',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-brand-bg dark:bg-[#150a0c] text-brand-accent dark:text-[#ff7d8b] border border-brand-line dark:border-[#3b2328]'
                      )}
                    >
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
                    {!sidebarCollapsed && item.id === 'reports' && openReports > 0 && (
                      <span
                        className={cx(
                          'rounded-full px-2 py-0.5 font-mono text-[11px] font-bold',
                          isActive ? 'bg-white text-[#7a0d1a]' : 'bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b]'
                        )}
                      >
                        {openReports}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className={cx('border-t border-brand-line dark:border-[#3b2328]', sidebarCollapsed ? 'p-3' : 'p-4')}>
            <div className={cx('rounded-2xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c]', sidebarCollapsed ? 'p-2' : 'p-4')}>
              <div className={cx('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-3') }>
                <div className={cx('grid h-10 w-10 flex-none place-items-center rounded-full text-white text-[13px] font-bold', profile?.avatar_color || 'bg-[#c9253a]')}>
                  {adminInitials}
                </div>
                {!sidebarCollapsed && <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9]">{profile.full_name || 'Administrator'}</p>
                  <p className="mt-0.5 text-[11.5px] capitalize text-brand-muted dark:text-[#c2a8a9]">{labelize(profile.role)}</p>
                </div>}
              </div>
              {!sidebarCollapsed && <div className="mt-3.5 flex items-center justify-between border-t border-brand-line dark:border-[#3b2328] pt-3 text-[11.5px]">
                <span className="text-brand-muted dark:text-[#c2a8a9]">Session status</span>
                <span className="flex items-center gap-1.5 font-bold text-brand-ok dark:text-[#58cf92]">
                  <span className="h-2 w-2 rounded-full bg-brand-ok dark:bg-[#58cf92] animate-ping" />
                  Verified
                </span>
              </div>}
            </div>

            <button
              onClick={handleLogout}
              className={cx('mt-3 flex w-full items-center justify-center rounded-2xl border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] py-3 text-[13.5px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:bg-brand-blush dark:hover:bg-[#3a1a20] transition', sidebarCollapsed ? 'px-2' : 'gap-2 px-4')}
              title={sidebarCollapsed ? 'Log out' : undefined}
            >
              <span>↪</span>{!sidebarCollapsed && ' Log Out'}
            </button>
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="min-w-0 flex-1 flex flex-col">
          {/* Sticky Header matching LandingPage & DESIGNG */}
          <header className="sticky top-0 z-20 border-b border-brand-line dark:border-[#3b2328] bg-brand-bg/90 dark:bg-[#150a0c]/90 backdrop-blur-md transition-colors duration-300">
            <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-9">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#25141a] transition"
                  onClick={() => { if (window.innerWidth < 1024) setMobileNavOpen(true); else setSidebarCollapsed(v => !v); }}
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? '☰' : '☰'}
                </button>
                <div className="min-w-0">
                  <p className="truncate font-display text-[20px] font-extrabold tracking-tight text-brand-ink dark:text-[#f8ece9]">{title[0]}</p>
                  <p className="hidden truncate text-[12.5px] text-brand-muted dark:text-[#c2a8a9] sm:block">{title[1]}</p>
                </div>
              </div>

              <div className="flex flex-none items-center gap-2.5">
                <button
                  onClick={() => loadAdminData(profile.role)}
                  disabled={dataLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] px-3.5 py-2 text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] hover:border-brand-accent dark:hover:border-[#ff7d8b] transition disabled:opacity-50"
                >
                  <span className={dataLoading ? 'animate-spin' : ''}>↻</span>
                  <span className="hidden sm:inline">{dataLoading ? 'Syncing…' : 'Refresh'}</span>
                </button>

                <ThemeToggleButton theme={theme} onToggle={toggleTheme} />

                <Pill tone={isSuperAdmin ? 'purple' : 'blue'}>{labelize(profile.role)}</Pill>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-7 lg:p-9">
            {pageError && (
              <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-[#332610] p-4 text-[13.5px] text-amber-800 dark:text-[#e8b64d]">
                <span className="font-bold">!</span>
                <div className="flex-1">
                  <p className="font-bold">Some records could not be loaded</p>
                  <p className="mt-1 text-[12.5px]">{pageError}</p>
                </div>
                <button onClick={() => setPageError('')} aria-label="Dismiss error">✕</button>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="animate-[rise_0.3s_ease_both] space-y-7">
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-crimsonHi dark:from-[#c9253a] to-brand-crimsonDeep dark:to-[#6f0818] text-white p-7 md:p-9 shadow-custom">
                  <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-white/10 pointer-events-none" />
                  <span className="font-mono text-[11.5px] uppercase tracking-[0.18em] text-white/80">
                    {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <h1 className="mt-2 font-display text-[28px] md:text-[36px] font-extrabold tracking-tight">
                    Welcome back, {(profile.full_name || 'Admin').split(' ')[0]}.
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14.5px] text-white/85 leading-relaxed">
                    Monitor volunteer donor verifications, respond to community reports, and keep urgent hospital blood requests moving smoothly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="Community Members" value={users.length.toLocaleString()} hint={`${restrictedUsers} restricted account${restrictedUsers === 1 ? '' : 's'}`} icon="♙" />
                  <StatCard label="Reports to Review" value={openReports.toLocaleString()} hint={`${reports.length} total reports submitted`} icon="⚑" tint="gold" />
                  <StatCard label="Active Blood Requests" value={openRequests.toLocaleString()} hint={`${requests.length} total platform requests`} icon="✚" tint="green" />
                  <StatCard label="Pending ID Checks" value={pendingVerification.toLocaleString()} hint="Didit verification status" icon="▣" tint="gold" />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
                  <section className="overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                    <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] px-6 py-5">
                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Moderation Queue</span>
                        <h2 className="font-display text-[20px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Unresolved Reports</h2>
                      </div>
                      <button onClick={() => setTab('reports')} className="text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline">
                        View all →
                      </button>
                    </div>

                    {reports.filter((r) => !['resolved', 'dismissed'].includes(String(r.status || '').toLowerCase())).slice(0, 5).length ? (
                      <div className="divide-y divide-brand-line dark:divide-[#3b2328]">
                        {reports
                          .filter((r) => !['resolved', 'dismissed'].includes(String(r.status || '').toLowerCase()))
                          .slice(0, 5)
                          .map((r) => (
                            <button
                              key={r.id}
                              onClick={() => setSelectedReport(r)}
                              className="flex w-full items-start gap-4 px-6 py-4 text-left transition hover:bg-brand-bg2 dark:hover:bg-[#1e1013]"
                            >
                              <span className="mt-0.5 grid h-10 w-10 flex-none place-items-center rounded-2xl bg-amber-50 dark:bg-[#332610] text-amber-700 dark:text-[#e8b64d] border border-amber-200 dark:border-amber-900/50">
                                ⚑
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="text-[14.5px] font-bold capitalize text-brand-ink dark:text-[#f8ece9]">{labelize(r.reason)}</span>
                                  <Pill tone={toneForStatus(r.status)}>{labelize(r.status || 'pending')}</Pill>
                                </span>
                                <span className="mt-1 block truncate text-[13px] text-brand-muted dark:text-[#c2a8a9]">
                                  {r.reporter?.full_name || 'Unknown'} reported <strong className="text-brand-accent dark:text-[#ff7d8b]">{r.reported?.full_name || 'a user'}</strong>
                                </span>
                                <span className="mt-1 block font-mono text-[11px] text-brand-muted dark:text-[#c2a8a9]">{dateTime(r.created_at)}</span>
                              </span>
                              <span className="text-brand-muted dark:text-[#c2a8a9]">→</span>
                            </button>
                          ))}
                      </div>
                    ) : (
                      <Empty title="You’re all caught up" text="There are no unresolved community reports waiting for review." />
                    )}
                  </section>

                  <section className="overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                    <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] px-6 py-5">
                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Live Activity</span>
                        <h2 className="font-display text-[20px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Recent Blood Requests</h2>
                      </div>
                      <button onClick={() => setTab('requests')} className="text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline">
                        View all →
                      </button>
                    </div>

                    {requests.slice(0, 5).length ? (
                      <div className="divide-y divide-brand-line dark:divide-[#3b2328]">
                        {requests.slice(0, 5).map((r) => (
                          <div key={r.id} className="flex items-start gap-4 px-6 py-4">
                            <div className="w-[46px] h-[46px] flex-none rounded-full bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 flex items-center justify-center text-[15px] font-extrabold text-brand-accent dark:text-[#ff7d8b]">
                              {formatBlood(r.blood_type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14.5px] font-bold text-brand-ink dark:text-[#f8ece9]">{r.patient_name || 'Patient Request'}</p>
                              <p className="mt-0.5 truncate text-[13px] text-brand-muted dark:text-[#c2a8a9]">
                                {r.hospital_name || 'Hospital not specified'} {r.city ? `· ${r.city}` : ''}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Pill tone={toneForStatus(r.status)}>{labelize(r.status)}</Pill>
                                <span className="font-mono text-[11px] text-brand-muted dark:text-[#c2a8a9]">{dateOnly(r.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty title="No blood requests yet" text="Emergency blood requests submitted by users will appear here." />
                    )}
                  </section>
                </div>
              </div>
            )}

            {/* TAB 2: REPORTS */}
            {activeTab === 'analytics' && (
              <div className="animate-[rise_0.3s_ease_both] space-y-6">
                <section className="overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                  <div className="flex flex-col gap-5 border-b border-brand-line dark:border-[#3b2328] p-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Donation Analytics</span>
                      <h2 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Donation Reports</h2>
                      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">Track completed donor confirmations by blood type and date range. The report uses the donation completion update timestamp when available.</p>
                    </div>
                    <button type="button" onClick={exportDonationReport} disabled={!reportRange.valid || reportExporting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-btn px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_20px_-10px_#a4121f] transition hover:bg-brand-btnHover disabled:cursor-not-allowed disabled:opacity-50">
                      {reportExporting ? 'Exporting…' : 'Export CSV →'}
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="rounded-2xl border border-brand-line bg-brand-bg dark:border-[#3b2328] dark:bg-[#150a0c] p-4 md:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-[12.5px] font-bold text-brand-ink dark:text-[#f8ece9]">From date</label>
                            <input type="date" value={reportDateStart} max={reportDateEnd} onChange={(e) => setReportDateStart(e.target.value)} className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-surface px-4 py-2.5 text-[13.5px] font-medium text-brand-ink outline-none focus:border-brand-accent dark:border-[#3b2328] dark:bg-[#25141a] dark:text-[#f8ece9]" />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[12.5px] font-bold text-brand-ink dark:text-[#f8ece9]">To date</label>
                            <input type="date" value={reportDateEnd} min={reportDateStart} onChange={(e) => setReportDateEnd(e.target.value)} className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-surface px-4 py-2.5 text-[13.5px] font-medium text-brand-ink outline-none focus:border-brand-accent dark:border-[#3b2328] dark:bg-[#25141a] dark:text-[#f8ece9]" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => { const d = new Date(); setReportDateStart(inputDateValue(new Date(d.getFullYear(), d.getMonth(), 1))); setReportDateEnd(inputDateValue(d)); }} className="rounded-xl border border-brand-line bg-brand-surface px-3.5 py-2.5 text-[12.5px] font-bold text-brand-ink hover:border-brand-accent dark:border-[#3b2328] dark:bg-[#25141a] dark:text-[#f8ece9]">This month</button>
                          <button type="button" onClick={() => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - 29); setReportDateStart(inputDateValue(start)); setReportDateEnd(inputDateValue(d)); }} className="rounded-xl border border-brand-line bg-brand-surface px-3.5 py-2.5 text-[12.5px] font-bold text-brand-ink hover:border-brand-accent dark:border-[#3b2328] dark:bg-[#25141a] dark:text-[#f8ece9]">Last 30 days</button>
                        </div>
                      </div>
                      {!reportRange.valid && <p className="mt-3 text-[12.5px] font-bold text-brand-accent dark:text-[#ff7d8b]">Please choose a valid date range.</p>}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <StatCard label="Completed Donations" value={reportRange.completed.length.toLocaleString()} hint={`${reportDateStart} → ${reportDateEnd}`} icon="♥" tint="red" />
                      <StatCard label="Unique Donors" value={reportRange.uniqueDonors.toLocaleString()} hint="Confirmed donors in range" icon="♙" tint="green" />
                      <StatCard label="Requests Created" value={reportRange.totalRequests.toLocaleString()} hint="Blood requests in range" icon="✚" tint="blue" />
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_.9fr]">
                  <section className="overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                    <div className="border-b border-brand-line dark:border-[#3b2328] p-6">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">Breakdown</span>
                      <h3 className="mt-1 font-display text-[20px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Donations by blood type</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {reportRange.byBlood.map((row) => {
                          const max = Math.max(1, ...reportRange.byBlood.map((item) => item.count));
                          return (
                            <div key={row.bloodType}>
                              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                                <span className="font-bold text-brand-ink dark:text-[#f8ece9]">{formatBlood(row.bloodType)}</span>
                                <span className="font-mono text-brand-muted dark:text-[#c2a8a9]">{row.count}</span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-brand-bg2 dark:bg-[#1e1013]">
                                <div className="h-full rounded-full bg-brand-btn transition-all" style={{ width: `${(row.count / max) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {reportRange.unknownCount > 0 && <p className="mt-4 text-[12px] text-brand-muted dark:text-[#c2a8a9]">{reportRange.unknownCount} completed donation(s) had no usable donor blood type.</p>}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                    <div className="border-b border-brand-line dark:border-[#3b2328] p-6">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">Location</span>
                      <h3 className="mt-1 font-display text-[20px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Top donation cities</h3>
                    </div>
                    <div className="p-6">
                      {reportRange.cities.length ? <div className="space-y-3">{reportRange.cities.slice(0, 6).map(([city, count]) => <div key={city} className="flex items-center justify-between rounded-xl border border-brand-line bg-brand-bg px-4 py-3 dark:border-[#3b2328] dark:bg-[#150a0c]"><span className="truncate pr-4 text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">{city}</span><span className="font-mono text-[12px] font-bold text-brand-accent dark:text-[#ff7d8b]">{count}</span></div>)}</div> : <Empty title="No completed donations" text="Choose another date range to view donation activity." />}
                    </div>
                  </section>
                </div>

                <section className="overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                  <div className="flex flex-col gap-2 border-b border-brand-line dark:border-[#3b2328] p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div><span className="font-mono text-[11px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">Included Records</span><h3 className="mt-1 font-display text-[20px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Completed donation activity</h3></div>
                    <span className="font-mono text-[11px] text-brand-muted dark:text-[#c2a8a9]">{reportRange.completed.length} record(s)</span>
                  </div>
                  {reportRange.completed.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-brand-bg2/70 dark:bg-[#1e1013]"><tr>{['Date','Blood type','Donor','Patient','Hospital','City'].map((h)=><th key={h} className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-wider text-brand-muted dark:text-[#c2a8a9]">{h}</th>)}</tr></thead><tbody className="divide-y divide-brand-line dark:divide-[#3b2328]">{reportRange.completed.map((r)=><tr key={r.id} className="hover:bg-brand-bg2/60 dark:hover:bg-[#1e1013]"><td className="px-5 py-4 text-[12px] font-mono text-brand-muted dark:text-[#c2a8a9]">{dateOnly(r.updated_at || r.created_at)}</td><td className="px-5 py-4 text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b]">{formatBlood(r.donor?.blood_type || r.blood_type)}</td><td className="px-5 py-4 text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">{r.donor?.full_name || 'Unknown'}</td><td className="px-5 py-4 text-[13px] text-brand-ink dark:text-[#f8ece9]">{r.patient_name || 'Patient request'}</td><td className="px-5 py-4 text-[13px] text-brand-muted dark:text-[#c2a8a9]">{r.hospital_name || 'Not specified'}</td><td className="px-5 py-4 text-[13px] text-brand-muted dark:text-[#c2a8a9]">{r.city || 'Not specified'}</td></tr>)}</tbody></table></div> : <Empty title="No completed donations in this range" text="Completed donor confirmations will appear here once they fall within the selected dates." />}
                </section>
              </div>
            )}

            {/* TAB 3: REPORTS & MODERATION */}
            {activeTab === 'reports' && (
              <section className="animate-[rise_0.3s_ease_both] overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                <div className="flex flex-col gap-4 border-b border-brand-line dark:border-[#3b2328] p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Community Safety</span>
                    <h2 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Incident & No-Show Reports</h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search reason, reporter, details…"
                      className="min-w-0 rounded-xl border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2.5 text-[13.5px] text-brand-ink dark:text-[#f8ece9] outline-none focus:border-brand-accent sm:w-64"
                    />
                    <select
                      value={reportFilter}
                      onChange={(e) => setReportFilter(e.target.value)}
                      className="rounded-xl border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2.5 text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9] outline-none focus:border-brand-accent"
                    >
                      <option value="all">All reports</option>
                      <option value="open">Needs review</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                </div>

                {dataLoading ? (
                  <div className="p-12 text-center text-sm text-brand-muted dark:text-[#c2a8a9]">Loading reports…</div>
                ) : filteredReports.length ? (
                  <div className="divide-y divide-brand-line dark:divide-[#3b2328]">
                    {filteredReports.map((r) => {
                      const isClosed = ['resolved', 'dismissed'].includes(String(r.status || '').toLowerCase());
                      return (
                        <article key={r.id} className="p-6 transition hover:bg-brand-bg2 dark:hover:bg-[#1e1013]">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start">
                            <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-amber-50 dark:bg-[#332610] text-amber-700 dark:text-[#e8b64d] border border-amber-200 dark:border-amber-900/50 text-lg">
                              ⚑
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="font-display text-[17px] font-bold capitalize text-brand-ink dark:text-[#f8ece9]">{labelize(r.reason)}</h3>
                                <Pill tone={toneForStatus(r.status)}>{labelize(r.status || 'pending')}</Pill>
                              </div>
                              <p className="mt-1.5 text-[13px] text-brand-muted dark:text-[#c2a8a9]">
                                Reporter: <strong className="text-brand-ink dark:text-[#f8ece9]">{r.reporter?.full_name || 'Unknown'}</strong>
                                <span className="mx-2">→</span>
                                Reported user: <strong className="text-brand-accent dark:text-[#ff7d8b]">{r.reported?.full_name || 'Unknown'}</strong>
                              </p>
                              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-brand-ink/90 dark:text-[#f8ece9]/90 bg-brand-bg dark:bg-[#150a0c] p-3.5 rounded-xl border border-brand-line dark:border-[#3b2328]">
                                {r.details || 'No additional details provided.'}
                              </p>
                              <p className="mt-2.5 font-mono text-[11.5px] text-brand-muted dark:text-[#c2a8a9]">Submitted {dateTime(r.created_at)}</p>
                            </div>
                            <div className="flex flex-none flex-wrap gap-2 md:justify-end">
                              <button
                                onClick={() => setSelectedReport(r)}
                                className="rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2 text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] hover:border-brand-accent transition"
                              >
                                Inspect
                              </button>
                              {!isClosed && (
                                <>
                                  <button
                                    disabled={busyId === r.id}
                                    onClick={() =>
                                      setConfirmDialog({
                                        title: 'Mark Report as Resolved',
                                        subtitle: `Confirm moderation resolution for "${labelize(r.reason)}".`,
                                        confirmLabel: 'Confirm Resolved',
                                        tone: 'good',
                                        onConfirm: () => executeReportStatusUpdate(r, 'resolved'),
                                      })
                                    }
                                    className="rounded-xl bg-brand-okSoft dark:bg-[#173326] border border-brand-ok/30 px-4 py-2 text-[13px] font-bold text-brand-ok dark:text-[#58cf92] hover:opacity-90 disabled:opacity-50 transition"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    disabled={busyId === r.id}
                                    onClick={() =>
                                      setConfirmDialog({
                                        title: 'Dismiss Report',
                                        subtitle: 'Dismiss this report if it lacks evidence or requires no further moderation.',
                                        confirmLabel: 'Dismiss Report',
                                        tone: 'bad',
                                        onConfirm: () => executeReportStatusUpdate(r, 'dismissed'),
                                      })
                                    }
                                    className="rounded-xl bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/25 px-4 py-2 text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:opacity-90 disabled:opacity-50 transition"
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <Empty title="No matching reports" text="Try adjusting your search query or status filter." />
                )}
              </section>
            )}

            {/* TAB 3: COMMUNITY USERS */}
            {activeTab === 'users' && (
              <section className="animate-[rise_0.3s_ease_both] overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                <div className="flex flex-col gap-4 border-b border-brand-line dark:border-[#3b2328] p-6 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">User Management</span>
                    <div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Community Directory</h2>{isSuperAdmin && <button onClick={openRoleModal} className="rounded-xl bg-brand-btn dark:bg-[#c9253a] px-4 py-2.5 text-[12.5px] font-bold text-white hover:bg-brand-btnHover transition">+ Add Administrator</button>}</div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, city, blood type…"
                      className="min-w-0 rounded-xl border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2.5 text-[13.5px] text-brand-ink dark:text-[#f8ece9] outline-none focus:border-brand-accent sm:w-64"
                    />
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="rounded-xl border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2.5 text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9] outline-none focus:border-brand-accent"
                    >
                      <option value="all">All accounts</option>
                      <option value="verified">ID Verified</option>
                      <option value="pending_id">ID Pending</option>
                      <option value="restricted">Restricted</option>
                      <option value="admins">Administrators</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-brand-bg dark:bg-[#150a0c] border-b border-brand-line dark:border-[#3b2328]">
                      <tr className="font-mono text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-[#c2a8a9]">
                        <th className="px-6 py-4">Member</th>
                        <th className="px-4 py-4">Blood Type</th>
                        <th className="px-4 py-4">Identity Status</th>
                        <th className="px-4 py-4">Donor Visibility</th>
                        <th className="px-4 py-4">Role</th>
                        <th className="px-4 py-4">Account</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-line dark:divide-[#3b2328]">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="transition hover:bg-brand-bg2 dark:hover:bg-[#1e1013]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className={cx('grid h-10 w-10 flex-none place-items-center rounded-full text-white text-[13px] font-bold', u.avatar_color || 'bg-[#c9253a]')}>
                                {(u.full_name || '?').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="max-w-[220px] truncate text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">{u.full_name || 'Unnamed Member'}</p>
                                <p className="mt-0.5 max-w-[220px] truncate text-[12px] text-brand-muted dark:text-[#c2a8a9]">
                                  {u.city || 'No city set'} · Joined {dateOnly(u.created_at)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-block px-2.5 py-1 text-[12.5px] font-bold text-brand-accent dark:text-[#ff7d8b] bg-brand-blush dark:bg-[#3a1a20] rounded-lg font-mono">
                              {formatBlood(u.blood_type)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Pill tone={toneForStatus(u.id_verification_status)}>{labelize(u.id_verification_status || 'not submitted')}</Pill>
                          </td>
                          <td className="px-4 py-4">
                            <Pill tone={u.is_available_donor ? 'good' : 'neutral'}>{u.is_available_donor ? 'Available' : 'Hidden'}</Pill>
                          </td>
                          <td className="px-4 py-4">
                            <Pill tone={u.role === 'super_admin' ? 'purple' : u.role === 'admin' ? 'blue' : 'neutral'}>{labelize(u.role || 'user')}</Pill>
                          </td>
                          <td className="px-4 py-4">
                            <Pill tone={u.is_restricted ? 'bad' : 'good'}>{u.is_restricted ? 'Restricted' : 'Active'}</Pill>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              {u.id === session.user.id ? (
                                <Pill tone="blue">You</Pill>
                              ) : (
                                <>
                                  <button
                                    disabled={busyId === u.id || (u.role === 'super_admin' && !isSuperAdmin)}
                                    onClick={() =>
                                      setConfirmDialog({
                                        title: `${u.is_restricted ? 'Reactivate' : 'Restrict'} Account`,
                                        subtitle: `${u.is_restricted ? 'Restore platform access for' : 'Block requests and donor visibility for'} ${u.full_name || 'this user'}?`,
                                        confirmLabel: u.is_restricted ? 'Reactivate User' : 'Restrict User',
                                        tone: u.is_restricted ? 'good' : 'bad',
                                        onConfirm: () => executeToggleRestriction(u),
                                      })
                                    }
                                    className={cx(
                                      'rounded-xl px-3.5 py-2 text-[12px] font-bold transition disabled:opacity-40',
                                      u.is_restricted
                                        ? 'bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92] border border-brand-ok/30'
                                        : 'bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] border border-brand-accent/25'
                                    )}
                                  >
                                    {busyId === u.id ? 'Saving…' : u.is_restricted ? 'Reactivate' : 'Restrict'}
                                  </button>

                                  {isSuperAdmin && u.role !== 'super_admin' && (
                                    <button
                                      disabled={busyId === u.id}
                                      onClick={() => {
                                        const nextRole = u.role === 'admin' ? 'user' : 'admin';
                                        setConfirmDialog({
                                          title: 'Change Account Role',
                                          subtitle: `Update ${u.full_name || 'this user'}'s role from "${u.role}" to "${nextRole}"?`,
                                          confirmLabel: `Set as ${nextRole}`,
                                          tone: 'good',
                                          onConfirm: () => executeRoleChange(u, nextRole),
                                        });
                                      }}
                                      className="rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-3.5 py-2 text-[12px] font-bold text-brand-ink dark:text-[#f8ece9] hover:border-brand-accent transition disabled:opacity-40"
                                    >
                                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredUsers.length && <Empty title="No members found" text="Try changing the search term or selected filter." />}
                </div>
              </section>
            )}

            {/* TAB 4: BLOOD REQUESTS */}
            {activeTab === 'requests' && (
              <section className="animate-[rise_0.3s_ease_both] overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                <div className="flex flex-col gap-4 border-b border-brand-line dark:border-[#3b2328] p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Hospital Coordination</span>
                    <h2 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Platform Blood Requests</h2>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search patient, hospital, city…"
                      className="min-w-0 rounded-xl border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2.5 text-[13.5px] text-brand-ink dark:text-[#f8ece9] outline-none focus:border-brand-accent sm:w-64"
                    />
                    <select
                      value={requestFilter}
                      onChange={(e) => setRequestFilter(e.target.value)}
                      className="rounded-xl border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-4 py-2.5 text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9] outline-none focus:border-brand-accent"
                    >
                      <option value="all">All statuses</option>
                      <option value="open">Open</option>
                      <option value="matched">Matched</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {dataLoading ? (
                  <div className="p-12 text-center text-sm text-brand-muted dark:text-[#c2a8a9]">Loading requests…</div>
                ) : filteredRequests.length ? (
                  <div className="divide-y divide-brand-line dark:divide-[#3b2328]">
                    {filteredRequests.map((r) => (
                      <article key={r.id} className="p-6 transition hover:bg-brand-bg2 dark:hover:bg-[#1e1013] flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="w-[52px] h-[52px] flex-none rounded-full bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 flex items-center justify-center text-[18px] font-extrabold text-brand-accent dark:text-[#ff7d8b]">
                          {formatBlood(r.blood_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="font-display text-[18px] font-bold text-brand-ink dark:text-[#f8ece9]">{r.patient_name || 'Patient Request'}</h3>
                            <Pill tone={toneForStatus(r.status)}>{labelize(r.status)}</Pill>
                            {r.donor_response && <Pill tone={toneForStatus(r.donor_response)}>Donor: {labelize(r.donor_response)}</Pill>}
                          </div>
                          <p className="mt-1 text-[14px] font-medium text-brand-ink/85 dark:text-[#f8ece9]/85">
                            {r.hospital_name || 'Hospital not specified'} {r.city ? `· ${r.city}` : ''}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">
                            <span>Requester: <strong className="text-brand-ink dark:text-[#f8ece9]">{r.profiles?.full_name || 'Unknown'}</strong></span>
                            <span>Selected Donor: <strong className="text-brand-ink dark:text-[#f8ece9]">{r.donor?.full_name || 'Public Board'}</strong></span>
                            <span>Created: {dateTime(r.created_at)}</span>
                          </div>
                          {r.urgency_notes && (
                            <p className="mt-3 rounded-xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] p-3.5 text-[13px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">
                              {r.urgency_notes}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty title="No requests found" text="There are no blood requests matching this search or status filter." />
                )}
              </section>
            )}

            {/* TAB 5: USER SETTINGS */}
            {activeTab === 'settings' && (
              <div className="animate-[rise_0.35s_ease_both] space-y-6">
                <div><h2 className="font-display text-[32px] font-extrabold tracking-tight text-brand-ink dark:text-[#f8ece9]">Account Settings</h2><p className="mt-1 text-[15px] text-brand-muted dark:text-[#c2a8a9]">Manage your personal identity, login credentials, and account security.</p></div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
                  <div className="space-y-6">
                    <section className="rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] p-6 shadow-custom">
                      <div className="mb-5 flex items-center justify-between"><span className="font-mono text-[12px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">PERSONAL INFORMATION</span><button onClick={() => {setEditFullName(profile?.full_name || '');setEditAvatarColor(profile?.avatar_color || AVATAR_OPTIONS[0]);setShowEditProfileModal(true);}} className="text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline">Edit Information</button></div>
                      <div className="mb-5 flex items-center gap-4"><div className={cx('grid h-[52px] w-[52px] place-items-center rounded-full text-[18px] font-bold text-white',profile?.avatar_color || AVATAR_OPTIONS[0])}>{adminInitials}</div><div className="min-w-0"><p className="truncate text-[17px] font-bold text-brand-ink dark:text-[#f8ece9]">{profile?.full_name || 'Administrator'}</p><p className="mt-0.5 truncate text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">{session.user.email}</p></div></div>
                      <div className="rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] p-3.5 text-[13px] text-brand-muted dark:text-[#c2a8a9]"><b className="text-brand-ink dark:text-[#f8ece9]">Role:</b> {labelize(profile?.role)}</div>
                    </section>
                    <section className="rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] p-6 shadow-custom">
                      <span className="font-mono text-[12px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">APPEARANCE</span>
                      <div className="mt-5 flex items-center justify-between gap-4"><div><p className="text-[15.5px] font-bold text-brand-ink dark:text-[#f8ece9]">Theme</p><p className="mt-0.5 text-[13px] text-brand-muted dark:text-[#c2a8a9]">Choose light or dark mode for the entire portal.</p></div><div className="flex rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] p-1"><button type="button" onClick={() => setTheme('light')} className={cx('rounded-lg px-3 py-2 text-[12px] font-bold',theme==='light'?'bg-brand-surface dark:bg-[#25141a] text-brand-accent shadow-sm':'text-brand-muted')}>Light</button><button type="button" onClick={() => setTheme('dark')} className={cx('rounded-lg px-3 py-2 text-[12px] font-bold',theme==='dark'?'bg-brand-surface dark:bg-[#25141a] text-brand-accent dark:text-[#ff7d8b] shadow-sm':'text-brand-muted')}>Dark</button></div></div>
                    </section>
                  </div>
                  <div className="space-y-6">
                    <section className="rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] p-6 shadow-custom"><span className="font-mono text-[12px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">SECURITY & LOGIN</span><div className="mt-5 space-y-5">
                      <div className="flex items-center justify-between gap-4"><div><p className="text-[15.5px] font-bold text-brand-ink dark:text-[#f8ece9]">Password</p><p className="mt-0.5 text-[13px] text-brand-muted dark:text-[#c2a8a9]">Update your administrator account password.</p></div><button onClick={() => setShowPasswordModal(true)} className="whitespace-nowrap rounded-xl border border-brand-line dark:border-[#3b2328] px-3.5 py-2 text-[12.5px] font-bold text-brand-ink dark:text-[#f8ece9] hover:border-brand-accent">Change Password →</button></div>
                      <div className="flex items-center justify-between gap-4"><div><p className="text-[15.5px] font-bold text-brand-ink dark:text-[#f8ece9]">Two-Factor Authentication</p><p className="mt-0.5 text-[13px] text-brand-muted dark:text-[#c2a8a9]">Add an extra layer of security to your account.</p></div><button type="button" onClick={handleToggle2FA} className={cx('relative h-[30px] w-[52px] rounded-full',is2FAEnabled?'bg-brand-ok dark:bg-[#58cf92]':'bg-brand-line dark:bg-[#3b2328]')}><span className={cx('absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white shadow-sm transition-transform',is2FAEnabled?'translate-x-[22px]':'')}/></button></div>
                    </div></section>
                    <section className="rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] p-6 shadow-custom"><span className="font-mono text-[12px] uppercase tracking-widest text-brand-muted dark:text-[#c2a8a9]">ADMINISTRATOR MANAGEMENT</span><p className="mt-2 text-[13.5px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">Super Admins can assign an existing BloodBuddy account as Admin or Super Admin.</p>{isSuperAdmin?<button onClick={openRoleModal} className="mt-4 rounded-xl bg-brand-btn dark:bg-[#c9253a] px-4 py-2.5 text-[13px] font-bold text-white">Add Administrator →</button>:<p className="mt-4 text-[12.5px] font-bold text-brand-muted dark:text-[#c2a8a9]">Super Admin access is required for role management.</p>}</section>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: AUDIT TRAIL */}
            {activeTab === 'audit' && isSuperAdmin && (
              <section className="animate-[rise_0.3s_ease_both] overflow-hidden rounded-[24px] border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] shadow-custom">
                <div className="flex flex-col gap-3 border-b border-brand-line dark:border-[#3b2328] p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-brand-accent dark:text-[#ff7d8b]">Super Admin Security</span>
                    <h2 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Administrative Audit Trail</h2>
                  </div>
                </div>

                {auditLogs.length ? (
                  <div className="divide-y divide-brand-line dark:divide-[#3b2328]">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start">
                        <div className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-violet-50 dark:bg-[#2a173d] text-violet-700 dark:text-[#c4b5fd] border border-violet-200 dark:border-violet-900/50">
                          ▤
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[13.5px] font-bold uppercase text-brand-ink dark:text-[#f8ece9]">{labelize(log.action)}</span>
                            <Pill tone="purple">{labelize(log.target_entity)}</Pill>
                          </div>
                          <p className="mt-1.5 text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">{log.details || 'No details recorded.'}</p>
                          <p className="mt-1 font-mono text-[11px] text-brand-muted/75 dark:text-[#c2a8a9]/75">Target ID: {log.target_id || '—'}</p>
                        </div>
                        <div className="flex-none text-left sm:text-right">
                          <p className="text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">{log.actor?.full_name || 'Administrator'}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-brand-muted dark:text-[#c2a8a9]">{dateTime(log.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty title="No audit events recorded" text="Administrative actions such as role changes, restrictions, and report resolutions will appear here." />
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      {showEditProfileModal && createPortal(<div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/65" onMouseDown={(e)=>e.target===e.currentTarget&&setShowEditProfileModal(false)}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom dark:border-[#3b2328] dark:bg-[#25141a]"><div className="flex items-start justify-between border-b border-brand-line pb-4 dark:border-[#3b2328]"><div><h3 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Edit Profile</h3><p className="mt-1 text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">Update your administrator profile.</p></div><button onClick={()=>setShowEditProfileModal(false)}>✕</button></div><form onSubmit={handleSaveProfile} className="mt-5 space-y-5"><input value={editFullName} onChange={(e)=>setEditFullName(e.target.value)} required placeholder="Full name" className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 text-[14px] dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]"/><div><p className="mb-2 text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9]">Avatar color</p><div className="flex flex-wrap gap-3">{AVATAR_OPTIONS.map(c=><button key={c} type="button" onClick={()=>setEditAvatarColor(c)} className={cx('h-10 w-10 rounded-full border-2',c,editAvatarColor===c?'border-brand-ink dark:border-white':'border-transparent')}/>)}</div></div><div className="flex justify-end gap-3 border-t border-brand-line pt-5 dark:border-[#3b2328]"><button type="button" onClick={()=>setShowEditProfileModal(false)} className="rounded-xl border border-brand-line px-5 py-2.5 text-[13.5px] font-bold dark:border-[#3b2328]">Cancel</button><button disabled={isSavingProfile} className="rounded-xl bg-brand-btn px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-50">{isSavingProfile?'Saving…':'Save Changes'}</button></div></form></section></div>,document.body)}

      {showPasswordModal && createPortal(<div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/65" onMouseDown={(e)=>e.target===e.currentTarget&&!isSavingPassword&&setShowPasswordModal(false)}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom dark:border-[#3b2328] dark:bg-[#25141a]"><h3 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Change Password</h3><p className="mt-1 text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">Set a new password for your administrator account.</p><form onSubmit={handleSavePassword} className="mt-5 space-y-4"><input type={showPasswordFields?'text':'password'} value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} minLength={8} required placeholder="New password" className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]"/><input type={showPasswordFields?'text':'password'} value={confirmNewPassword} onChange={(e)=>setConfirmNewPassword(e.target.value)} minLength={8} required placeholder="Confirm new password" className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]"/><label className="text-[12.5px] text-brand-muted"><input type="checkbox" checked={showPasswordFields} onChange={(e)=>setShowPasswordFields(e.target.checked)} className="mr-2"/>Show passwords</label><div className="flex justify-end gap-3"><button type="button" onClick={()=>setShowPasswordModal(false)} className="rounded-xl border border-brand-line px-5 py-2.5 font-bold dark:border-[#3b2328]">Cancel</button><button disabled={isSavingPassword} className="rounded-xl bg-brand-btn px-5 py-2.5 font-bold text-white">{isSavingPassword?'Updating…':'Update Password'}</button></div></form></section></div>,document.body)}

      {showMfaModal && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal="true" aria-labelledby="admin-mfa-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !isEnrollingMfa) setShowMfaModal(false); }}>
          <section className="max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom animate-[rise_0.2s_ease_both] dark:border-[#3b2328] dark:bg-[#25141a]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
              <div>
                <h3 id="admin-mfa-modal-title" className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Set Up Two-Factor Authentication</h3>
                <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">{mfaStep === 1 ? 'Use an authenticator app to protect your administrator account.' : 'Scan the QR code, then enter the generated 6-digit code.'}</p>
              </div>
              <button type="button" onClick={() => setShowMfaModal(false)} disabled={isEnrollingMfa} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50" aria-label="Close MFA setup dialog">✕</button>
            </div>

            {mfaStep === 1 ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-brand-line bg-brand-bg p-4 dark:border-[#3b2328] dark:bg-[#150a0c]">
                  <p className="text-[13.5px] text-brand-ink dark:text-[#f8ece9] leading-relaxed">You will receive a QR code from Supabase. Add it to Google Authenticator, Microsoft Authenticator, or another compatible TOTP app, then enter the one-time code to finish enabling MFA.</p>
                </div>
                {mfaError && <p className="text-[12.5px] font-medium text-brand-crimsonHi dark:text-[#f2606f]" role="alert">{mfaError}</p>}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowMfaModal(false)} disabled={isEnrollingMfa} className="rounded-xl border border-brand-line bg-brand-bg px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]">Cancel</button>
                  <button type="button" onClick={startEnrollMfa} disabled={isEnrollingMfa} className="min-w-[140px] rounded-xl bg-brand-btn px-5 py-2.5 text-[14px] font-bold text-brand-onBtn shadow-sm transition disabled:opacity-70 dark:bg-[#c9253a]">{isEnrollingMfa ? 'Preparing…' : 'Start Setup'}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={verifyMfaCode} className="space-y-5">
                <div className="flex justify-center rounded-2xl border border-brand-line bg-white p-4 dark:border-[#3b2328]">
                  {mfaQrCode ? <QRCodeSVG value={mfaQrCode} size={190} includeMargin /> : <div className="grid h-[190px] w-[190px] place-items-center text-sm text-brand-muted">QR code unavailable.</div>}
                </div>
                <div>
                  <p className="mb-2 text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">If you cannot scan the QR code, enter this setup key manually:</p>
                  <div className="flex gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-xl border border-brand-line bg-brand-bg px-3 py-2.5 text-[12px] text-brand-ink dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]">{mfaSecret || 'Secret unavailable'}</code>
                    <button type="button" onClick={handleCopySecret} disabled={!mfaSecret} className="rounded-xl border border-brand-line bg-brand-bg px-3 py-2.5 text-[12.5px] font-bold text-brand-ink dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9] disabled:opacity-50">Copy</button>
                  </div>
                </div>
                <div>
                  <label htmlFor="admin-mfa-code" className="mb-1.5 block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">6-digit authenticator code</label>
                  <input id="admin-mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required autoFocus value={mfaVerifyCode} onChange={(e) => { const value = e.target.value.replace(/\D/g, '').slice(0, 6); setMfaVerifyCode(value); if (mfaError) setMfaError(''); }} disabled={isEnrollingMfa} className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3.5 text-center font-mono text-[18px] tracking-[0.25em] text-brand-ink outline-none transition focus:border-brand-accent dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9] disabled:opacity-60" placeholder="000000" />
                </div>
                {mfaError && <p className="text-[12.5px] font-medium text-brand-crimsonHi dark:text-[#f2606f]" role="alert">{mfaError}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { if (isEnrollingMfa) return; setMfaStep(1); setMfaError(''); setMfaVerifyCode(''); }} disabled={isEnrollingMfa} className="rounded-xl border border-brand-line bg-brand-bg px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]">Back</button>
                  <button type="submit" disabled={isEnrollingMfa || mfaVerifyCode.length !== 6} className="min-w-[150px] rounded-xl bg-brand-btn px-5 py-2.5 text-[14px] font-bold text-brand-onBtn shadow-sm transition disabled:opacity-70 dark:bg-[#c9253a]">{isEnrollingMfa ? 'Verifying…' : 'Verify & Enable'}</button>
                </div>
              </form>
            )}
          </section>
        </div>,
        document.body
      )}

      {showDisableMfaModal && createPortal(<div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/65" onMouseDown={(e)=>e.target===e.currentTarget&&!isDisablingMfa&&setShowDisableMfaModal(false)}><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom dark:border-[#3b2328] dark:bg-[#25141a]"><h3 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Disable 2FA?</h3><p className="mt-2 text-[14px] text-brand-muted dark:text-[#c2a8a9]">This removes the verified authenticator factor from your administrator account.</p><div className="mt-5 rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-800 dark:bg-[#332610] dark:text-[#e8b64d]">Keeping 2FA enabled is strongly recommended for administrators.</div><div className="mt-6 flex justify-end gap-3"><button disabled={isDisablingMfa} onClick={()=>setShowDisableMfaModal(false)} className="rounded-xl border border-brand-line px-5 py-2.5 font-bold dark:border-[#3b2328]">Cancel</button><button disabled={isDisablingMfa} onClick={disableMfa} className="rounded-xl bg-brand-btn px-5 py-2.5 font-bold text-white">{isDisablingMfa?'Disabling…':'Disable 2FA'}</button></div></section></div>,document.body)}

      {showRoleModal && createPortal(<div className="fixed inset-0 z-[10001] flex items-center justify-center bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/65" onMouseDown={(e)=>e.target===e.currentTarget&&!isSavingRole&&setShowRoleModal(false)}><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[24px] border border-brand-line bg-brand-surface p-7 md:p-10 shadow-custom dark:border-[#3b2328] dark:bg-[#25141a]"><div className="flex items-start justify-between border-b border-brand-line pb-4 dark:border-[#3b2328]"><div><h3 className="font-display text-[22px] font-extrabold text-brand-ink dark:text-[#f8ece9]">Add Administrator</h3><p className="mt-1 text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">Assign an administrator role to an existing BloodBuddy account.</p></div><button onClick={()=>setShowRoleModal(false)}>✕</button></div><form onSubmit={saveAdministratorRole} className="mt-5 space-y-4"><select value={roleTargetId} onChange={(e)=>setRoleTargetId(e.target.value)} required className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]"><option value="">Select a community account…</option>{users.filter(u=>u.id!==session.user.id&&u.role!=='super_admin').map(u=><option key={u.id} value={u.id}>{u.full_name||'Unnamed member'} · {u.role||'user'}</option>)}</select><select value={roleTargetRole} onChange={(e)=>setRoleTargetRole(e.target.value)} className="w-full rounded-xl border-[1.5px] border-brand-line bg-brand-bg px-4 py-3 dark:border-[#3b2328] dark:bg-[#150a0c] dark:text-[#f8ece9]"><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select><div className="rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-800 dark:bg-[#332610] dark:text-[#e8b64d]">This changes the existing account's <code>profiles.role</code>. It does not create a new Supabase Auth account.</div><div className="flex justify-end gap-3"><button type="button" onClick={()=>setShowRoleModal(false)} className="rounded-xl border border-brand-line px-5 py-2.5 font-bold dark:border-[#3b2328]">Cancel</button><button disabled={isSavingRole||!roleTargetId} className="rounded-xl bg-brand-btn px-5 py-2.5 font-bold text-white">{isSavingRole?'Saving…':'Assign Role'}</button></div></form></section></div>,document.body)}

      {/* REPORT INSPECTION MODAL */}
      {selectedReport && (
        <Modal
          title="Incident Report Details"
          subtitle={`Submitted on ${dateTime(selectedReport.created_at)}`}
          onClose={() => setSelectedReport(null)}
          wide
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="warn">{labelize(selectedReport.reason)}</Pill>
              <Pill tone={toneForStatus(selectedReport.status)}>{labelize(selectedReport.status || 'pending')}</Pill>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cx('rounded-2xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c]', sidebarCollapsed ? 'p-2' : 'p-4')}>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-[#c2a8a9]">Reporter</p>
                <p className="mt-1 text-[15px] font-bold text-brand-ink dark:text-[#f8ece9]">{selectedReport.reporter?.full_name || 'Unknown'}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-brand-muted dark:text-[#c2a8a9]">{selectedReport.reporter_id || '—'}</p>
              </div>
              <div className={cx('rounded-2xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c]', sidebarCollapsed ? 'p-2' : 'p-4')}>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-[#c2a8a9]">Reported Account</p>
                <p className="mt-1 text-[15px] font-bold text-brand-accent dark:text-[#ff7d8b]">{selectedReport.reported?.full_name || 'Unknown'}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-brand-muted dark:text-[#c2a8a9]">{selectedReport.reported_user_id || '—'}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">Submitted Narrative</p>
              <div className="min-h-24 whitespace-pre-wrap rounded-2xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] p-4 text-[14px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">
                {selectedReport.details || 'No additional details provided.'}
              </div>
            </div>

            {(selectedReport.attachment_url || selectedReport.evidence_url) && (
              <div>
                <a
                  href={selectedReport.attachment_url || selectedReport.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-brand-accent dark:text-[#ff7d8b] underline"
                >
                  Open attached evidence ↗
                </a>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-brand-line dark:border-[#3b2328] pt-5">
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-5 py-2.5 text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9]"
              >
                Close
              </button>
              {!['resolved', 'dismissed'].includes(String(selectedReport.status || '').toLowerCase()) && (
                <>
                  <button
                    disabled={busyId === selectedReport.id}
                    onClick={() => executeReportStatusUpdate(selectedReport, 'dismissed')}
                    className="rounded-xl bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/25 px-5 py-2.5 text-[13.5px] font-bold text-brand-accent dark:text-[#ff7d8b] disabled:opacity-50"
                  >
                    Dismiss Report
                  </button>
                  <button
                    disabled={busyId === selectedReport.id}
                    onClick={() => executeReportStatusUpdate(selectedReport, 'resolved')}
                    className="rounded-xl bg-brand-ok dark:bg-[#58cf92] px-5 py-2.5 text-[13.5px] font-bold text-white dark:text-[#173326] disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* CUSTOM CONFIRMATION MODAL (Replaces native window.confirm per DoD) */}
      {confirmDialog && (
        <Modal title={confirmDialog.title} subtitle={confirmDialog.subtitle} onClose={() => setConfirmDialog(null)}>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setConfirmDialog(null)}
              className="rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-5 py-2.5 text-[13.5px] font-bold text-brand-ink dark:text-[#f8ece9]"
            >
              Cancel
            </button>
            <button
              onClick={confirmDialog.onConfirm}
              className={cx(
                'rounded-xl px-5 py-2.5 text-[13.5px] font-bold text-white shadow-sm transition',
                confirmDialog.tone === 'good'
                  ? 'bg-brand-ok dark:bg-[#58cf92] dark:text-[#173326]'
                  : 'bg-brand-btn dark:bg-[#c9253a]'
              )}
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}