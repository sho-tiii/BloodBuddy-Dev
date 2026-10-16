import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import CoordinationChat from './components/CoordinationChat';
import ReportModal from './components/ReportModal';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "Not provided / I don't know"];
const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initialIsLogin, setInitialIsLogin] = useState(true);

  // Search & Match
  const [searchBloodType, setSearchBloodType] = useState('All');
  const [searchCity, setSearchCity] = useState('');
  const [donors, setDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);

  // Didit Verification State
  const [verifyingId, setVerifyingId] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Readiness Modal
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [readinessAnswers, setReadinessAnswers] = useState({
    wellRested: false,
    noFever: false,
    noRecentTattoo: false,
    understandsDisclaimer: false
  });
  const [readinessError, setReadinessError] = useState('');

  // Requests
  const [requests, setRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myCreatedRequests, setMyCreatedRequests] = useState([]);
  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [reportingTarget, setReportingTarget] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [notification, setNotification] = useState('');

  const [newRequest, setNewRequest] = useState({
    patient_name: '',
    is_for_self: true,
    blood_type: 'O+',
    hospital_name: '',
    city: 'North Caloocan',
    contact_number: '',
    urgency_notes: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
        setShowAuthModal(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchDonors();
      fetchRequests();
      fetchIncomingRequests();
      fetchMyCreatedRequests();
    }
  }, [session, searchBloodType, searchCity]);

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const fetchDonors = async () => {
    setLoadingDonors(true);
    let query = supabase
      .from('profiles')
      .select('id, full_name, blood_type, city, is_available_donor, id_verification_status')
      .eq('is_available_donor', true)
      .eq('id_verification_status', 'verified')
      .neq('blood_type', "Not provided / I don't know");

    if (searchBloodType !== 'All') {
      query = query.eq('blood_type', searchBloodType);
    }
    if (searchCity.trim()) {
      query = query.ilike('city', `%${searchCity.trim()}%`);
    }

    const { data } = await query;
    setDonors(data || []);
    setLoadingDonors(false);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(full_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  const fetchIncomingRequests = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('blood_requests')
      .select('*, profiles:requester_id(id, full_name)')
      .eq('selected_donor_id', session.user.id)
      .order('created_at', { ascending: false });
    setIncomingRequests(data || []);
  };

  const fetchMyCreatedRequests = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('blood_requests')
      .select('*, donor:selected_donor_id(id, full_name)')
      .eq('requester_id', session.user.id)
      .order('created_at', { ascending: false });
    setMyCreatedRequests(data || []);
  };

  // Requirement: Didit Verification Trigger
  const handleStartDiditVerification = async () => {
    setVerificationError('');
    setVerifyingId(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/didit/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start verification session');

      window.location.href = result.url;
    } catch (err) {
      setVerificationError(err.message);
    } finally {
      setVerifyingId(false);
    }
  };

  // Requirement: Guard bago maging Available Donor
  const handleAvailabilityClick = () => {
    if (!profile) return;

    if (!profile.is_available_donor) {
      if (profile.id_verification_status !== 'verified') {
        setNotification('Identity Verification Required: You must verify your ID with Didit before activating donor availability.');
        return;
      }

      setReadinessAnswers({
        wellRested: false,
        noFever: false,
        noRecentTattoo: false,
        understandsDisclaimer: false
      });
      setReadinessError('');
      setShowReadinessModal(true);
    } else {
      updateAvailabilityStatus(false);
    }
  };

  const updateAvailabilityStatus = async (status, readinessPassed = false) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_available_donor: status,
        readiness_passed: readinessPassed
      })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, is_available_donor: status, readiness_passed: readinessPassed });
      setShowReadinessModal(false);
      fetchDonors();
    }
  };

  const submitReadinessAssessment = (e) => {
    e.preventDefault();
    const allChecked = Object.values(readinessAnswers).every(Boolean);
    if (!allChecked) {
      setReadinessError('Please confirm all assessment requirements and the healthcare disclaimer.');
      return;
    }
    updateAvailabilityStatus(true, true);
  };

  const handleBloodTypeChange = async (newType) => {
    const { error } = await supabase
      .from('profiles')
      .update({ blood_type: newType })
      .eq('id', profile.id);

    if (!error) setProfile({ ...profile, blood_type: newType });
  };

  const handleDonorResponse = async (requestId, decision) => {
    const { error } = await supabase
      .from('blood_requests')
      .update({
        donor_response: decision,
        status: decision === 'accepted' ? 'matched' : 'open'
      })
      .eq('id', requestId);

    if (!error) {
      fetchIncomingRequests();
      fetchRequests();
    }
  };

  const handleMarkFulfilled = async (requestId) => {
    const { error } = await supabase
      .from('blood_requests')
      .update({ requester_fulfilled: true, status: 'fulfilled' })
      .eq('id', requestId);

    if (!error) {
      setNotification('Request marked as Fulfilled.');
      fetchMyCreatedRequests();
      fetchRequests();
    }
  };

  const handleDonorOutcome = async (requestId, outcome) => {
    const { error } = await supabase
      .from('blood_requests')
      .update({ donor_donation_status: outcome })
      .eq('id', requestId);

    if (!error) {
      setNotification(`Donation recorded: ${outcome === 'completed' ? 'Completed' : 'Did Not Donate'}.`);
      fetchIncomingRequests();
    }
  };

  const handleSearchBloodTypeChange = (e) => {
    const newType = e.target.value;
    setSearchBloodType(newType);
    if (selectedDonor) setSelectedDonor(null);
  };

  const initiateRequestWithDonor = (donor) => {
    setSelectedDonor(donor);
    setNewRequest(prev => ({
      ...prev,
      blood_type: donor.blood_type,
      city: donor.city || 'North Caloocan'
    }));
    setShowRequestModal(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('blood_requests').insert([
      {
        requester_id: session.user.id,
        selected_donor_id: selectedDonor ? selectedDonor.id : null,
        ...newRequest
      }
    ]);

    if (!error) {
      setShowRequestModal(false);
      setSelectedDonor(null);
      setNewRequest({
        patient_name: '',
        is_for_self: true,
        blood_type: 'O+',
        hospital_name: '',
        city: 'North Caloocan',
        contact_number: '',
        urgency_notes: ''
      });
      fetchRequests();
      fetchMyCreatedRequests();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Loading BloodBuddy...</div>;
  }

  if (!session) {
    return (
      <>
        <LandingPage
          onOpenAuth={(isLogin = true) => {
            setInitialIsLogin(isLogin);
            setShowAuthModal(true);
          }}
          onSearch={({ bloodType, city }) => {
            setSearchBloodType(bloodType);
            setSearchCity(city);
          }}
        />
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
              <Auth defaultIsLogin={initialIsLogin} onSessionChange={setSession} />
            </div>
          </div>
        )}
      </>
    );
  }

  const idStatus = profile?.id_verification_status || 'not_submitted';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blood-600 flex items-center justify-center text-white font-black text-lg">B</div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">BloodBuddy</h1>
            <p className="text-[11px] text-slate-500 font-medium">Community Blood Matching</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{profile?.full_name || session.user.email}</p>
            <p className="text-[11px] text-slate-500">Blood Type: <span className="font-bold text-blood-600">{profile?.blood_type || 'Unknown'}</span></p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {notification && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
            <span>{notification}</span>
            <button onClick={() => setNotification('')} className="font-bold text-amber-600 ml-4">✕</button>
          </div>
        )}

        {/* IDENTITY VERIFICATION CARD (Didit Integration) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-base">🛡️</span>
              <h2 className="text-sm font-bold text-slate-900">Donor Identity Verification</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                idStatus === 'verified'
                  ? 'bg-emerald-100 text-emerald-800'
                  : idStatus === 'pending'
                  ? 'bg-amber-100 text-amber-800'
                  : idStatus === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {idStatus === 'not_submitted' ? 'Not Started' : idStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              To safeguard the community, donors must complete identity verification via Didit before broadcasting availability.
              {idStatus === 'verified' && profile?.id_verified_at && (
                <span className="text-emerald-700 block mt-0.5">
                  ✓ Verified on {new Date(profile.id_verified_at).toLocaleDateString()}
                </span>
              )}
            </p>
            {verificationError && (
              <p className="text-xs text-red-600 mt-1">{verificationError}</p>
            )}
          </div>

          <div>
            {idStatus !== 'verified' ? (
              <button
                onClick={handleStartDiditVerification}
                disabled={verifyingId}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {verifyingId ? 'Preparing Session...' : idStatus === 'rejected' ? 'Retry Verification with Didit' : 'Verify ID with Didit'}
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                ✓ Identity Confirmed
              </span>
            )}
          </div>
        </div>

        {/* Donor Availability Switch */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Your Blood Type</span>
            <select
              value={profile?.blood_type || "Not provided / I don't know"}
              onChange={(e) => handleBloodTypeChange(e.target.value)}
              className="block mt-1 text-sm font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-blood-500 focus:outline-none"
            >
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700">Donor Availability</p>
              <p className="text-[11px] text-slate-400">Broadcast readiness to donate</p>
            </div>
            <button
              onClick={handleAvailabilityClick}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm ${
                profile?.is_available_donor 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {profile?.is_available_donor ? '✓ Available to Donate' : 'Inactive / Unavailable'}
            </button>
          </div>
        </div>

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-blood-200 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-xs sm:text-sm font-bold text-blood-700 flex items-center space-x-2">
                <span>🔔</span>
                <span>Direct Requests For You</span>
              </h2>
            </div>
            <div className="space-y-3 pt-1">
              {incomingRequests.map((req) => (
                <div key={req.id} className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-blood-600 text-white rounded">{req.blood_type}</span>
                      <p className="text-xs font-bold text-slate-900">Patient: {req.patient_name}</p>
                      <span className="text-[11px] text-slate-400">by {req.profiles?.full_name || 'Requester'}</span>
                    </div>
                    <p className="text-xs text-slate-600">📍 {req.hospital_name} • {req.city}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {req.donor_response === 'pending' ? (
                      <>
                        <button onClick={() => handleDonorResponse(req.id, 'declined')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100">Decline</button>
                        <button onClick={() => handleDonorResponse(req.id, 'accepted')} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">Accept Request</button>
                      </>
                    ) : req.donor_response === 'accepted' ? (
                      <>
                        <button onClick={() => setActiveChatRequest(req)} className="px-3 py-1.5 text-xs font-semibold text-white bg-blood-600 hover:bg-blood-700 rounded-lg shadow-sm flex items-center space-x-1"><span>💬</span><span>Chat</span></button>
                        {req.donor_donation_status === 'pending' && (
                          <>
                            <button onClick={() => handleDonorOutcome(req.id, 'completed')} className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg">✓ Donation Completed</button>
                            <button onClick={() => handleDonorOutcome(req.id, 'did_not_donate')} className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg">✕ Did Not Donate</button>
                          </>
                        )}
                        <button onClick={() => setReportingTarget({ request: req, targetUser: req.profiles })} className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 rounded-lg">⚠️ Report</button>
                      </>
                    ) : (
                      <span className="px-3 py-1 text-xs font-bold text-slate-500 bg-slate-200 rounded-lg">Declined</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created Requests */}
        {myCreatedRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>📋</span>
              <span>Your Posted Blood Requests</span>
            </h2>
            <div className="space-y-3">
              {myCreatedRequests.map(req => (
                <div key={req.id} className="bg-slate-50 p-3.5 sm:p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-blood-600 text-white rounded">{req.blood_type}</span>
                      <p className="text-xs font-bold text-slate-900">Patient: {req.patient_name}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${req.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{req.status === 'fulfilled' ? 'Fulfilled' : req.status}</span>
                    </div>
                    <p className="text-xs text-slate-600">Target Donor: <strong>{req.donor?.full_name || 'Open Community Board'}</strong></p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {req.donor_response === 'accepted' && (
                      <button onClick={() => setActiveChatRequest(req)} className="px-3 py-1.5 text-xs font-semibold text-white bg-blood-600 hover:bg-blood-700 rounded-lg shadow-sm flex items-center space-x-1"><span>💬</span><span>Coordinate</span></button>
                    )}
                    {!req.requester_fulfilled && (
                      <button onClick={() => handleMarkFulfilled(req.id)} className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg">✓ Mark Request Fulfilled</button>
                    )}
                    {req.selected_donor_id && (
                      <button onClick={() => setReportingTarget({ request: req, targetUser: req.donor })} className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 rounded-lg">⚠️ Report No-Show</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Donor Context Banner */}
        {selectedDonor && (
          <div className="bg-blood-50 border border-blood-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 text-xs font-extrabold bg-blood-600 text-white rounded-md">{selectedDonor.blood_type}</span>
              <div>
                <p className="text-xs font-bold text-slate-900">Target Donor Selected: {selectedDonor.full_name}</p>
                <p className="text-[11px] text-slate-500">Changing blood type filter invalidates this selection.</p>
              </div>
            </div>
            <button onClick={() => setSelectedDonor(null)} className="text-xs text-blood-700 hover:underline font-semibold">Clear</button>
          </div>
        )}

        {/* Find Potential Donors Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Find Potential Donors</h2>
              <p className="text-xs text-slate-500">Search active verified donors by blood type and location</p>
            </div>
            <button
              onClick={() => { setSelectedDonor(null); setShowRequestModal(true); }}
              className="px-4 py-2 bg-blood-600 hover:bg-blood-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              + Post Emergency Request
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Needed Blood Type</label>
              <select
                value={searchBloodType}
                onChange={handleSearchBloodTypeChange}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blood-500 focus:outline-none"
              >
                <option value="All">All Blood Types</option>
                {BLOOD_TYPES.filter(t => t !== "Not provided / I don't know").map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">City or Area</label>
              <input
                type="text"
                placeholder="e.g. North Caloocan, Novaliches"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Donors Cards Grid */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Available Verified Donors ({donors.length})</h3>
            {loadingDonors ? (
              <p className="text-xs text-slate-400 py-3">Searching donors...</p>
            ) : donors.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500">No active verified donors found matching the filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {donors.map((d) => (
                  <div key={d.id} className="p-3.5 border rounded-lg border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <p className="text-xs font-bold text-slate-900">{d.full_name}</p>
                          <span className="text-[10px] text-emerald-600" title="Didit Verified">✓</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{d.city || 'Caloocan'}</p>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-bold text-blood-700 bg-blood-100 rounded">{d.blood_type}</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                      {d.id !== session.user.id ? (
                        <button onClick={() => initiateRequestWithDonor(d)} className="px-2.5 py-1 text-[11px] font-semibold text-blood-600 hover:text-white hover:bg-blood-600 border border-blood-600 rounded transition">
                          Request This Donor
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Your Profile (Donor)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Requests Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Active Emergency Requests</h2>
          {requests.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
              <p className="text-xs text-slate-500">No urgent blood requests at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="p-4 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-blood-600 text-white rounded">{req.blood_type}</span>
                      <h4 className="text-sm font-bold text-slate-900">{req.patient_name}</h4>
                    </div>
                    <p className="text-xs text-slate-600">📍 {req.hospital_name} • {req.city}</p>
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <p className="text-xs font-semibold text-slate-800">Contact: {req.contact_number}</p>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">Open for Coordination</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {activeChatRequest && (
        <CoordinationChat
          request={activeChatRequest}
          currentUser={session.user}
          onClose={() => setActiveChatRequest(null)}
        />
      )}

      {reportingTarget && (
        <ReportModal
          request={reportingTarget.request}
          currentUser={session.user}
          targetUser={reportingTarget.targetUser}
          onClose={() => setReportingTarget(null)}
          onReportSubmitted={() => setNotification('Report filed successfully. It will be reviewed by administrators.')}
        />
      )}

      {showReadinessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pre-Donation Readiness Self-Assessment</h3>
                <p className="text-xs text-slate-500">Confirm readiness to broadcast availability</p>
              </div>
              <button onClick={() => setShowReadinessModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs leading-relaxed">
              <strong>Medical Disclaimer:</strong> This checklist is a personal self-assessment and does <strong>not</strong> represent official medical clearance.
            </div>
            {readinessError && <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{readinessError}</div>}
            <form onSubmit={submitReadinessAssessment} className="space-y-3 pt-1">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={readinessAnswers.wellRested} onChange={(e) => setReadinessAnswers({ ...readinessAnswers, wellRested: e.target.checked })} className="mt-1 rounded text-blood-600 focus:ring-blood-500" />
                <span className="text-xs text-slate-700">I am well-rested (at least 6-8 hours of sleep) and well-hydrated today.</span>
              </label>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={readinessAnswers.noFever} onChange={(e) => setReadinessAnswers({ ...readinessAnswers, noFever: e.target.checked })} className="mt-1 rounded text-blood-600 focus:ring-blood-500" />
                <span className="text-xs text-slate-700">I currently do not have a fever, cough, cold, or illness symptoms.</span>
              </label>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={readinessAnswers.noRecentTattoo} onChange={(e) => setReadinessAnswers({ ...readinessAnswers, noRecentTattoo: e.target.checked })} className="mt-1 rounded text-blood-600 focus:ring-blood-500" />
                <span className="text-xs text-slate-700">I have not had new tattoos or piercings in the last 12 months.</span>
              </label>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input type="checkbox" checked={readinessAnswers.understandsDisclaimer} onChange={(e) => setReadinessAnswers({ ...readinessAnswers, understandsDisclaimer: e.target.checked })} className="mt-1 rounded text-blood-600 focus:ring-blood-500" />
                <span className="text-xs text-slate-700 font-medium">I understand that final clearance is determined only by hospital staff.</span>
              </label>
              <div className="pt-4 border-t flex justify-end space-x-2">
                <button type="button" onClick={() => setShowReadinessModal(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">Confirm & Activate Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Post Emergency Blood Request</h3>
                {selectedDonor && <p className="text-[11px] text-blood-600 font-semibold mt-0.5">Direct Request for: {selectedDonor.full_name} ({selectedDonor.blood_type})</p>}
              </div>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Patient Name</label>
                <input type="text" required value={newRequest.patient_name} onChange={(e) => setNewRequest({ ...newRequest, patient_name: e.target.value })} className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2" placeholder="Full Name" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Needed Blood Type</label>
                  <select disabled={!!selectedDonor} value={newRequest.blood_type} onChange={(e) => setNewRequest({ ...newRequest, blood_type: e.target.value })} className={`w-full text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white ${selectedDonor ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}>
                    {BLOOD_TYPES.filter(t => t !== "Not provided / I don't know").map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Request For</label>
                  <select value={newRequest.is_for_self} onChange={(e) => setNewRequest({ ...newRequest, is_for_self: e.target.value === 'true' })} className="w-full text-xs border border-slate-300 rounded-lg px-2 py-2 bg-white">
                    <option value="true">Myself</option>
                    <option value="false">Someone else</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hospital / Medical Center</label>
                <input type="text" required value={newRequest.hospital_name} onChange={(e) => setNewRequest({ ...newRequest, hospital_name: e.target.value })} className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2" placeholder="e.g. Caloocan City Medical Center" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">City / Location</label>
                  <input type="text" required value={newRequest.city} onChange={(e) => setNewRequest({ ...newRequest, city: e.target.value })} className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Number</label>
                  <input type="text" required value={newRequest.contact_number} onChange={(e) => setNewRequest({ ...newRequest, contact_number: e.target.value })} className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2" placeholder="09123456789" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Condition</label>
                <textarea rows="2" value={newRequest.urgency_notes} onChange={(e) => setNewRequest({ ...newRequest, urgency_notes: e.target.value })} className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2" placeholder="e.g. Urgent need for surgery transfusion" />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowRequestModal(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blood-600 hover:bg-blood-700 rounded-lg shadow-sm">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}