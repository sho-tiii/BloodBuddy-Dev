import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAdminRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAdminRole(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
    setLoading(false);
    if (data && (data.role === 'admin' || data.role === 'super_admin')) {
      loadAdminData(data.role);
    }
  };

  const loadAdminData = async (role) => {
    const { data: repData } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(full_name), reported:reported_user_id(full_name)')
      .order('created_at', { ascending: false });
    setReports(repData || []);

    const { data: usrData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(usrData || []);

    const { data: reqData } = await supabase
      .from('blood_requests')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    setRequests(reqData || []);

    if (role === 'super_admin') {
      const { data: logData } = await supabase
        .from('audit_logs')
        .select('*, actor:actor_id(full_name)')
        .order('created_at', { ascending: false });
      setAuditLogs(logData || []);
    }
  };

  const logAuditAction = async (action, entity, targetId, details) => {
    await supabase.from('audit_logs').insert([
      {
        actor_id: session.user.id,
        action,
        target_entity: entity,
        target_id: targetId,
        details,
      },
    ]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      checkAdminRole(data.user.id);
    }
  };

  const toggleUserRestriction = async (targetUser) => {
    const newStatus = !targetUser.is_restricted;
    const { error } = await supabase
      .from('profiles')
      .update({ is_restricted: newStatus })
      .eq('id', targetUser.id);

    if (!error) {
      await logAuditAction(
        newStatus ? 'RESTRICT_USER' : 'REACTIVATE_USER',
        'profiles',
        targetUser.id,
        `Set restricted status to ${newStatus}`
      );
      setStatusMsg(`User ${targetUser.full_name} is now ${newStatus ? 'Restricted' : 'Active'}.`);
      loadAdminData(profile.role);
    }
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (profile.role !== 'super_admin') return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUser.id);

    if (!error) {
      await logAuditAction('CHANGE_ROLE', 'profiles', targetUser.id, `Promoted to ${newRole}`);
      setStatusMsg(`Role for ${targetUser.full_name} updated to ${newRole}.`);
      loadAdminData(profile.role);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm">
        Verifying Administrative Credentials...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-white tracking-wide">BloodBuddy Portal</h1>
            <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">
              Authorized Personnel Only
            </p>
          </div>
          {authError && (
            <div className="p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-200 text-xs">
              {authError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Staff Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="admin@bloodbuddy.org"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition shadow-md"
            >
              Authenticate Portal Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (profile && profile.role !== 'admin' && profile.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-red-800/60 rounded-xl p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-red-400">Access Denied</h2>
          <p className="text-xs text-slate-300">Your account does not possess Administrative credentials.</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-600 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-black text-sm">BB</div>
          <div>
            <h1 className="text-base font-bold tracking-tight">BloodBuddy Administrative Portal</h1>
            <p className="text-[11px] text-slate-400">
              Role: <span className="text-rose-400 font-bold uppercase">{profile?.role}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-300 hidden sm:inline">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-6 flex space-x-4">
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'reports' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Reports & Moderation ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'users' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Community Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'requests' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Blood Requests ({requests.length})
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'audit' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🔒 Super Admin Audit Logs ({auditLogs.length})
          </button>
        )}
      </div>

      <main className="max-w-6xl w-full mx-auto p-6 flex-1 space-y-4">
        {statusMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} className="font-bold">✕</button>
          </div>
        )}

        {/* Tab 1: Reports */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Incident & No-Show Moderation Signals</h2>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No reports filed.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        Reporter: <strong>{rep.reporter?.full_name}</strong> → Reported Subject:{' '}
                        <strong className="text-rose-700">{rep.reported?.full_name}</strong>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {rep.reason}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 italic">
                      "{rep.details}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Users (with ID Verification Status Column) */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Registered Accounts & Identity Status</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="py-2.5">User</th>
                    <th>Blood Type</th>
                    <th>ID Status</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const idState = u.id_verification_status || 'not_submitted';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-800">{u.full_name}</td>
                        <td>{u.blood_type}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            idState === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : idState === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : idState === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {idState === 'not_submitted' ? 'Not Started' : idState}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.is_restricted ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {u.is_restricted ? 'Restricted' : 'Active'}
                          </span>
                        </td>
                        <td className="text-right space-x-2">
                          <button
                            onClick={() => toggleUserRestriction(u)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                              u.is_restricted ? 'bg-emerald-600 text-white' : 'bg-red-50 text-red-600 border border-red-200'
                            }`}
                          >
                            {u.is_restricted ? 'Reactivate' : 'Restrict'}
                          </button>
                          {isSuperAdmin && u.id !== session.user.id && (
                            <button
                              onClick={() => handleRoleChange(u, u.role === 'admin' ? 'user' : 'admin')}
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-800 text-white"
                            >
                              {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Requests */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Platform Blood Requests</h2>
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <strong>{req.patient_name}</strong> ({req.blood_type}) — {req.hospital_name}
                    <p className="text-[10px] text-slate-400">Created by: {req.profiles?.full_name}</p>
                  </div>
                  <span className="px-2 py-1 bg-slate-100 rounded font-semibold text-slate-700 uppercase text-[10px]">
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && isSuperAdmin && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Administrative Audit Trail</h2>
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No actions logged yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-xs flex justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{log.action}</span> on <span className="font-semibold text-rose-600">{log.target_entity}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      <div>Actor: {log.actor?.full_name || 'System'}</div>
                      <div>{new Date(log.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}