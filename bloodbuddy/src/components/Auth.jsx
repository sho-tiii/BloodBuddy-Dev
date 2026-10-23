import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "Not provided / I don't know"];
const OTP_LENGTH = 8; 
const MFA_LENGTH = 6; 

export default function Auth({ onSessionChange, defaultIsLogin = true, selectedDonor = null, showToast }) {
  const [view, setView] = useState(defaultIsLogin ? 'login' : 'register');
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Advanced OTP States
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(''));
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Advanced MFA States
  const [mfaValues, setMfaValues] = useState(Array(MFA_LENGTH).fill(''));
  const [mfaFactorId, setMfaFactorId] = useState('');
  const mfaRefs = useRef([]);

  useEffect(() => {
    let timerInterval;
    if (view === 'verify_otp') {
      timerInterval = setInterval(() => {
        setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [view]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const switchView = (v) => {
    setView(v);
    setConfirmPassword(''); 
    
    if (v === 'verify_otp') {
      setOtpValues(Array(OTP_LENGTH).fill(''));
      setOtpAttempts(0);
      setExpiresIn(300); 
      setResendCooldown(60); 
    }

    if (v === 'verify_mfa') {
       setMfaValues(Array(MFA_LENGTH).fill(''));
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/[^a-zA-Z0-9]/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = cleanVal;
    setOtpValues(newOtp);

    if (cleanVal && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^a-zA-Z0-9]/g, '').slice(0, OTP_LENGTH);
    if (pastedData) {
      const newOtp = [...otpValues];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtpValues(newOtp);
      const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
      otpRefs.current[focusIndex]?.focus();
    }
  };

  const handleMfaChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '').slice(-1); 
    const newMfa = [...mfaValues];
    newMfa[index] = cleanVal;
    setMfaValues(newMfa);

    if (cleanVal && index < MFA_LENGTH - 1) {
      mfaRefs.current[index + 1]?.focus();
    }
  };

  const handleMfaKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !mfaValues[index] && index > 0) {
      mfaRefs.current[index - 1]?.focus();
    }
  };

  const handleMfaPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '').slice(0, MFA_LENGTH);
    if (pastedData) {
      const newMfa = [...mfaValues];
      for (let i = 0; i < pastedData.length; i++) {
        newMfa[i] = pastedData[i];
      }
      setMfaValues(newMfa);
      const focusIndex = Math.min(pastedData.length, MFA_LENGTH - 1);
      mfaRefs.current[focusIndex]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
      if(showToast) showToast('If registered, a new 8-digit OTP has been sent.', 'success');
      setOtpValues(Array(OTP_LENGTH).fill(''));
      setOtpAttempts(0);
      setExpiresIn(300); 
      setResendCooldown(60); 
    } catch (err) {
      if(showToast) showToast(err.message || 'Failed to resend OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalData && aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const totpFactor = factorsData?.all?.find(f => f.factor_type === 'totp' && f.status === 'verified');
          
          if (totpFactor) {
            setMfaFactorId(totpFactor.id);
            switchView('verify_mfa');
            setLoading(false);
            return; 
          }
        }

        if (onSessionChange) onSessionChange(data.session);

      } else if (view === 'register') {
        const nameRegex = /^[A-Za-zñÑ\s\-]+$/;
        if (firstName.trim().length < 2 || !nameRegex.test(firstName.trim())) {
          throw new Error('Please enter a valid First Name (letters only, minimum 2 characters).');
        }
        if (lastName.trim().length < 2 || !nameRegex.test(lastName.trim())) {
          throw new Error('Please enter a valid Last Name (letters only, minimum 2 characters).');
        }
        if (/(.)\1{2,}/.test(firstName.trim()) || /(.)\1{2,}/.test(lastName.trim())) {
          throw new Error('Please enter a valid name. Meaningless repeated characters are not allowed.');
        }
        if (password !== confirmPassword) throw new Error('Passwords do not match. Please ensure both fields are identical.');
        if (!termsAccepted) throw new Error('You must agree to the community platform terms.');
        
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin, 
            data: {
              full_name: fullName,
              blood_type: bloodType || "Not provided / I don't know"
            }
          }
        });
        if (signUpError) throw signUpError;
        
        if(showToast) showToast('Registration successful! Please check your email for the verification link.', 'success');
        switchView('login');

      } else if (view === 'forgot_password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin 
        });
        if (resetError) throw resetError;
        if(showToast) showToast('If your email is registered, an 8-digit OTP has been sent to it.', 'info');
        switchView('verify_otp');

      } else if (view === 'verify_otp') {
        const tokenString = otpValues.join('');
        if (tokenString.length < OTP_LENGTH) throw new Error('Please enter the complete 8-digit code.');
        if (expiresIn === 0) throw new Error('The OTP has expired. Please request a new one.');
        if (otpAttempts >= 3) throw new Error('Maximum verification attempts reached. Please resend a new OTP.');

        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: tokenString,
          type: 'recovery'
        });

        if (verifyError) {
          const newAttempts = otpAttempts + 1;
          setOtpAttempts(newAttempts);
          throw new Error(`Invalid code. You have ${3 - newAttempts} attempt(s) remaining.`);
        }
        
        switchView('update_password');

      } else if (view === 'verify_mfa') {
        const codeString = mfaValues.join('');
        if (codeString.length < MFA_LENGTH) throw new Error('Please enter the complete 6-digit code.');

        const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
        if (challenge.error) throw challenge.error;

        const verify = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challenge.data.id,
          code: codeString
        });
        
        if (verify.error) throw new Error('Invalid authenticator code. Please try again.');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (onSessionChange) onSessionChange(session);

      } else if (view === 'update_password') {
        if (password !== confirmPassword) throw new Error('Passwords do not match. Please ensure both fields are identical.');

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        
        if(showToast) showToast('Password updated successfully! You are now logged in.', 'success');
        setTimeout(() => {
          if (onSessionChange) {
             supabase.auth.getSession().then(({ data }) => onSessionChange(data.session));
          }
        }, 1500);
      }
    } catch (err) {
      if(showToast) showToast(err.message || 'An error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };
  const pwScore = getPasswordStrength(password);

  const MailIcon = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
  const LockIcon = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  const UserIcon = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  const EyeIcon = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  const EyeOffIcon = () => <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
  
  const headings = {
    login: { title: 'Sign in to BloodBuddy', sub: 'Access your blood requests, donation coordination, and settings.' },
    register: { title: 'Create a BloodBuddy Account', sub: 'One account connects you to request blood when needed or volunteer to donate when able.' },
    forgot_password: { title: 'Reset Your Password', sub: 'Enter your email address to receive an 8-digit verification code.' },
    verify_otp: { title: 'Verify Email', sub: 'If registered, we sent an 8-digit code to your email. Enter it below.' },
    verify_mfa: { title: 'Two-Factor Authentication', sub: 'Enter the 6-digit code from your authenticator app to log in.' },
    update_password: { title: 'Set New Password', sub: 'Create a new, strong password to secure your account.' }
  };

  const renderDonorBanners = () => {
    if (!selectedDonor || view !== 'login') return null;
    return (
      <div className="mb-7 space-y-3.5">
        <div className="bg-[#fdf3f4] dark:bg-[#3a1a20] border border-[#f4c8cb] dark:border-[#6f0818] rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#d42b3a] dark:text-[#ff7d8b] mt-0.5 flex-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-[13.5px] text-[#7a0d1a] dark:text-[#f8ece9] leading-snug">
            Please sign in or create an account to request blood from this volunteer (<strong>Blood Type {selectedDonor.blood_type}</strong> in {selectedDonor.city}).
          </p>
        </div>
        <div className="bg-[#f0f9f4] dark:bg-[#173326] border border-[#cceadc] dark:border-[#1d7a4b] rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#1d7a4b] dark:text-[#58cf92] mt-0.5 flex-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/><circle cx="12" cy="12" r="10" strokeWidth="2"/></svg>
          <div>
            <p className="text-[14px] font-bold text-[#115a35] dark:text-[#58cf92]">Donor Selected</p>
            <p className="text-[13px] text-[#1a7346] dark:text-[#dff3e8] leading-snug mt-1">
              Signing in will continue your blood request for <strong>Blood Type {selectedDonor.blood_type}</strong> in {selectedDonor.city}.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-brand-surface dark:bg-[#25141a] rounded-[24px] p-7 md:p-10 w-full shadow-custom border border-brand-line dark:border-[#3b2328] relative font-body transition-colors duration-300 max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
      
      <div className="w-[52px] h-[52px] bg-brand-blush dark:bg-[#3a1a20] rounded-full mx-auto flex items-center justify-center text-brand-accent dark:text-[#ff7d8b] mb-5">
        <svg viewBox="0 0 30 34" className="w-5 h-5"><path d="M15 1C15 1 2 15 2 22.5a13 13 0 0 0 26 0C28 15 15 1 15 1Z" fill="currentColor"/></svg>
      </div>

      <h2 className="font-display font-extrabold text-[28px] md:text-[32px] text-center text-brand-ink dark:text-[#f8ece9] tracking-tight leading-tight">
        {headings[view]?.title}
      </h2>
      <p className="text-[14px] text-center text-brand-muted dark:text-[#c2a8a9] mt-2.5 mb-7 max-w-[22em] mx-auto leading-relaxed">
        {headings[view]?.sub}
      </p>

      {renderDonorBanners()}

      <form onSubmit={handleAuth} className="space-y-4">
        {view === 'register' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">First Name <span className="text-brand-accent dark:text-[#ff7d8b]">*</span></label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9]"><UserIcon /></div>
                <input type="text" required maxLength={50} value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="e.g. Maria" className="w-full bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl pl-11 pr-4 py-3 text-[15px] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Last Name <span className="text-brand-accent dark:text-[#ff7d8b]">*</span></label>
              <input type="text" required maxLength={50} value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="e.g. Santos" className="w-full bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl px-4 py-3 text-[15px] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all" />
            </div>
          </div>
        )}

        {(view === 'login' || view === 'register' || view === 'forgot_password') && (
          <div>
            <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Email Address {view==='register'&&<span className="text-brand-accent dark:text-[#ff7d8b]">*</span>}</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9]"><MailIcon /></div>
              <input type="email" required maxLength={100} value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl pl-11 pr-4 py-3 text-[15px] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all" />
            </div>
          </div>
        )}

        {view === 'verify_otp' && (
          <div className="mb-2">
            <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-2.5">8-Digit OTP Code</label>
            <div className="flex justify-between gap-1.5 sm:gap-2 w-full" onPaste={handleOtpPaste}>
              {otpValues.map((val, index) => (
                <input
                  key={index}
                  ref={(el) => (otpRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  disabled={otpAttempts >= 3 || expiresIn === 0}
                  className="w-full h-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all disabled:opacity-50 uppercase"
                />
              ))}
            </div>
            
            <div className="mt-5 text-center flex flex-col items-center gap-1.5">
              {expiresIn > 0 && otpAttempts < 3 ? (
                <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] font-medium">
                  Code expires in <span className="font-bold text-brand-accent dark:text-[#ff7d8b]">{formatTime(expiresIn)}</span>
                </p>
              ) : (
                <p className="text-[13px] font-bold text-brand-crimsonHi dark:text-[#f2606f]">
                  {otpAttempts >= 3 ? "Maximum attempts reached." : "Code expired."}
                </p>
              )}
              
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline disabled:opacity-50 disabled:no-underline transition"
              >
                {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Didn't receive OTP? Resend"}
              </button>
            </div>
          </div>
        )}

        {view === 'verify_mfa' && (
          <div className="mb-2">
            <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-2.5">6-Digit Authenticator Code</label>
            <div className="flex justify-between gap-1.5 sm:gap-2 w-full" onPaste={handleMfaPaste}>
              {mfaValues.map((val, index) => (
                <input
                  key={index}
                  ref={(el) => (mfaRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleMfaChange(index, e.target.value)}
                  onKeyDown={(e) => handleMfaKeyDown(index, e)}
                  className="w-full h-12 sm:h-14 text-center text-lg sm:text-xl font-bold bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all"
                />
              ))}
            </div>
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-[13px] font-bold text-brand-muted hover:text-brand-ink transition"
              >
                Cancel and return to login
              </button>
            </div>
          </div>
        )}

        {(view === 'login' || view === 'register' || view === 'update_password') && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">
                  {view === 'update_password' ? 'New Password' : 'Password'} {view==='register'&&<span className="text-brand-accent dark:text-[#ff7d8b]">*</span>}
                </label>
                {view === 'login' && (
                  <button type="button" onClick={() => switchView('forgot_password')} className="text-[13px] font-semibold text-brand-accent dark:text-[#ff7d8b] hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9]"><LockIcon /></div>
                <input type={showPassword ? "text" : "password"} required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={view === 'register' || view === 'update_password' ? "Create a strong password" : "Enter password"} className="w-full bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl pl-11 pr-11 py-3 text-[15px] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9] transition">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {(view === 'register' || view === 'update_password') && password.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 animate-[rise_0.2s_ease_both]">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${pwScore >= 1 ? (pwScore < 3 ? 'bg-[#f2606f]' : pwScore < 4 ? 'bg-[#e8b64d]' : 'bg-[#58cf92]') : 'bg-brand-line dark:bg-[#3b2328]'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${pwScore >= 3 ? (pwScore < 4 ? 'bg-[#e8b64d]' : 'bg-[#58cf92]') : 'bg-brand-line dark:bg-[#3b2328]'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${pwScore >= 4 ? 'bg-[#58cf92]' : 'bg-brand-line dark:bg-[#3b2328]'}`}></div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-[#c2a8a9] ml-1 w-12">
                    {pwScore < 3 ? 'Weak' : pwScore < 4 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD INPUT (Visible only for Register and Update Password) */}
            {(view === 'register' || view === 'update_password') && (
              <div>
                <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">
                  Confirm Password <span className="text-brand-accent dark:text-[#ff7d8b]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9]"><LockIcon /></div>
                  <input type={showConfirmPassword ? "text" : "password"} required maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm your password" className="w-full bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl pl-11 pr-11 py-3 text-[15px] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9] transition">
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'register' && (
          <div>
            <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Self-Reported Blood Type</label>
            <select value={bloodType} onChange={e=>setBloodType(e.target.value)} className="w-full bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl px-4 py-3 text-[15px] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:shadow-[0_0_0_4px_rgba(164,18,31,0.18)] dark:focus:shadow-[0_0_0_4px_rgba(255,125,139,0.18)] transition-all appearance-none bg-no-repeat bg-[right_16px_center]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1.5 7 7.5l6-6' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")` }}>
              <option value="">Blood Type (Optional)</option>
              {BLOOD_TYPES.map(t => <option key={t} value={t}>{t.replace('-', '−')}</option>)}
            </select>
            <p className="text-[12px] text-brand-muted dark:text-[#c2a8a9] mt-1.5 leading-relaxed">Self-reported for community matching. Hospital conducts clinical crossmatching.</p>
          </div>
        )}

        {view === 'register' && (
          <div className="mt-5 flex items-start gap-3 bg-brand-bg2 dark:bg-[#1e1013] p-4 rounded-xl border border-brand-line dark:border-[#3b2328]">
            <input type="checkbox" id="terms" required checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-0.5 w-[18px] h-[18px] rounded border-brand-line text-brand-accent focus:ring-brand-accent cursor-pointer flex-none" />
            <label htmlFor="terms" className="text-[13px] text-brand-ink dark:text-[#f8ece9] leading-relaxed cursor-pointer">
              I understand BloodBuddy is a community coordination platform and does not certify blood types or clinical safety. All testing happens at the healthcare facility.
            </label>
          </div>
        )}

        {view === 'login' && (
          <div className="flex items-center gap-2.5 mt-2">
            <input type="checkbox" id="remember" className="w-[18px] h-[18px] rounded border-brand-line text-brand-accent focus:ring-brand-accent cursor-pointer" />
            <label htmlFor="remember" className="text-[14px] text-brand-muted dark:text-[#c2a8a9] cursor-pointer">Remember me</label>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || (view === 'verify_otp' && (otpAttempts >= 3 || expiresIn === 0))} 
          className="w-full mt-4 bg-brand-btn dark:bg-[#c9253a] text-white font-bold text-[15.5px] py-4 rounded-xl shadow-[0_8px_20px_-10px_#a4121f] dark:shadow-[0_8px_20px_-10px_#c9253a] hover:bg-brand-btnHover dark:hover:bg-[#e03349] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Processing...' : (
            <>
              {view === 'login' && 'Log In'}
              {view === 'register' && 'Create Account & Verify Email'}
              {view === 'forgot_password' && 'Send Recovery Code'}
              {view === 'verify_otp' && 'Verify OTP Code'}
              {view === 'verify_mfa' && 'Verify Authenticator'}
              {view === 'update_password' && 'Update Password & Log In'}
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-brand-line dark:border-[#3b2328] text-center text-[14px] text-brand-muted dark:text-[#c2a8a9]">
        {view === 'login' && (
          <p>Don't have a BloodBuddy account yet? <br className="sm:hidden" /> <button type="button" onClick={() => switchView('register')} className="font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline mt-1 sm:mt-0">Create Account / Register</button></p>
        )}
        {(view === 'register' || view === 'forgot_password' || view === 'verify_otp' || view === 'update_password' || view === 'verify_mfa') && (
          <p>
            {view === 'register' ? 'Already registered on BloodBuddy?' : 'Remembered your password?'} <br className="sm:hidden" /> 
            <button type="button" onClick={() => switchView('login')} className="font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline mt-1 sm:mt-0">Sign in</button>
          </p>
        )}
      </div>
    </div>
  );
}