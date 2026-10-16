import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth({ onSessionChange }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clearStatus = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    clearStatus();
    setLoading(true);

    try {
      if (isForgotPassword) {
        // Defined password recovery flow (US-01)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMessage('Password reset instructions have been sent to your email.');
      } else if (isLogin) {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (onSessionChange) onSessionChange(data.session);
      } else {
        // Sign up with generalized account identity (US-01)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        setSuccessMessage('Registration successful! Please check your email to confirm your account.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blood-600 tracking-tight">BloodBuddy</h1>
          <p className="text-sm text-slate-500 mt-1">Every Drop Counts</p>
          <h2 className="text-xl font-semibold text-slate-800 mt-4">
            {isForgotPassword 
              ? 'Reset Password' 
              : isLogin 
                ? 'Welcome Back' 
                : 'Create an Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isForgotPassword
              ? 'Enter your registered email to receive a recovery link.'
              : isLogin
                ? 'Sign in to coordinate donations or submit requests.'
                : 'One general account for community donors and requesters.'}
          </p>
        </div>

        {/* Status Alerts (Custom UI, no window.alert) */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs leading-relaxed">
            {successMessage}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && !isForgotPassword && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blood-500 focus:border-transparent transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blood-500 focus:border-transparent transition"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blood-500 focus:border-transparent transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blood-600 hover:bg-blood-700 text-white font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-50 mt-2"
          >
            {loading 
              ? 'Processing...' 
              : isForgotPassword 
                ? 'Send Recovery Link' 
                : isLogin 
                  ? 'Sign In' 
                  : 'Register Account'}
          </button>
        </form>

        {/* Mode Toggles */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center space-y-2 text-xs text-slate-600">
          {!isForgotPassword ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  clearStatus();
                }}
                className="text-blood-600 hover:text-blood-700 font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    clearStatus();
                  }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  Forgot password?
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                clearStatus();
              }}
              className="text-blood-600 hover:text-blood-700 font-medium"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}