import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabaseClient';
import bloodBuddyLogo from './assets/bloodbuddy-logo-transparent.png';
import { QRCodeSVG } from 'qrcode.react';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import CoordinationChat from './components/CoordinationChat';
import ReportModal from './components/ReportModal';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', "Not provided / I don't know"];
const BACKEND_URL = 'https://bloodbuddy-server.onrender.com';

const AVATAR_OPTIONS = [
  'bg-[#c9253a]', 'bg-[#1d7a4b]', 'bg-[#2563eb]', 'bg-[#d97706]', 'bg-[#7c3aed]', 'bg-[#db2777]', 'bg-[#1e1013]'
];

// --- TOAST NOTIFICATION COMPONENT ---
function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 15000); 
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  let bgConfig = 'bg-brand-surface dark:bg-[#25141a] border-brand-line dark:border-[#3b2328] text-brand-ink dark:text-[#f8ece9]';
  let iconConfig = <svg className="w-5 h-5 text-brand-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

  if (type === 'success') {
    bgConfig = 'bg-[#f0f9f4] dark:bg-[#173326] border-[#cceadc] dark:border-brand-ok text-[#115a35] dark:text-[#58cf92]';
    iconConfig = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  } else if (type === 'error') {
    bgConfig = 'bg-[#fdf3f4] dark:bg-[#3a1a20] border-[#f4c8cb] dark:border-[#6f0818] text-[#d42b3a] dark:text-[#f2606f]';
    iconConfig = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
  } else if (type === 'warning') {
    bgConfig = 'bg-amber-50 dark:bg-[#332610] border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-[#e8b64d]';
    iconConfig = <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }

  return createPortal(
    <div className={`fixed top-20 right-4 sm:right-6 z-[10000] flex items-start gap-3 p-4 border rounded-xl shadow-lg animate-[rise_0.35s_ease_both] max-w-sm w-full ${bgConfig}`}>
      <div className="flex-none mt-0.5">{iconConfig}</div>
      <p className="flex-1 text-[13.5px] font-medium leading-snug pr-2">{message}</p>
      <button onClick={onClose} className="flex-none opacity-60 hover:opacity-100 transition p-0.5 -mt-0.5 -mr-1">✕</button>
    </div>,
    document.body
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [initialIsLogin, setInitialIsLogin] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  
  const [currentRoute, setCurrentRoute] = useState('home'); 
  const [activeTab, setActiveTab] = useState('my_requests'); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const dropdownRef = useRef(null);

  const [selectedDonor, setSelectedDonor] = useState(null);
  const [requestFilter, setRequestFilter] = useState('all'); 
  const [donationFilter, setDonationFilter] = useState('all');

  const [verifyingId, setVerifyingId] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [readinessAnswers, setReadinessAnswers] = useState({ wellRested: false, noFever: false, noRecentTattoo: false, understandsDisclaimer: false });
  const [readinessError, setReadinessError] = useState('');
  const [isSavingReadiness, setIsSavingReadiness] = useState(false);
  
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // GLOBAL MODAL STATE
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

  const [requests, setRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myCreatedRequests, setMyCreatedRequests] = useState([]);
  const [activeChatRequest, setActiveChatRequest] = useState(null);
  const [reportingTarget, setReportingTarget] = useState(null);
  const [requestToAccept, setRequestToAccept] = useState(null);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  const [toastData, setToastData] = useState({ message: '', type: 'info' });
  const showToast = useCallback((message, type = 'info') => {
    setToastData({ message, type });
  }, []);
  const closeToast = useCallback(() => setToastData({ message: '', type: 'info' }), []);

  const [newRequest, setNewRequest] = useState({
    patient_name: '', is_for_self: true, blood_type: 'O+', hospital_name: '', city: 'Metro Manila', contact_number: '', urgency_notes: ''
  });

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

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Settings/security modals share one modal layer. Lock background scrolling and support Escape.
  const closeSettingsModals = useCallback(() => {
    if (isSavingReadiness || isSavingProfile || isEnrollingMfa || isDisablingMfa) return;
    setShowReadinessModal(false);
    setShowEditProfileModal(false);
    setShowMfaModal(false);
    setShowDisableMfaModal(false);
  }, [isSavingReadiness, isSavingProfile, isEnrollingMfa, isDisablingMfa]);

  useEffect(() => {
    const modalOpen = showReadinessModal || showEditProfileModal || showMfaModal || showDisableMfaModal;
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeSettingsModals();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showReadinessModal, showEditProfileModal, showMfaModal, showDisableMfaModal, closeSettingsModals]);

  useEffect(() => {
    const checkDiditReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('didit_return') === 'true' && session?.user?.id) {
        try {
          showToast('Finalizing verification with Didit...', 'info');
          const res = await fetch(`${BACKEND_URL}/api/didit/check-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
          });
          const data = await res.json();
          
          if (data.status === 'verified') {
            showToast('Identity successfully verified!', 'success');
          } else if (data.status === 'rejected') {
            showToast('Identity verification was rejected or failed.', 'error');
          } else {
            showToast('Verification is still processing. Please check back in a few minutes.', 'warning');
          }
          
          window.history.replaceState({}, document.title, window.location.pathname);
          await fetchUserProfile(session.user.id);
          setActiveTab('settings');
        } catch (err) {
          console.error('Failed to sync Didit status:', err);
          showToast('Error syncing verification status.', 'error');
        }
      }
    };

    if (session) {
      checkDiditReturn();
    }
  }, [session, showToast]);

  const handleGlobalSession = async (currentSession) => {
    if (!currentSession) {
      setSession(null);
      return;
    }
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
        return; 
      }
    } catch (err) {
      console.error('AAL Verification Error:', err);
    }
    
    setSession(currentSession);
    fetchUserProfile(currentSession.user.id);
    fetchIncomingRequests(currentSession.user.id);
    fetchMyCreatedRequests(currentSession.user.id);
    checkMfaStatus();
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleGlobalSession(session).finally(() => setLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
        setResetStep(2); 
        setShowPasswordModal(true);
        setShowAuthModal(false); 
      } else if (event === 'SIGNED_OUT') {
        setShowAuthModal(false);
        setIsRecoveringPassword(false);
        setShowPasswordModal(false);
        setIs2FAEnabled(false);
        setCurrentRoute('home');
        setSession(null);
        closeToast();
        setMfaError('');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        handleGlobalSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [closeToast]);

  const handleAuthFinished = async (newSession) => {
    await handleGlobalSession(newSession);
    setShowAuthModal(false);
    if (newSession) {
      navigateTo('dashboard', 'my_requests');
      // Preserve the donor selected by a guest and continue the request after login.
      if (selectedDonor) {
        setShowRequestModal(true);
      }
    }
  };

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (data && data.all.length > 0) {
        const totpFactor = data.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
        setIs2FAEnabled(!!totpFactor);
      } else {
        setIs2FAEnabled(false);
      }
    } catch (err) {
      console.error("Error checking MFA status:", err);
    }
  };

  const fetchUserProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      if (!data.avatar_color) {
        setEditAvatarColor(AVATAR_OPTIONS[0]);
      } else {
        setEditAvatarColor(data.avatar_color);
      }
    }
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from('blood_requests').select('*, profiles:requester_id(full_name)').eq('status', 'open').order('created_at', { ascending: false });
    setRequests(data || []);
  };

  
const fetchIncomingRequests = async (userId = session?.user?.id) => {
  if (!userId) {
    setIncomingRequests([]);
    return;
  }

  const { data, error } = await supabase
    .from('blood_requests')
    .select('*, profiles:requester_id(id, full_name)')
    .eq('selected_donor_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching incoming requests:', error);
    return;
  }

  setIncomingRequests(data || []);
};


useEffect(() => {
  const userId = session?.user?.id;

  if (!userId) {
    setIncomingRequests([]);
    return;
  }

  let isActive = true;

  // Load requests immediately when the donor logs in.
  fetchIncomingRequests(userId);

  // Listen for new or updated requests assigned to this donor.
  const channel = supabase
    .channel(`donation-requests-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'blood_requests',
        filter: `selected_donor_id=eq.${userId}`,
      },
      () => {
        if (isActive) {
          fetchIncomingRequests(userId);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(
          'Realtime subscription failed for donation requests.'
        );
      }
    });

  return () => {
    isActive = false;
    supabase.removeChannel(channel);
  };
}, [session?.user?.id]);



  const fetchMyCreatedRequests = async (userId = session?.user?.id) => {
  if (!userId) {
    setMyCreatedRequests([]);
    return;
  }

  const { data, error } = await supabase
    .from('blood_requests')
    .select('*, donor:selected_donor_id(id, full_name)')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching my blood requests:', error);
    return;
  }

  setMyCreatedRequests(data || []);
};

  const handleStartDiditVerification = async () => {
    setVerificationError('');
    setVerifyingId(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/didit/create-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, userEmail: session.user.email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to start verification session');
      window.location.href = result.url;
    } catch (err) {
      setVerificationError(err.message);
      showToast(err.message, 'error');
    } finally {
      setVerifyingId(false);
    }
  };

  const handleAvailabilityClick = () => {
    if (!profile) return;
    if (!profile.is_available_donor) {
      if (profile.id_verification_status !== 'verified') {
        showToast('Identity Verification Required: Please verify your identity in Account Settings first.', 'warning');
        setActiveTab('settings');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setReadinessAnswers({ wellRested: false, noFever: false, noRecentTattoo: false, understandsDisclaimer: false });
      setReadinessError('');
      setShowEditProfileModal(false);
      setShowMfaModal(false);
      setShowDisableMfaModal(false);
      setShowReadinessModal(true);
    } else {
      updateAvailabilityStatus(false);
    }
  };

  const updateAvailabilityStatus = async (status, readinessPassed = false) => {
    if (!profile?.id) return;
    setIsSavingReadiness(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_available_donor: status, readiness_passed: readinessPassed })
        .eq('id', profile.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, is_available_donor: status, readiness_passed: readinessPassed } : prev);
      setShowReadinessModal(false);
      showToast(status ? 'Donor availability activated' : 'Donor visibility hidden', 'success');
    } catch (err) {
      console.error('Failed to update donor availability:', err);
      showToast(`Failed to update status: ${err.message || 'Please try again.'}`, 'error');
    } finally {
      setIsSavingReadiness(false);
    }
  };

  const submitReadinessAssessment = (e) => {
    e.preventDefault();
    if (!Object.values(readinessAnswers).every(Boolean)) {
      setReadinessError('Please confirm all assessment requirements and the healthcare disclaimer.');
      return;
    }
    updateAvailabilityStatus(true, true);
  };

  const handleBloodTypeChange = async (newType) => {
    const { error } = await supabase.from('profiles').update({ blood_type: newType }).eq('id', profile.id);
    if (!error) {
      setProfile({ ...profile, blood_type: newType });
      showToast('Blood type saved', 'success');
    }
  };

  const handleConfirmAccept = async () => {
    if (!requestToAccept || !session?.user?.id || isAcceptingRequest) return;
    setIsAcceptingRequest(true);
    try {
      const { error } = await supabase
        .from('blood_requests')
        .update({ donor_response: 'accepted', status: 'matched' })
        .eq('id', requestToAccept.id)
        .eq('selected_donor_id', session.user.id)
        .eq('donor_response', 'pending');
      if (error) throw error;
      setRequestToAccept(null);
      showToast('Request accepted. You can now coordinate in chat.', 'success');
      await Promise.all([fetchIncomingRequests(), fetchMyCreatedRequests(), fetchRequests()]);
    } catch (err) {
      showToast(`Could not accept request: ${err.message || 'Please try again.'}`, 'error');
    } finally {
      setIsAcceptingRequest(false);
    }
  };

  const handleDonorResponse = async (requestId, decision) => {
    if (!session?.user?.id || !['accepted', 'declined'].includes(decision)) return;
    const updates = decision === 'accepted'
      ? { donor_response: 'accepted', status: 'matched' }
      : { donor_response: 'declined', status: 'open', selected_donor_id: null };

    const { error } = await supabase
      .from('blood_requests')
      .update(updates)
      .eq('id', requestId)
      .eq('selected_donor_id', session.user.id)
      .eq('donor_response', 'pending');

    if (error) {
      showToast(`Could not update this request: ${error.message}`, 'error');
      return;
    }
    showToast(decision === 'accepted' ? 'Request accepted. You can now coordinate in chat.' : 'Request declined. It is available for another match.', 'success');
    await Promise.all([fetchIncomingRequests(), fetchMyCreatedRequests(), fetchRequests()]);
  };

  const handleMarkFulfilled = async (requestId) => {
    if (!session?.user?.id) return;
    const request = myCreatedRequests.find((item) => item.id === requestId);
    if (!request || request.requester_id !== session.user.id || request.donor_response !== 'accepted') {
      showToast('Only the requester can confirm receipt after a donor accepts.', 'error');
      return;
    }
    const nextStatus = request.donor_donation_status === 'completed' ? 'fulfilled' : request.status;
    const { error } = await supabase
      .from('blood_requests')
      .update({ requester_fulfilled: true, ...(nextStatus === 'fulfilled' ? { status: 'fulfilled' } : {}) })
      .eq('id', requestId)
      .eq('requester_id', session.user.id)
      .eq('donor_response', 'accepted');
    if (error) {
      showToast(`Could not confirm receipt: ${error.message}`, 'error');
      return;
    }
    showToast(nextStatus === 'fulfilled' ? 'Both sides confirmed. Request completed.' : 'Receipt confirmation saved. It will be completed once the donor confirms donation.', 'success');
    await Promise.all([fetchMyCreatedRequests(), fetchRequests()]);
  };

  const handleDonorOutcome = async (requestId, outcome) => {
    if (!session?.user?.id || !['completed', 'did_not_donate'].includes(outcome)) return;
    const request = incomingRequests.find((item) => item.id === requestId);
    if (!request || request.selected_donor_id !== session.user.id || request.donor_response !== 'accepted') {
      showToast('Only the assigned donor can update an accepted request.', 'error');
      return;
    }
    const updates = { donor_donation_status: outcome };
    if (outcome === 'completed' && request.requester_fulfilled) updates.status = 'fulfilled';
    const { error } = await supabase
      .from('blood_requests')
      .update(updates)
      .eq('id', requestId)
      .eq('selected_donor_id', session.user.id)
      .eq('donor_response', 'accepted');
    if (error) {
      showToast(`Could not record donation outcome: ${error.message}`, 'error');
      return;
    }
    showToast(outcome === 'completed'
      ? (request.requester_fulfilled ? 'Both sides confirmed. Request completed.' : 'Donation confirmation saved. The requester must also confirm receipt.')
      : 'Marked as not donated. The request remains uncompleted.', 'success');
    await Promise.all([fetchIncomingRequests(), fetchMyCreatedRequests(), fetchRequests()]);
  };

  const initiateRequestWithDonor = (donor) => {
    setSelectedDonor(donor);
    setNewRequest(prev => ({ ...prev, blood_type: donor.blood_type, city: donor.city || 'Metro Manila' }));
    if (session) {
      setShowRequestModal(true);
    }
  };

  const handleReviewRequest = (e) => {
    e.preventDefault();
    if (!newRequest.patient_name.trim() || !newRequest.blood_type || !newRequest.hospital_name.trim() || !newRequest.city.trim() || !newRequest.contact_number.trim()) {
      showToast('Please complete all required fields.', 'error');
      return;
    }
    setShowRequestModal(false);
    setShowReviewModal(true);
  };

  const handleConfirmCreateRequest = async () => {
    setIsSubmittingRequest(true);
    setShowReviewModal(false);
    try {
      await handleCreateRequest({ preventDefault: () => {} });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCreateRequest = async (e) => {
  e.preventDefault();

  if (!session?.user?.id) {
    showToast('Please log in to submit a blood request.', 'error');
    return;
  }

  const { data, error } = await supabase
    .from('blood_requests')
    .insert([
      {
        requester_id: session.user.id,
        selected_donor_id: selectedDonor ? selectedDonor.id : null,
        ...newRequest,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating blood request:', error);
    showToast(`Failed to create request: ${error.message}`, 'error');
    return;
  }

  setShowRequestModal(false);
  setShowReviewModal(false);
  setSelectedDonor(null);

  setNewRequest({
    patient_name: '',
    is_for_self: true,
    blood_type: 'O+',
    hospital_name: '',
    city: 'Metro Manila',
    contact_number: '',
    urgency_notes: '',
  });

  await fetchMyCreatedRequests(session.user.id);
  await fetchRequests();

  navigateTo('dashboard', 'my_requests');
  showToast('Emergency request posted successfully.', 'success');
};

  const handleSendResetPassword = async () => {
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(session?.user?.email || '');
    setIsSendingReset(false);
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('A password reset code has been sent to your email.', 'info');
      setResetStep(1);
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      setShowPasswordModal(true);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsSendingReset(true);
    const targetEmail = session?.user?.email || '';
    const { data, error } = await supabase.auth.verifyOtp({ email: targetEmail, token: otpCode, type: 'recovery' });
    setIsSendingReset(false);

    if (error) {
      showToast('Invalid or expired code. Please try again.', 'error');
    } else if (data.session) {
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      setResetStep(2);
      setIsRecoveringPassword(true);
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast('Passwords do not match. Please ensure both fields are identical.', 'error');
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSendingReset(false);
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      setShowPasswordModal(false);
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
      setResetStep(1);
      setIsRecoveringPassword(false); 
      showToast('Password updated securely.', 'success');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const fullName = editFullName.trim();
    if (!profile?.id || !fullName) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, avatar_color: editAvatarColor })
        .eq('id', profile.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, full_name: fullName, avatar_color: editAvatarColor } : prev);
      setShowEditProfileModal(false);
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast(`Failed to update profile: ${err.message || 'Please try again.'}`, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggle2FA = () => {
    if (is2FAEnabled) {
      setShowReadinessModal(false);
      setShowEditProfileModal(false);
      setShowMfaModal(false);
      setShowDisableMfaModal(true);
    } else {
      setMfaStep(1);
      setMfaError('');
      setMfaVerifyCode('');
      setShowReadinessModal(false);
      setShowEditProfileModal(false);
      setShowDisableMfaModal(false);
      setShowMfaModal(true);
    }
  };

  const startEnrollMfa = async () => {
    setIsEnrollingMfa(true);
    setMfaError('');
    try {
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      if (existingFactors && existingFactors.all) {
        const pendingFactors = existingFactors.all.filter(f => f.factor_type === 'totp' && f.status !== 'verified');
        for (const factor of pendingFactors) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'BloodBuddy',
        friendlyName: 'BloodBuddy Auth'
      });
      if (error) throw error;
      
      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.uri); 
      setMfaSecret(data.totp.secret);
      setMfaStep(2);
    } catch (err) {
      setMfaError(err.message || 'Failed to start MFA setup.');
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(mfaSecret);
    showToast('Secret code copied to clipboard!', 'info');
  };

  const verifyMfaCode = async (e) => {
    e.preventDefault();
    if (!mfaVerifyCode) return;
    
    setIsEnrollingMfa(true);
    setMfaError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: mfaVerifyCode
      });
      
      if (verify.error) throw verify.error;

      setIs2FAEnabled(true);
      setShowMfaModal(false);
      setMfaVerifyCode('');
      showToast('Two-Factor Authentication successfully enabled!', 'success');
    } catch (err) {
      setMfaError('Invalid code. Please check your authenticator app and try again.');
    } finally {
      setIsEnrollingMfa(false);
    }
  };

  const disableMfa = async () => {
    if (isDisablingMfa) return;
    setIsDisablingMfa(true);
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const totpFactors = (data?.all || []).filter(factor => factor.factor_type === 'totp' && factor.status === 'verified');
      for (const factor of totpFactors) {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (unenrollError) throw unenrollError;
      }
      setIs2FAEnabled(false);
      setShowDisableMfaModal(false);
      showToast('Two-Factor Authentication successfully disabled.', 'success');
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      showToast(`Failed: ${err.message || 'Please try again.'}`, 'error');
    } finally {
      setIsDisablingMfa(false);
    }
  };

  const navigateTo = (route, tab = null) => {
    setCurrentRoute(route);
    if (tab) setActiveTab(tab);
    setIsProfileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredMyRequests = myCreatedRequests.filter(req => {
    if (requestFilter === 'active') return req.status !== 'fulfilled';
    if (requestFilter === 'past') return req.status === 'fulfilled';
    return true;
  });

  const filteredDonationRequests = incomingRequests.filter(req => {
    if (donationFilter === 'pending') return req.donor_response === 'pending';
    if (donationFilter === 'accepted') return req.donor_response === 'accepted';
    return true;
  });

  const pendingDonationsCount = incomingRequests.filter(r => r.donor_response === 'pending').length;
  
  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || (session?.user?.email ? session.user.email.split('@')[0] : 'User');
  const displayBloodType = profile?.blood_type && profile.blood_type !== "Not provided / I don't know" ? profile.blood_type.replace('-', '−') : 'Not set';
  const userAvatarColor = profile?.avatar_color || AVATAR_OPTIONS[0];
  const idStatus = profile?.id_verification_status || 'not_submitted';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-bg dark:bg-[#150a0c] text-brand-muted transition-colors duration-300">Loading BloodBuddy...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] flex flex-col font-body transition-colors duration-300 relative">
      
      <Toast message={toastData.message} type={toastData.type} onClose={closeToast} />

      {(!session || (isRecoveringPassword && currentRoute === 'home') || currentRoute === 'home') && (
        <>
          <LandingPage
            profile={profile}
            session={session}
            incomingRequestsCount={pendingDonationsCount}
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenAuth={(isLogin = true) => { setInitialIsLogin(isLogin); setShowAuthModal(true); }}
            onNavigateTo={navigateTo}
            onSignOut={() => supabase.auth.signOut()}
            onRequestDonor={initiateRequestWithDonor}
          />

          {showAuthModal && (
            <div className="fixed inset-0 bg-brand-ink/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 py-8">
              <div className="relative w-full max-w-md max-h-full flex flex-col">
                <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 z-10 text-brand-muted hover:text-brand-ink dark:text-[#c2a8a9] dark:hover:text-white transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <Auth 
                  defaultIsLogin={initialIsLogin} 
                  onSessionChange={handleAuthFinished} 
                  selectedDonor={selectedDonor} 
                  setIsRecoveringPassword={setIsRecoveringPassword}
                  showToast={showToast} 
                />
              </div>
            </div>
          )}
          

        </>
      )}

      {showPasswordModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60">
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[400px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.25s_ease_both]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-[22px] text-brand-ink dark:text-[#f8ece9]">Update Password</h3>
                  <button onClick={() => setShowPasswordModal(false)} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition">✕</button>
                </div>
                
                {resetStep === 1 ? (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">We sent an 8-digit verification code to your email. Enter it below to proceed.</p>
                    <div>
                      <input type="text" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter 8-digit code" className="w-full text-center tracking-[0.2em] font-mono text-[16px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-accent transition" />
                    </div>
                    <button type="submit" disabled={isSendingReset} className="w-full py-3.5 text-[14px] font-bold text-brand-onBtn bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSendingReset ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                    <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">Code verified! You can now set your new password.</p>
                    
                    <div className="relative">
                      <input type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New strong password" className="w-full text-[14px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 pr-11 focus:outline-none focus:border-brand-accent transition" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:text-brand-ink dark:hover:text-[#f8ece9] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" aria-label={showNewPassword ? "Hide new password" : "Show new password"}>
                        {showNewPassword ? (
                          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        ) : (
                          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <input type={showConfirmNewPassword ? "text" : "password"} required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" className="w-full text-[14px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 pr-11 focus:outline-none focus:border-brand-accent transition" />
                      <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:text-brand-ink dark:hover:text-[#f8ece9] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent" aria-label={showConfirmNewPassword ? "Hide confirm password" : "Show confirm password"}>
                        {showConfirmNewPassword ? (
                          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        ) : (
                          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        )}
                      </button>
                    </div>

                    <button type="submit" disabled={isSendingReset} className="w-full py-3.5 text-[14px] font-bold text-brand-onBtn bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSendingReset ? 'Saving...' : 'Save New Password'}
                    </button>
                  </form>
                )}
              </div>
          </div>,
          document.body
        )}

      {session && currentRoute !== 'home' && (
        <>
          <header className="sticky top-0 z-50 bg-brand-bg/90 dark:bg-[#150a0c]/90 backdrop-blur-md border-b border-brand-line dark:border-[#3b2328] transition-colors duration-300">
            <div className="max-w-[1160px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between">
              <button onClick={() => navigateTo('home')} className="flex items-center gap-2.5 font-display font-extrabold text-[22px] tracking-tight text-brand-ink dark:text-[#f8ece9] hover:opacity-80 transition">
                <img src={bloodBuddyLogo} alt="BloodBuddy" className="w-[34px] h-[34px] flex-none object-contain" />
                BloodBuddy
              </button>

              <ul className="hidden md:flex gap-8 items-center font-bold text-[14.5px] text-brand-muted dark:text-[#c2a8a9]">
                <li><button onClick={() => navigateTo('home')} className="block pb-1 border-b-[2.5px] border-transparent hover:text-brand-ink dark:hover:text-[#f8ece9] transition">Home</button></li>
                <li><button onClick={() => navigateTo('dashboard', 'donation_requests')} className={`block pb-1 border-b-[2.5px] transition ${activeTab === 'donation_requests' ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-ink dark:text-[#f8ece9]' : 'border-transparent hover:text-brand-ink dark:hover:text-[#f8ece9]'}`}>Donate blood</button></li>
                <li><button onClick={() => { navigateTo('home'); setTimeout(() => document.getElementById('how')?.scrollIntoView(), 100); }} className="block pb-1 border-b-[2.5px] border-transparent hover:text-brand-ink dark:hover:text-[#f8ece9] transition">About us</button></li>
              </ul>

              <div className="flex items-center gap-3">
                <button onClick={toggleTheme} className="p-2 mr-1 text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-white transition">
                  {theme === 'dark' ? (
                    <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  )}
                </button>

                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-2 pr-3.5 py-1.5 bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-full hover:border-brand-accent dark:hover:border-[#ff7d8b] transition shadow-sm">
                    <div className={`w-[34px] h-[34px] rounded-full ${userAvatarColor} flex items-center justify-center text-white text-[13px] font-bold flex-none`}>
                      {displayName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <div className="text-left hidden sm:block pr-1">
                      <p className="text-[13.5px] font-bold leading-tight text-brand-ink dark:text-[#f8ece9] max-w-[140px] truncate">{displayName}</p>
                      <p className="text-[11.5px] text-brand-muted dark:text-[#c2a8a9] leading-tight mt-0.5">{displayBloodType}</p>
                    </div>
                    <svg className={`w-4 h-4 text-brand-muted dark:text-[#c2a8a9] transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 top-[calc(100%+10px)] w-[265px] bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-2xl shadow-custom overflow-hidden z-50 animate-[rise_0.2s_ease_both]">
                      <div className="p-4 border-b border-brand-line dark:border-[#3b2328]">
                        <p className="text-[15px] font-bold text-brand-ink dark:text-[#f8ece9] truncate">{displayName}</p>
                        <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] truncate mt-0.5">{session.user.email}</p>
                        <span className="inline-block mt-2.5 px-2.5 py-1 text-[11.5px] font-bold text-brand-accent dark:text-[#ff7d8b] bg-brand-blush dark:bg-[#3a1a20] rounded-lg">Blood Type: {displayBloodType}</span>
                      </div>
                      <div className="p-2 space-y-1">
                        <button onClick={() => { setIsProfileOpen(false); navigateTo('dashboard', 'my_requests'); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-medium text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                          <svg className="w-[18px] h-[18px] text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          My Blood Requests
                        </button>
                        <button onClick={() => { setIsProfileOpen(false); navigateTo('dashboard', 'donation_requests'); }} className="w-full flex items-center justify-between px-3.5 py-2.5 text-[14px] font-medium text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                          <div className="flex items-center gap-3">
                            <svg className="w-[18px] h-[18px] text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            Donation Requests
                          </div>
                          {pendingDonationsCount > 0 && <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 bg-brand-btn text-white text-[11px] font-bold rounded-full">{pendingDonationsCount}</span>}
                        </button>
                        <button onClick={() => { setIsProfileOpen(false); navigateTo('dashboard', 'settings'); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-medium text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                          <svg className="w-[18px] h-[18px] text-brand-muted dark:text-[#c2a8a9]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                          Account Settings
                        </button>
                      </div>
                      <div className="p-2 border-t border-brand-line dark:border-[#3b2328]">
                        <button onClick={() => { setIsProfileOpen(false); supabase.auth.signOut(); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:bg-brand-blush dark:hover:bg-[#3a1a20] rounded-xl transition">
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-[1160px] mx-auto w-full px-4 md:px-6 pt-6 pb-16 flex-1">
            <div className="flex flex-wrap items-center gap-6 sm:gap-8 border-b border-brand-line dark:border-[#3b2328] mb-8">
              <button 
                onClick={() => setActiveTab('my_requests')} 
                className={`pb-3.5 text-[14px] sm:text-[15.5px] font-semibold border-b-[2.5px] transition-colors flex items-center gap-2 ${activeTab === 'my_requests' ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-accent dark:text-[#ff7d8b]' : 'border-transparent text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9]'}`}
              >
                My Blood Requests
                {myCreatedRequests.length > 0 && (
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] font-bold">
                    {myCreatedRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('donation_requests');
                  fetchIncomingRequests();
                }}
                className={`pb-3.5 text-[14px] sm:text-[15.5px] font-semibold border-b-[2.5px] transition-colors flex items-center gap-2 ${
                  activeTab === 'donation_requests'
                    ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-accent dark:text-[#ff7d8b]'
                    : 'border-transparent text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9]'
                }`}
              >
                Donation Requests
                {pendingDonationsCount > 0 && (
                  <span className="flex items-center justify-center w-[20px] h-[20px] bg-brand-btn text-white text-[11px] font-bold rounded-full ml-1">
                    {pendingDonationsCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`pb-3.5 text-[14px] sm:text-[15.5px] font-semibold border-b-[2.5px] transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-accent dark:text-[#ff7d8b]' : 'border-transparent text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9]'}`}
              >
                Account Settings
              </button>
            </div>

            {activeTab === 'my_requests' && (
              <div className="animate-[rise_0.35s_ease_both]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-[32px] font-display font-extrabold text-brand-ink dark:text-[#f8ece9] tracking-tight">My Blood Requests</h2>
                    <p className="text-[15px] text-brand-muted dark:text-[#c2a8a9] mt-1">Track requests sent to volunteer donors for upcoming procedures.</p>
                  </div>
                  <button onClick={() => navigateTo('home')} className="px-6 py-3.5 bg-brand-btn dark:bg-[#c9253a] text-white text-[15px] font-bold rounded-xl shadow-[0_8px_20px_-10px_#a4121f] dark:shadow-[0_8px_20px_-10px_#c9253a] hover:-translate-y-px transition flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    Find Donors
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <button onClick={() => setRequestFilter('all')} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition ${requestFilter === 'all' ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c]' : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>All Requests <span className="ml-1.5 opacity-70 font-mono">{myCreatedRequests.length}</span></button>
                  <button onClick={() => setRequestFilter('active')} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition ${requestFilter === 'active' ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c]' : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>Active <span className="ml-1.5 opacity-70 font-mono">{myCreatedRequests.filter(r => r.status !== 'fulfilled').length}</span></button>
                  <button onClick={() => setRequestFilter('past')} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition ${requestFilter === 'past' ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c]' : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>Past <span className="ml-1.5 opacity-70 font-mono">{myCreatedRequests.filter(r => r.status === 'fulfilled').length}</span></button>
                </div>

                {filteredMyRequests.length === 0 ? (
                  <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] p-12 text-center shadow-custom">
                    <div className="w-16 h-16 bg-brand-bg dark:bg-[#150a0c] rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-line dark:border-[#3b2328]">
                      <svg className="w-6 h-6 text-brand-muted dark:text-[#c2a8a9]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <h3 className="text-[18px] font-bold text-brand-ink dark:text-[#f8ece9]">No requests found</h3>
                    <p className="text-[14px] text-brand-muted dark:text-[#c2a8a9] mt-2 max-w-sm mx-auto">There are no requests matching this filter.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMyRequests.map(req => (
                      <div key={req.id} className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-brand-line dark:border-[#3b2328] pb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-[52px] h-[52px] rounded-full bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 dark:border-[#ff7d8b]/30 flex items-center justify-center text-[18px] font-extrabold text-brand-accent dark:text-[#ff7d8b]">
                              {req.blood_type.replace('-', '−')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[12px] font-medium text-brand-muted dark:text-[#c2a8a9]">#{req.id.split('-')[0].toUpperCase()}</span>
                                <span className="text-[12px] text-brand-muted dark:text-[#c2a8a9]">• {new Date(req.created_at).toLocaleDateString()}</span>
                              </div>
                              <h4 className="text-[18px] font-bold text-brand-ink dark:text-[#f8ece9]">{req.hospital_name}</h4>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {req.status === 'open' && <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-accent dark:bg-[#ff7d8b]"></span> Awaiting donor response</span>}
                            {req.status === 'matched' && <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-blue-50 dark:bg-[#1a2533] text-blue-700 dark:text-[#60a5fa] border border-blue-200 dark:border-blue-900/50 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Donor Matched</span>}
                            {req.status === 'fulfilled' && <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92] border border-brand-ok/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-ok dark:bg-[#58cf92]"></span> Completed</span>}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-5 text-[14px]">
                          <div className="flex items-center gap-2.5 text-brand-muted dark:text-[#c2a8a9]">
                            <svg className="w-4 h-4 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {req.city}
                          </div>
                          <div className="flex items-center gap-2.5 text-brand-muted dark:text-[#c2a8a9]">
                            <svg className="w-4 h-4 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Patient: {req.patient_name}
                          </div>
                          <div className="flex items-center gap-2.5 text-brand-muted dark:text-[#c2a8a9]">
                            <svg className="w-4 h-4 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            Target: {req.donor?.full_name || 'Public Board'}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-line dark:border-[#3b2328]">
                          {req.donor_response === 'accepted' && (
                            <button onClick={() => setActiveChatRequest(req)} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl hover:-translate-y-px transition shadow-[0_8px_20px_-10px_#a4121f] flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              Coordinate
                            </button>
                          )}
                          {!req.requester_fulfilled && (
                            <button onClick={() => handleMarkFulfilled(req.id)} className="px-5 py-2.5 text-[14px] font-bold text-brand-ok dark:text-[#58cf92] bg-brand-okSoft dark:bg-[#173326] border border-brand-ok/20 rounded-xl hover:opacity-80 transition">
                              Mark as Completed
                            </button>
                          )}
                          {req.selected_donor_id && (
                            <button onClick={() => setReportingTarget({ request: req, targetUser: req.donor })} className="px-5 py-2.5 text-[14px] font-bold text-brand-muted dark:text-[#c2a8a9] border border-brand-line dark:border-[#3b2328] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                              Report Issue
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DONATION REQUESTS */}
            {activeTab === 'donation_requests' && (
              <div className="animate-[rise_0.35s_ease_both]">
                <div className="mb-8">
                  <h2 className="text-[32px] font-display font-extrabold text-brand-ink dark:text-[#f8ece9] tracking-tight">Donation Requests</h2>
                  <p className="text-[15px] text-brand-muted dark:text-[#c2a8a9] mt-1">Manage your donor availability and review blood requests sent to you.</p>
                </div>

                <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6 md:p-8 mb-10">
                  <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-6">
                    <span className="text-[12px] font-mono font-medium tracking-widest uppercase text-brand-muted dark:text-[#c2a8a9]">BLOOD TYPE & DONOR AVAILABILITY</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-[46px] h-[46px] rounded-xl bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 dark:border-[#ff7d8b]/30 flex items-center justify-center text-[18px] font-extrabold text-brand-accent dark:text-[#ff7d8b]">
                          {displayBloodType === 'Not set' ? '?' : displayBloodType}
                        </div>
                        <div>
                          <p className="text-[15px] text-brand-muted dark:text-[#c2a8a9] mb-0.5">Listed Blood Type</p>
                          <p className="text-[18px] font-bold text-brand-ink dark:text-[#f8ece9] leading-none">{displayBloodType} Blood Type</p>
                        </div>
                      </div>
                      <select
                        value={profile?.blood_type || "Not provided / I don't know"}
                        onChange={(e) => handleBloodTypeChange(e.target.value)}
                        className="w-full text-[14px] font-bold border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl px-4 py-2.5 bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent appearance-none mb-3"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1.5 7 7.5l6-6' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundPosition: 'right 14px center', backgroundRepeat: 'no-repeat' }}
                      >
                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt.replace('-', '−')}</option>)}
                      </select>
                      <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">BloodBuddy has not independently verified this self-reported blood type. Final crossmatching and clinical confirmation are conducted at the hospital blood bank.</p>
                    </div>

                    <div className="md:border-l border-brand-line dark:border-[#3b2328] md:pl-12 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[14px] text-brand-muted dark:text-[#c2a8a9]">Donor Visibility</p>
                          <p className="text-[18px] font-bold text-brand-ink dark:text-[#f8ece9]">{profile?.is_available_donor ? 'Available to donate' : 'Currently Hidden'}</p>
                        </div>
                        <button
                          onClick={handleAvailabilityClick}
                          className={`relative flex-none w-[64px] h-[36px] rounded-full transition-colors duration-250 ${profile?.is_available_donor ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-line dark:bg-[#3b2328]'}`}
                        >
                          <span className={`absolute top-1 left-1 w-[28px] h-[28px] rounded-full bg-white shadow-sm transition-transform duration-250 ${profile?.is_available_donor ? 'translate-x-[28px]' : 'translate-x-0'}`}></span>
                        </button>
                      </div>
                      <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed mt-2">When turned <strong>ON</strong>, you may appear as an available potential donor in searches for your self-reported blood type. You can switch this off at any time.</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] font-display font-extrabold text-brand-ink dark:text-[#f8ece9] tracking-tight">Requests Sent to You</h2>
                    <p className="text-[15px] text-brand-muted dark:text-[#c2a8a9] mt-1">Review urgent requests matching your blood type and proximity.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <button onClick={() => setDonationFilter('all')} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition ${donationFilter === 'all' ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c]' : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>All Requests <span className="ml-1.5 opacity-70 font-mono">{incomingRequests.length}</span></button>
                  <button onClick={() => setDonationFilter('pending')} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition ${donationFilter === 'pending' ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c]' : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>Pending <span className="ml-1.5 opacity-70 font-mono">{incomingRequests.filter(r => r.donor_response === 'pending').length}</span></button>
                  <button onClick={() => setDonationFilter('accepted')} className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition ${donationFilter === 'accepted' ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c]' : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>Accepted <span className="ml-1.5 opacity-70 font-mono">{incomingRequests.filter(r => r.donor_response === 'accepted').length}</span></button>
                </div>

                {filteredDonationRequests.length === 0 ? (
                   <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] p-12 text-center shadow-custom">
                   <div className="w-[60px] h-[60px] bg-brand-bg dark:bg-[#150a0c] rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-line dark:border-[#3b2328]">
                     <svg className="w-6 h-6 text-brand-muted dark:text-[#c2a8a9]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                   </div>
                   <h3 className="text-[18px] font-bold text-brand-ink dark:text-[#f8ece9]">You're all caught up</h3>
                   <p className="text-[14px] text-brand-muted dark:text-[#c2a8a9] mt-2 max-w-sm mx-auto">There are no direct blood requests matching this filter.</p>
                 </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDonationRequests.map((req) => (
                      <div key={req.id} className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 border-b border-brand-line dark:border-[#3b2328] pb-5">
                          <div className="flex items-center gap-4">
                            <div className="w-[52px] h-[52px] rounded-full bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 dark:border-[#ff7d8b]/30 flex items-center justify-center text-[18px] font-extrabold text-brand-accent dark:text-[#ff7d8b]">
                              {req.blood_type.replace('-', '−')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[12px] font-medium text-brand-muted dark:text-[#c2a8a9]">#{req.id.split('-')[0].toUpperCase()}</span>
                                <span className="text-[12px] text-brand-muted dark:text-[#c2a8a9]">• {new Date(req.created_at).toLocaleDateString()}</span>
                              </div>
                              <h4 className="text-[18px] font-bold text-brand-ink dark:text-[#f8ece9]">{req.hospital_name}</h4>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {req.donor_response === 'pending' && <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-amber-50 dark:bg-[#332610] text-amber-700 dark:text-[#e8b64d] border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Needs your response</span>}
                            {req.donor_response === 'accepted' && <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92] border border-brand-ok/20 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-ok dark:bg-[#58cf92]"></span> Accepted</span>}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-5 text-[14px]">
                          <div className="flex items-center gap-2.5 text-brand-muted dark:text-[#c2a8a9]">
                            <svg className="w-4 h-4 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {req.city}
                          </div>
                          <div className="flex items-center gap-2.5 text-brand-muted dark:text-[#c2a8a9]">
                            <svg className="w-4 h-4 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Requester: {req.profiles?.full_name}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-brand-line dark:border-[#3b2328]">
                          {req.donor_response === 'pending' ? (
                            <>
                              <button onClick={() => handleDonorResponse(req.id, 'declined')} className="px-5 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition">Decline Request</button>
                              <button onClick={() => setRequestToAccept(req)} className="px-5 py-2.5 text-[14px] font-bold text-brand-onBtn bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-[0_8px_20px_-10px_#a4121f] dark:shadow-[0_8px_20px_-10px_#c9253a] hover:-translate-y-px transition flex items-center gap-1.5">Accept Request →</button>
                            </>
                          ) : req.donor_response === 'accepted' ? (
                            <>
                              <button onClick={() => setActiveChatRequest(req)} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm hover:-translate-y-px transition flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>Open Chat</button>
                              {req.donor_donation_status === 'pending' && (
                                <>
                                  <button onClick={() => handleDonorOutcome(req.id, 'completed')} className="px-4 py-2.5 text-[13px] font-bold text-brand-ok dark:text-[#58cf92] bg-brand-okSoft dark:bg-[#173326] border border-brand-ok/20 rounded-xl">✓ Confirm Donation</button>
                                  <button onClick={() => handleDonorOutcome(req.id, 'did_not_donate')} className="px-4 py-2.5 text-[13px] font-bold text-brand-muted dark:text-[#c2a8a9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl">✕ Did Not Donate</button>
                                </>
                              )}
                              {req.donor_donation_status === 'completed' && !req.requester_fulfilled && <span className="px-3 py-2 text-[12px] font-semibold text-amber-800 bg-amber-50 rounded-lg">Donation confirmed · awaiting requester</span>}
                              {req.status === 'fulfilled' && <span className="px-3 py-2 text-[12px] font-bold text-brand-ok bg-brand-okSoft rounded-lg">Both sides confirmed</span>}
                              <button onClick={() => setReportingTarget({ request: req, targetUser: req.profiles })} className="px-5 py-2.5 text-[14px] font-bold text-brand-muted dark:text-[#c2a8a9] border border-brand-line dark:border-[#3b2328] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">Report Issue</button>
                            </>
                          ) : (
                            <span className="px-4 py-2 text-[13px] font-bold text-brand-muted dark:text-[#c2a8a9] bg-brand-bg dark:bg-[#150a0c] rounded-xl">Request Declined</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACCOUNT SETTINGS (Tighter Layout) */}
            {activeTab === 'settings' && (
              <div className="animate-[rise_0.35s_ease_both]">
                <div className="mb-6">
                  <h2 className="text-[32px] font-display font-extrabold text-brand-ink dark:text-[#f8ece9] tracking-tight">Account Settings</h2>
                  <p className="text-[15px] text-brand-muted dark:text-[#c2a8a9] mt-1">Manage your personal identity, login credentials, and account trust verifications.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
                  
                  <div className="space-y-6">
                    
                    {/* Personal Information */}
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6">
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-[12px] font-mono font-medium tracking-widest uppercase text-brand-muted dark:text-[#c2a8a9]">PERSONAL INFORMATION</span>
                        <button onClick={() => { setEditFullName(profile?.full_name || ''); setEditAvatarColor(profile?.avatar_color || AVATAR_OPTIONS[0]); setShowReadinessModal(false); setShowMfaModal(false); setShowDisableMfaModal(false); setShowEditProfileModal(true); }} className="text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit Information</button>
                      </div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-[52px] h-[52px] rounded-full ${userAvatarColor} flex items-center justify-center text-[18px] font-bold text-white shadow-sm`}>
                          {displayName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[17px] font-bold text-brand-ink dark:text-[#f8ece9]">{displayName}</p>
                          <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">{session?.user?.email}</p>
                        </div>
                      </div>
                      <div className="bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Email Verification
                        </div>
                        <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-ok dark:text-[#58cf92] bg-brand-okSoft dark:bg-[#173326] rounded-md">● EMAIL: VERIFIED</span>
                      </div>
                    </div>

                    {/* Security & Credentials */}
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6">
                      <span className="text-[12px] font-mono font-medium tracking-widest uppercase text-brand-muted dark:text-[#c2a8a9] block mb-5">SECURITY & CREDENTIALS</span>
                      <div className="flex items-center justify-between mb-6 pb-6 border-b border-brand-line dark:border-[#3b2328]">
                        <div>
                          <p className="text-[15.5px] font-bold text-brand-ink dark:text-[#f8ece9]">Password</p>
                          <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">Secure your account credentials.</p>
                        </div>
                        <button disabled={isSendingReset} onClick={handleSendResetPassword} className="px-3.5 py-2 text-[12.5px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-xl hover:border-brand-accent dark:hover:border-[#ff7d8b] transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSendingReset ? (
                            <svg className="animate-spin w-3.5 h-3.5 text-brand-accent dark:text-[#ff7d8b]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-brand-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          )}
                          {isSendingReset ? 'Sending Code...' : 'Change Password →'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[15.5px] font-bold text-brand-ink dark:text-[#f8ece9]">Two-Factor Authentication</p>
                          <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] mt-0.5 max-w-[200px]">Add an extra layer of security to your account.</p>
                        </div>
                        <button 
                          onClick={handleToggle2FA}
                          className={`relative flex-none w-[52px] h-[30px] rounded-full transition-colors duration-250 ${is2FAEnabled ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-line dark:bg-[#3b2328]'}`}
                        >
                          <span className={`absolute top-[3px] left-[3px] w-[24px] h-[24px] rounded-full bg-white shadow-sm transition-transform duration-250 ${is2FAEnabled ? 'translate-x-[22px]' : 'translate-x-0'}`}></span>
                        </button>
                      </div>
                    </div>

                  </div>

                  <div className="space-y-6">
                    
                    {/* Identity Verification (Didit) */}
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6">
                      <div className="flex items-center justify-between mb-5">
                        <span className="text-[12px] font-mono font-medium tracking-widest uppercase text-brand-muted dark:text-[#c2a8a9]">IDENTITY VERIFICATION</span>
                        <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1.5 ${idStatus === 'verified' ? 'bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92]' : 'bg-brand-bg dark:bg-[#150a0c] text-brand-muted dark:text-[#c2a8a9] border border-brand-line dark:border-[#3b2328]'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${idStatus === 'verified' ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-muted dark:bg-[#c2a8a9]'}`}></span>
                          {idStatus === 'verified' ? 'VERIFIED' : 'NOT VERIFIED'}
                        </span>
                      </div>
                      <h3 className="text-[20px] font-display font-extrabold text-brand-ink dark:text-[#f8ece9] mb-1.5 tracking-tight">Verify your identity</h3>
                      <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed mb-5">Confirm your identity to strengthen account accountability when coordinating with other BloodBuddy community members.</p>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                        {idStatus !== 'verified' ? (
                          <button onClick={handleStartDiditVerification} disabled={verifyingId} className="px-5 py-2.5 bg-brand-btn dark:bg-[#c9253a] text-white text-[13.5px] font-bold rounded-xl shadow-[0_8px_20px_-10px_#a4121f] hover:-translate-y-px transition flex items-center gap-2 whitespace-nowrap">
                            {verifyingId ? 'Loading...' : 'Verify Identity →'}
                          </button>
                        ) : (
                          <div className="px-5 py-2.5 bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92] border border-brand-ok/20 text-[13.5px] font-bold rounded-xl flex items-center gap-2 whitespace-nowrap">
                            ✓ Identity Confirmed
                          </div>
                        )}
                        <p className="text-[11.5px] text-brand-muted dark:text-[#c2a8a9] leading-tight">Identity verification is handled via secure Didit gateway.</p>
                      </div>

                      {verificationError && <p className="text-[12.5px] text-brand-crimsonHi mb-3">{verificationError}</p>}

                      <div className="bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl p-4">
                        <p className="text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1">Identity Verification Boundary</p>
                        <p className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">Identity verification confirms account identity only. It does not verify blood type, donor medical eligibility, or final blood compatibility.</p>
                      </div>
                    </div>

                    {/* Donor & Blood Config */}
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[24px] shadow-custom p-6">
                      <span className="text-[12px] font-mono font-medium tracking-widest uppercase text-brand-muted dark:text-[#c2a8a9] block mb-3.5">DONOR & BLOOD CONFIGURATION</span>
                      <p className="text-[13.5px] text-brand-ink dark:text-[#f8ece9] leading-relaxed mb-5">
                        Blood type settings and volunteer availability belong under <strong>Donation Requests → Blood & Donation</strong>.
                      </p>
                      <button onClick={() => setActiveTab('donation_requests')} className="px-4 py-2.5 text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-xl hover:border-brand-accent dark:hover:border-[#ff7d8b] transition">
                        Manage Blood & Donation Settings →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SETTINGS / SECURITY MODALS */}
          {showReadinessModal && createPortal(
            <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal="true" aria-labelledby="readiness-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !isSavingReadiness) setShowReadinessModal(false); }}>
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[520px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
                  <div><h3 id="readiness-modal-title" className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Donor Readiness Assessment</h3><p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">Please confirm these conditions before becoming visible as an available donor.</p></div>
                  <button type="button" onClick={() => setShowReadinessModal(false)} disabled={isSavingReadiness} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50" aria-label="Close donor readiness assessment">✕</button>
                </div>
                <form onSubmit={submitReadinessAssessment} className="space-y-4">
                  <div className="space-y-3">
                    {[
                      ['wellRested', 'I am well-rested and feel physically fit to donate.'],
                      ['noFever', 'I do not currently have a fever or significant illness.'],
                      ['noRecentTattoo', 'I have not recently had a tattoo or other procedure that should temporarily prevent donation.'],
                      ['understandsDisclaimer', 'I understand that this assessment does not replace professional medical screening.']
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-start gap-3 p-3.5 rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] cursor-pointer">
                        <input type="checkbox" checked={!!readinessAnswers[key]} onChange={(e) => { setReadinessAnswers(prev => ({ ...prev, [key]: e.target.checked })); if (readinessError) setReadinessError(''); }} disabled={isSavingReadiness} className="mt-0.5 w-4 h-4 accent-brand-btn flex-none" />
                        <span className="text-[13.5px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-[#332610] border border-amber-200 dark:border-amber-900/50 rounded-xl"><p className="text-[12.5px] leading-relaxed text-amber-800 dark:text-[#e8b64d]">Donor availability only makes your profile discoverable to potential requesters. Final eligibility, screening, and blood compatibility must be determined by qualified healthcare professionals.</p></div>
                  {readinessError && <p className="text-[12.5px] font-medium text-brand-crimsonHi dark:text-[#f2606f]" role="alert">{readinessError}</p>}
                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowReadinessModal(false)} disabled={isSavingReadiness} className="px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSavingReadiness} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 min-w-[180px]">{isSavingReadiness ? 'Saving...' : 'Confirm & Become Available'}</button>
                  </div>
                </form>
              </div>
            </div>, document.body
          )}

          {showEditProfileModal && createPortal(
            <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal="true" aria-labelledby="edit-profile-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !isSavingProfile) setShowEditProfileModal(false); }}>
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[500px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
                  <div><h3 id="edit-profile-modal-title" className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Edit Profile</h3><p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">Update the profile details you control.</p></div>
                  <button type="button" onClick={() => setShowEditProfileModal(false)} disabled={isSavingProfile} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50" aria-label="Close edit profile dialog">✕</button>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div><label htmlFor="edit-full-name" className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Full Name <span className="text-brand-accent">*</span></label><input id="edit-full-name" type="text" required minLength={2} value={editFullName} onChange={(e) => setEditFullName(e.target.value)} disabled={isSavingProfile} autoFocus className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent transition disabled:opacity-60" placeholder="Your full name" /></div>
                  <div><p className="text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-2">Avatar Color</p><div className="flex flex-wrap gap-2.5">{AVATAR_OPTIONS.map((avatarClass) => <button key={avatarClass} type="button" aria-label={`Choose avatar color ${avatarClass.replace('bg-[', '').replace(']', '')}`} onClick={() => setEditAvatarColor(avatarClass)} disabled={isSavingProfile} className={`w-9 h-9 rounded-full ${avatarClass} transition ring-offset-2 dark:ring-offset-[#25141a] ${editAvatarColor === avatarClass ? 'ring-2 ring-brand-accent' : 'hover:scale-105'}`}>{editAvatarColor === avatarClass && <span className="text-white text-sm font-bold">✓</span>}</button>)}</div></div>
                  <div className="pt-2 flex justify-end gap-3"><button type="button" onClick={() => setShowEditProfileModal(false)} disabled={isSavingProfile} className="px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition disabled:opacity-50">Cancel</button><button type="submit" disabled={isSavingProfile || !editFullName.trim()} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 min-w-[130px]">{isSavingProfile ? 'Saving...' : 'Save Changes'}</button></div>
                </form>
              </div>
            </div>, document.body
          )}

          {showMfaModal && createPortal(
            <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal="true" aria-labelledby="mfa-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !isEnrollingMfa) setShowMfaModal(false); }}>
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[500px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5"><div><h3 id="mfa-modal-title" className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Set Up Two-Factor Authentication</h3><p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">{mfaStep === 1 ? 'Use an authenticator app to protect your BloodBuddy account.' : 'Scan the QR code, then verify the generated code.'}</p></div><button type="button" onClick={() => setShowMfaModal(false)} disabled={isEnrollingMfa} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50" aria-label="Close MFA setup dialog">✕</button></div>
                {mfaStep === 1 ? <div className="space-y-5"><div className="p-4 rounded-xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328]"><p className="text-[13.5px] text-brand-ink dark:text-[#f8ece9] leading-relaxed">You will be shown a QR code from Supabase. Add it to an authenticator app, then enter the one-time code to finish enabling MFA.</p></div>{mfaError && <p className="text-[12.5px] font-medium text-brand-crimsonHi dark:text-[#f2606f]" role="alert">{mfaError}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setShowMfaModal(false)} disabled={isEnrollingMfa} className="px-4 py-2.5 text-[14px] font-bold text-brand-muted hover:text-brand-ink dark:hover:text-[#f8ece9] transition">Cancel</button><button type="button" onClick={startEnrollMfa} disabled={isEnrollingMfa} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 min-w-[140px]">{isEnrollingMfa ? 'Preparing...' : 'Start Setup'}</button></div></div> : <form onSubmit={verifyMfaCode} className="space-y-5"><div className="flex justify-center p-4 rounded-2xl bg-white border border-brand-line dark:border-[#3b2328]">{mfaQrCode ? <QRCodeSVG value={mfaQrCode} size={190} includeMargin /> : <div className="w-[190px] h-[190px] flex items-center justify-center text-sm text-brand-muted">QR code unavailable.</div>}</div><div><p className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9] mb-2">If you cannot scan the QR code, enter this secret manually:</p><div className="flex gap-2"><code className="flex-1 min-w-0 break-all px-3 py-2.5 rounded-xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] text-[12px] text-brand-ink dark:text-[#f8ece9]">{mfaSecret || 'Secret unavailable'}</code><button type="button" onClick={handleCopySecret} disabled={!mfaSecret} className="px-3 py-2.5 text-[12.5px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl disabled:opacity-50">Copy</button></div></div><div><label htmlFor="mfa-code" className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">6-digit authenticator code</label><input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={mfaVerifyCode} onChange={(e) => { const value=e.target.value.replace(/\D/g,'').slice(0,6); setMfaVerifyCode(value); if (mfaError) setMfaError(''); }} disabled={isEnrollingMfa} className="w-full text-center tracking-[0.25em] font-mono text-[18px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-accent transition disabled:opacity-60" placeholder="000000" /></div>{mfaError && <p className="text-[12.5px] font-medium text-brand-crimsonHi dark:text-[#f2606f]" role="alert">{mfaError}</p>}<div className="pt-2 flex justify-end gap-3"><button type="button" onClick={() => { if (isEnrollingMfa) return; setMfaStep(1); setMfaError(''); setMfaVerifyCode(''); }} disabled={isEnrollingMfa} className="px-4 py-2.5 text-[14px] font-bold text-brand-muted hover:text-brand-ink dark:hover:text-[#f8ece9] transition disabled:opacity-50">Back</button><button type="submit" disabled={isEnrollingMfa || mfaVerifyCode.length !== 6} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 min-w-[150px]">{isEnrollingMfa ? 'Verifying...' : 'Verify & Enable'}</button></div></form>}
              </div>
            </div>, document.body
          )}

          {showDisableMfaModal && createPortal(
            <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal="true" aria-labelledby="disable-mfa-modal-title" onMouseDown={(e) => { if (e.target === e.currentTarget && !isDisablingMfa) setShowDisableMfaModal(false); }}>
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[460px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5"><div><h3 id="disable-mfa-modal-title" className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Disable Two-Factor Authentication?</h3><p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">This removes the verified authenticator factor from your account.</p></div><button type="button" onClick={() => setShowDisableMfaModal(false)} disabled={isDisablingMfa} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50" aria-label="Close disable MFA dialog">✕</button></div>
                <div className="p-4 mb-5 bg-amber-50 dark:bg-[#332610] border border-amber-200 dark:border-amber-900/50 rounded-xl"><p className="text-[13.5px] leading-relaxed text-amber-800 dark:text-[#e8b64d]">Disabling MFA reduces account protection. Continue only if you intentionally want to remove the authenticator from this account.</p></div>
                <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowDisableMfaModal(false)} disabled={isDisablingMfa} className="px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition disabled:opacity-50">Cancel</button><button type="button" onClick={disableMfa} disabled={isDisablingMfa} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-sm transition disabled:opacity-70 min-w-[150px]">{isDisablingMfa ? 'Disabling...' : 'Disable MFA'}</button></div>
              </div>
            </div>, document.body
          )}

          {/* TASK 5: REVIEW REQUEST MODAL BEFORE DB SUBMISSION */}
          {showReviewModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60">
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[500px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]">
                <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
                  <div>
                    <h3 className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Review Request</h3>
                    <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">Please double-check your details.</p>
                  </div>
                  <button onClick={() => setShowReviewModal(false)} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition">✕</button>
                </div>
                
                <div className="space-y-3 mb-6 bg-brand-bg dark:bg-[#150a0c] p-5 rounded-2xl border border-brand-line dark:border-[#3b2328]">
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Patient:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{newRequest.patient_name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Blood Type:</span>
                    <span className="col-span-2 text-brand-accent dark:text-[#ff7d8b] font-bold">{newRequest.blood_type.replace('-', '−')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Hospital:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{newRequest.hospital_name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Location:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{newRequest.city}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Contact:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{newRequest.contact_number}</span>
                  </div>
                  {selectedDonor && (
                    <div className="grid grid-cols-3 gap-2 text-[14px] pt-3 mt-3 border-t border-brand-line dark:border-[#3b2328]">
                      <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Direct To:</span>
                      <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{selectedDonor.full_name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button onClick={() => { setShowReviewModal(false); setShowRequestModal(true); }} disabled={isSubmittingRequest} className="px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition disabled:opacity-50">Edit Details</button>
                  <button onClick={handleConfirmCreateRequest} disabled={isSubmittingRequest} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] rounded-xl shadow-[0_8px_20px_-10px_#a4121f] transition disabled:opacity-70 flex items-center justify-center min-w-[150px]">
                    {isSubmittingRequest ? 'Submitting...' : 'Confirm & Submit'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {activeChatRequest && session?.user && (
            <CoordinationChat
              request={activeChatRequest}
              currentUser={session.user}
              onClose={() => setActiveChatRequest(null)}
            />
          )}

          {reportingTarget && session?.user && (
            <ReportModal
              request={reportingTarget.request}
              targetUser={reportingTarget.targetUser}
              currentUser={session.user}
              onClose={() => setReportingTarget(null)}
              onSubmitted={() => {
                setReportingTarget(null);
                showToast('Report submitted successfully. Our team will review it.', 'success');
              }}
              showToast={showToast}
            />
          )}

          {/* REQUEST FORM MODAL */}
          {showRequestModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60">
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[600px] w-full p-7 md:p-8 shadow-custom max-h-[90vh] overflow-y-auto custom-scrollbar animate-[rise_0.2s_ease_both]">
                <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
                  <div>
                    <h3 className="font-display font-extrabold text-[24px] text-brand-ink dark:text-[#f8ece9]">Blood Request Form</h3>
                    {selectedDonor && <p className="text-[13px] text-brand-accent dark:text-[#ff7d8b] font-bold mt-1">Direct Request for: {selectedDonor.full_name} ({selectedDonor.blood_type.replace('-', '−')})</p>}
                  </div>
                  <button onClick={() => setShowRequestModal(false)} className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition">✕</button>
                </div>
                <form onSubmit={handleReviewRequest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Request For <span className="text-brand-accent">*</span></label>
                      <select value={newRequest.is_for_self} onChange={(e) => setNewRequest({ ...newRequest, is_for_self: e.target.value === 'true' })} className="w-full text-[15px] font-medium border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl px-4 py-3 bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent appearance-none">
                        <option value="true">Myself</option>
                        <option value="false">Someone else</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Needed Blood Type <span className="text-brand-accent">*</span></label>
                      <select disabled={!!selectedDonor} value={newRequest.blood_type} onChange={(e) => setNewRequest({ ...newRequest, blood_type: e.target.value })} className={`w-full text-[15px] font-medium border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-xl px-4 py-3 bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] focus:outline-none focus:border-brand-accent appearance-none ${selectedDonor ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {BLOOD_TYPES.filter(t => t !== "Not provided / I don't know").map(t => <option key={t} value={t}>{t.replace('-', '−')}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Patient Name <span className="text-brand-accent">*</span></label>
                    <input type="text" required value={newRequest.patient_name} onChange={(e) => setNewRequest({ ...newRequest, patient_name: e.target.value })} className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent" placeholder="Full Name" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Hospital / Medical Center <span className="text-brand-accent">*</span></label>
                    <input type="text" required value={newRequest.hospital_name} onChange={(e) => setNewRequest({ ...newRequest, hospital_name: e.target.value })} className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent" placeholder="e.g. Caloocan City Medical Center" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Location / City <span className="text-brand-accent">*</span></label>
                      <input type="text" required value={newRequest.city} onChange={(e) => setNewRequest({ ...newRequest, city: e.target.value })} className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent" placeholder="e.g. Quezon City" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Contact Number <span className="text-brand-accent">*</span></label>
                      <input type="text" required value={newRequest.contact_number} onChange={(e) => setNewRequest({ ...newRequest, contact_number: e.target.value })} className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent" placeholder="09123456789" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Additional Note <span className="text-brand-muted font-normal ml-1">Optional</span></label>
                    <textarea rows="3" value={newRequest.urgency_notes} onChange={(e) => setNewRequest({ ...newRequest, urgency_notes: e.target.value })} className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent custom-scrollbar" placeholder="e.g. Pre-surgery replacement units needed..." />
                  </div>
                  <div className="pt-5 flex justify-between items-center mt-2">
                    <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2.5 text-[14.5px] font-bold text-brand-muted hover:text-brand-ink dark:hover:text-[#f8ece9] transition">Cancel</button>
                    <button type="submit" className="px-6 py-3 text-[14.5px] font-bold text-brand-onBtn bg-brand-btn dark:bg-[#c9253a] hover:bg-brand-btnHover rounded-xl shadow-[0_8px_20px_-10px_#a4121f] transition flex items-center gap-2">Review Request →</button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

          {/* TASK 6: Acceptance Confirmation Modal */}
          {requestToAccept && createPortal(
            <div 
              className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60"
              role="dialog"
              aria-modal="true"
              aria-labelledby="accept-modal-title"
              aria-describedby="accept-modal-desc"
            >
              <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[500px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]">
                <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
                  <div>
                    <h3 id="accept-modal-title" className="font-display font-extrabold text-[22px] text-brand-ink dark:text-[#f8ece9]">Confirm Acceptance</h3>
                    <p id="accept-modal-desc" className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">Review your commitment before accepting.</p>
                  </div>
                  <button 
                    onClick={() => setRequestToAccept(null)} 
                    disabled={isAcceptingRequest}
                    className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50"
                    aria-label="Close confirmation dialog"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 mb-5 bg-brand-bg dark:bg-[#150a0c] p-5 rounded-2xl border border-brand-line dark:border-[#3b2328]">
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Requester:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{requestToAccept.profiles?.full_name || 'Unknown Requester'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Blood Type:</span>
                    <span className="col-span-2 text-brand-accent dark:text-[#ff7d8b] font-bold">{requestToAccept.blood_type ? requestToAccept.blood_type.replace('-', '−') : 'Not specified'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Hospital:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{requestToAccept.hospital_name || 'Not specified'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[14px]">
                    <span className="text-brand-muted dark:text-[#c2a8a9] font-medium">Location:</span>
                    <span className="col-span-2 text-brand-ink dark:text-[#f8ece9] font-bold">{requestToAccept.city || 'Not specified'}</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-[#332610] border border-amber-200 dark:border-amber-900/50 rounded-xl mb-5">
                  <p className="text-amber-800 dark:text-[#e8b64d] text-[13.5px] leading-relaxed">
                    <strong>Responsibility Acknowledgment:</strong><br/><br/>
                    By accepting this request, you agree to coordinate with <strong>{requestToAccept.profiles?.full_name || 'the requester'}</strong>. This does <strong>not</strong> guarantee that you can donate blood.<br/><br/>
                    Final medical screening, blood compatibility testing, and donation clearance must be handled by healthcare professionals at the facility.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    onClick={() => setRequestToAccept(null)} 
                    disabled={isAcceptingRequest}
                    className="px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmAccept} 
                    disabled={isAcceptingRequest}
                    className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-ok dark:bg-[#58cf92] dark:text-[#173326] rounded-xl shadow-sm hover:opacity-90 transition disabled:opacity-70 min-w-[175px] flex items-center justify-center"
                  >
                    {isAcceptingRequest ? 'Accepting...' : 'I Agree, Accept Request'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}