import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import bloodBuddyLogo from '../assets/bloodbuddy-logo-transparent.png';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function LandingPage({
  onOpenAuth,
  session = null,
  profile = null,
  incomingRequestsCount = 0,
  onNavigateTo = () => {},
  onSignOut = () => {},
  onRequestDonor = () => {},
  theme: propTheme,
  onToggleTheme
}) {
  const [localTheme, setLocalTheme] = useState(localStorage.getItem('theme') || 'light');
  const theme = propTheme || localTheme;

  const [selectedType, setSelectedType] = useState('');
  const [location, setLocation] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeGuideType, setActiveGuideType] = useState('A+');
  const [demoSwitchOn, setDemoSwitchOn] = useState(false);
  const [activeNav, setActiveNav] = useState('home'); // SCROLL TRACKER STATE
  const dropdownRef = useRef(null);

  const [searchError, setSearchError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [floatingDonors, setFloatingDonors] = useState([]);

  // Theme Sync
  useEffect(() => {
    if (!propTheme) {
      if (localTheme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [localTheme, propTheme]);

  const toggleTheme = () => {
    if (onToggleTheme) onToggleTheme();
    else setLocalTheme(localTheme === 'light' ? 'dark' : 'light');
  };

  // Click Outside Dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll Tracker Logic (ScrollSpy)
  useEffect(() => {
    const handleScroll = () => {
      const howSection = document.getElementById('how');
      const donorsSection = document.getElementById('donors');
      const scrollPosition = window.scrollY + 200; // Offset para sa sticky header

      if (donorsSection && scrollPosition >= donorsSection.offsetTop) {
        setActiveNav('donors');
      } else if (howSection && scrollPosition >= howSection.offsetTop) {
        setActiveNav('how');
      } else {
        setActiveNav('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Floating Database Tags
  useEffect(() => {
    const fetchRecentDonors = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, blood_type, city')
        .eq('is_available_donor', true)
        .eq('id_verification_status', 'verified')
        .neq('blood_type', "Not provided / I don't know")
        .limit(4);

      if (data && data.length > 0) {
        const tagStyles = [
          { pos: 'top-[6%] left-0', delay: '0s' },
          { pos: 'top-[30%] -right-[2%]', delay: '1.5s' },
          { pos: 'bottom-[22%] -left-[3%]', delay: '3s' },
          { pos: 'bottom-[4%] right-[6%]', delay: '4.5s' }
        ];
        const realDonors = data.map((donor, index) => ({
          ...donor, city: donor.city || 'Metro Manila', pos: tagStyles[index % 4].pos, delay: tagStyles[index % 4].delay
        }));
        setFloatingDonors(realDonors);
      } else {
        setFloatingDonors([]);
      }
    };
    fetchRecentDonors();
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) {
      setSearchError(true);
      return;
    }
    setSearchError(false);
    setIsSearching(true);
    setSearchExecuted(true);

    let query = supabase.from('profiles').select('id, full_name, blood_type, city').eq('is_available_donor', true).eq('id_verification_status', 'verified').eq('blood_type', selectedType);
    if (location.trim()) query = query.ilike('city', `%${location.trim()}%`);

    const { data } = await query.limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const FROM = {
    'O-': ['O-'], 'O+': ['O+', 'O-'], 'A-': ['A-', 'O-'], 'A+': ['A+', 'A-', 'O+', 'O-'],
    'B-': ['B-', 'O-'], 'B+': ['B+', 'B-', 'O+', 'O-'], 'AB-': ['AB-', 'A-', 'B-', 'O-'], 'AB+': [...BLOOD_TYPES]
  };
  const getCanDonateTo = (type) => BLOOD_TYPES.filter(t => FROM[t]?.includes(type));

  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
  const displayBloodType = profile?.blood_type && profile.blood_type !== "Not provided / I don't know" ? profile.blood_type.replace('-', '−') : 'Not set';
  const userAvatarColor = profile?.avatar_color || 'bg-[#c9253a]';

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] font-body flex flex-col transition-colors duration-300">
      
      {/* PERFECT HEADER */}
      <header className="sticky top-0 z-50 bg-brand-bg/90 dark:bg-[#150a0c]/90 backdrop-blur-md border-b border-brand-line dark:border-[#3b2328] transition-colors duration-300">
        <div className="max-w-[1160px] mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between">
          <a href="#top" onClick={(e) => { if(session) { e.preventDefault(); onNavigateTo('home'); } }} className="flex items-center gap-2.5 font-display font-extrabold text-[22px] tracking-tight text-brand-ink dark:text-[#f8ece9] hover:opacity-80 transition">
            <img src={bloodBuddyLogo} alt="BloodBuddy" className="w-[50px] h-[50px] flex-none object-contain" />
            BloodBuddy
          </a>

          <ul className="hidden md:flex gap-8 items-center font-bold text-[14.5px] text-brand-muted dark:text-[#c2a8a9]">
            <li>
              <a href="#top" onClick={(e) => { if(session) { e.preventDefault(); onNavigateTo('home'); } }} className={`block pb-1 border-b-[2.5px] transition ${activeNav === 'home' ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-ink dark:text-[#f8ece9]' : 'border-transparent hover:text-brand-ink dark:hover:text-[#f8ece9]'}`}>
                Home
              </a>
            </li>
            <li>
              <a href="#donors" onClick={(e) => { if(session) { e.preventDefault(); onNavigateTo('dashboard', 'donation_requests'); } }} className={`block pb-1 border-b-[2.5px] transition ${activeNav === 'donors' ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-ink dark:text-[#f8ece9]' : 'border-transparent hover:text-brand-ink dark:hover:text-[#f8ece9]'}`}>
                Donate blood
              </a>
            </li>
            <li>
              <a href="#how" className={`block pb-1 border-b-[2.5px] transition ${activeNav === 'how' ? 'border-brand-accent dark:border-[#ff7d8b] text-brand-ink dark:text-[#f8ece9]' : 'border-transparent hover:text-brand-ink dark:hover:text-[#f8ece9]'}`}>
                About us
              </a>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 mr-1 text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-white transition">
              {theme === 'dark' ? (
                <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {session ? (
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
                      <button onClick={() => { setIsProfileOpen(false); onNavigateTo('dashboard', 'my_requests'); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-medium text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                        <svg className="w-[18px] h-[18px] text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        My Blood Requests
                      </button>
                      <button onClick={() => { setIsProfileOpen(false); onNavigateTo('dashboard', 'donation_requests'); }} className="w-full flex items-center justify-between px-3.5 py-2.5 text-[14px] font-medium text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                        <div className="flex items-center gap-3">
                          <svg className="w-[18px] h-[18px] text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                          Donation Requests
                        </div>
                        {incomingRequestsCount > 0 && <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 bg-brand-btn text-white text-[11px] font-bold rounded-full">{incomingRequestsCount}</span>}
                      </button>
                      <button onClick={() => { setIsProfileOpen(false); onNavigateTo('dashboard', 'settings'); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-medium text-brand-ink dark:text-[#f8ece9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-xl transition">
                        <svg className="w-[18px] h-[18px] text-brand-muted dark:text-[#c2a8a9]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                        Account Settings
                      </button>
                    </div>
                    <div className="p-2 border-t border-brand-line dark:border-[#3b2328]">
                      <button onClick={() => { setIsProfileOpen(false); onSignOut(); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[14px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:bg-brand-blush dark:hover:bg-[#3a1a20] rounded-xl transition">
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => onOpenAuth(true)} className="hidden md:inline-flex px-4 py-2 font-bold text-[14.5px] bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border border-brand-line dark:border-[#3b2328] rounded-xl hover:border-brand-accent dark:hover:border-[#ff7d8b] transition">
                  Log in
                </button>
                <button onClick={() => onOpenAuth(false)} className="inline-flex px-4 py-2 font-bold text-[14.5px] bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn rounded-xl shadow-[0_8px_20px_-10px_#a4121f] dark:shadow-[0_8px_20px_-10px_#c9253a] hover:bg-brand-btnHover dark:hover:bg-[#e03349] hover:-translate-y-px transition">
                  Register
                </button>
              </>
            )}

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden flex items-center justify-center w-11 h-11 border border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] rounded-xl text-brand-ink dark:text-[#f8ece9]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <ul className="md:hidden absolute left-0 right-0 top-full flex flex-col gap-0.5 px-4 pb-4 bg-brand-bg dark:bg-[#150a0c] border-b border-brand-line dark:border-[#3b2328] shadow-custom">
            <li><a href="#top" onClick={(e) => { setIsMenuOpen(false); if(session) { e.preventDefault(); onNavigateTo('home'); } }} className={`block py-3.5 px-3 font-semibold text-[15px] rounded-lg transition ${activeNav === 'home' ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>Home</a></li>
            <li>
              {session ? (
                <button onClick={() => { setIsMenuOpen(false); onNavigateTo('dashboard', 'donation_requests'); }} className="w-full text-left py-3.5 px-3 font-semibold text-[15px] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-lg">Donate blood</button>
              ) : (
                <a href="#donors" onClick={() => setIsMenuOpen(false)} className={`block py-3.5 px-3 font-semibold text-[15px] rounded-lg transition ${activeNav === 'donors' ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>Donate blood</a>
              )}
            </li>
            <li><a href="#how" onClick={() => setIsMenuOpen(false)} className={`block py-3.5 px-3 font-semibold text-[15px] rounded-lg transition ${activeNav === 'how' ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013]'}`}>About us</a></li>
            {!session && (
              <li><button onClick={() => { setIsMenuOpen(false); onOpenAuth(true); }} className="w-full text-left py-3.5 px-3 font-semibold text-[15px] text-brand-muted dark:text-[#c2a8a9] hover:bg-brand-bg2 dark:hover:bg-[#1e1013] rounded-lg">Log in</button></li>
            )}
          </ul>
        )}
      </header>

      <main id="top" className="bg-brand-bg dark:bg-[#150a0c]">
        {/* Hero Section */}
        <section className="relative pt-10 pb-32 md:pt-20 md:pb-36 overflow-hidden">
          <div className="absolute inset-x-0 -top-16 bottom-0 -z-10 bg-[radial-gradient(60%_70%_at_85%_30%,#fbe3e0,transparent_70%),radial-gradient(40%_50%_at_0%_0%,#f4e7e1,transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_85%_30%,#3a1a20,transparent_70%),radial-gradient(40%_50%_at_0%_0%,#1e1013,transparent_70%)] transition-colors duration-300"></div>

          <div className="max-w-[1160px] mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-8 md:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] font-mono text-[12.5px] tracking-widest uppercase">
                Community blood matching
              </span>
              <h1 className="font-display font-extrabold text-[42px] md:text-[84px] leading-[1.08] tracking-tight mt-5 text-balance text-brand-ink dark:text-[#f8ece9]">
                Find blood when <span className="animate-pulse-seq-1">every</span> <span className="animate-pulse-seq-2">second</span> <span className="animate-pulse-seq-3">counts.</span>
              </h1>
              
              <p className="mt-8 text-[17px] md:text-[20px] text-brand-muted dark:text-[#c2a8a9] max-w-[34em] leading-relaxed">
                BloodBuddy connects families in urgent need directly with nearby volunteer donors, making it simple and fast to coordinate support when hospitals experience blood shortages.
              </p>
            </div>
            
            <div className="relative w-full max-w-[360px] mx-auto aspect-[1/1.08]">
              <div className="absolute inset-[6%_12%_0] drop-shadow-[0_28px_36px_rgba(111,8,24,0.45)] dark:drop-shadow-[0_28px_36px_rgba(255,125,139,0.15)]">
                <svg viewBox="0 0 200 216" className="w-full h-full block">
                  <defs><linearGradient id="dg" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#e5424f"/><stop offset=".55" stopColor="#b3182a"/><stop offset="1" stopColor="#6f0818"/></linearGradient></defs>
                  <path d="M100 6C100 6 22 98 22 148a78 78 0 0 0 156 0C178 98 100 6 100 6Z" fill="url(#dg)"/>
                  <path d="M58 150c0-24 14-46 30-68" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="9" strokeLinecap="round"/>
                  <path className="animate-draw" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" d="M44 148H78L88 148L98 116L112 178L124 134L132 148H156"/>
                </svg>
              </div>
              
              {floatingDonors.map((tag) => (
                <span key={tag.id} className={`absolute ${tag.pos} animate-float-db font-mono font-medium text-[13px] md:text-[15px] px-3.5 py-2 rounded-full bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border border-brand-line dark:border-[#3b2328] shadow-custom`} style={{ animationDelay: tag.delay }}>
                  <b className="text-brand-accent dark:text-[#ff7d8b]">{tag.blood_type.replace('-', '−')}</b> in {tag.city}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Search Card Section */}
        <div className="max-w-[1160px] mx-auto px-4 md:px-6 relative z-10 -mt-24 md:-mt-32">
          <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-3xl p-5 md:p-7 shadow-custom max-w-[960px] mx-auto transition-colors duration-300">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3.5 items-end" noValidate>
              <div className="flex flex-col gap-1.5 relative pb-5">
                <label className="flex justify-between gap-2 text-[13.5px] font-bold text-slate-700 dark:text-[#c2a8a9]">
                  <span>Blood type needed <span className="text-brand-accent dark:text-[#ff7d8b]">*</span></span>
                </label>
                <select value={selectedType} onChange={(e) => { setSelectedType(e.target.value); setSearchError(false); }} className={`w-full text-base text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border-[1.5px] ${searchError ? 'border-red-500' : 'border-brand-line dark:border-[#3b2328]'} rounded-2xl px-4 h-[54px] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] transition appearance-none bg-no-repeat bg-[right_16px_center]`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1.5 7 7.5l6-6' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")` }}>
                  <option value="">Select blood type (e.g. A+, O−, B+)</option>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt.replace('-', '−')}</option>)}
                </select>
                {searchError && <span className="absolute bottom-0 left-0 text-red-500 dark:text-[#ff7d8b] text-[13.5px] font-semibold">Choose the blood type you need.</span>}
              </div>

              <div className="flex flex-col gap-1.5 relative pb-5">
                <label className="flex justify-between gap-2 text-[13.5px] font-bold text-slate-700 dark:text-[#c2a8a9]">
                  <span>City or area</span>
                </label>
                <input type="text" placeholder="e.g. Caloocan City or Quezon City" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full text-base text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-2xl px-4 h-[54px] focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] transition" />
              </div>

              <div className="pb-5">
                <button type="submit" disabled={isSearching} className="w-full md:w-auto h-[54px] px-[26px] font-bold text-base bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn rounded-2xl shadow-[0_8px_20px_-10px_#a4121f] dark:shadow-[0_8px_20px_-10px_#c9253a] hover:bg-brand-btnHover dark:hover:bg-[#e03349] transition flex items-center justify-center gap-2 disabled:opacity-70">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  {isSearching ? 'Searching...' : 'Search donors'}
                </button>
              </div>
            </form>

            {searchExecuted && (
              <div className="mt-2 pt-6 border-t border-brand-line dark:border-[#3b2328] animate-[rise_0.35s_ease_both]">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-[#f8ece9] mb-4 uppercase tracking-wider font-mono">
                  Available Verified Donors ({searchResults.length})
                </h3>
                {searchResults.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-brand-line dark:border-[#3b2328] rounded-2xl">
                    <p className="text-sm text-brand-muted dark:text-[#c2a8a9]">No active verified donors found matching the filters. Try a different area.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {searchResults.map(donor => (
                      <div key={donor.id} className="p-4 border rounded-2xl border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <p className="text-[14px] font-bold text-slate-900 dark:text-[#f8ece9]">{donor.full_name}</p>
                              <svg className="w-3 h-3 text-brand-ok dark:text-[#58cf92]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="text-[12px] text-brand-muted dark:text-[#c2a8a9]">{donor.city || 'Metro Manila'}</p>
                          </div>
                          <span className="px-2.5 py-1 text-[13px] font-bold text-brand-accent dark:text-[#ff7d8b] bg-brand-blush dark:bg-[#3a1a20] rounded-lg">{donor.blood_type.replace('-', '−')}</span>
                        </div>
                        {session ? (
                          donor.id !== session.user.id ? (
                            <button onClick={() => onRequestDonor(donor)} className="w-full py-2 text-[13px] font-bold text-brand-btn dark:text-[#f8ece9] border border-brand-btn dark:border-[#c9253a] hover:bg-brand-btn dark:hover:bg-[#c9253a] hover:text-white rounded-xl transition">
                              Request This Donor
                            </button>
                          ) : (
                            <span className="w-full py-2 text-center text-[12px] text-brand-muted italic">Your Donor Profile</span>
                          )
                        ) : (
                          <button onClick={() => { onRequestDonor(donor); onOpenAuth(true); }} className="w-full py-2 text-[13px] font-bold text-brand-btn dark:text-[#f8ece9] border border-brand-btn dark:border-[#c9253a] hover:bg-brand-btn dark:hover:bg-[#c9253a] hover:text-white rounded-xl transition">
                            Login to Request
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[960px] mx-auto mt-10">
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px] flex-none text-brand-accent dark:text-[#ff7d8b] mt-0.5"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/></svg>
              <div>
                <strong className="block text-[15px] font-bold text-brand-ink dark:text-[#f8ece9]">Real-time status</strong>
                <span className="block text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">Availability is updated by donors themselves.</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px] flex-none text-brand-accent dark:text-[#ff7d8b] mt-0.5"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg>
              <div>
                <strong className="block text-[15px] font-bold text-brand-ink dark:text-[#f8ece9]">100% voluntary</strong>
                <span className="block text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">No fees or commercial middlemen.</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px] flex-none text-brand-accent dark:text-[#ff7d8b] mt-0.5"><path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>
              <div>
                <strong className="block text-[15px] font-bold text-brand-ink dark:text-[#f8ece9]">Hospital screening</strong>
                <span className="block text-[13.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">Final health tests are done at the facility.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Steps Section */}
        <section id="how" className="py-16 md:py-24 px-4 md:px-6 max-w-[1160px] mx-auto scroll-mt-24">
          <div className="max-w-[640px]">
            <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">Community workflow</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl mt-3 text-balance tracking-tight text-brand-ink dark:text-[#f8ece9]">How BloodBuddy works</h2>
            <p className="mt-3.5 text-brand-muted dark:text-[#c2a8a9] text-base">A simple three-step flow built for urgent times.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-11">
            <article className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[22px] p-6 pb-7 shadow-custom relative">
              <div className="font-display font-extrabold text-[56px] leading-none text-brand-accent dark:text-[#ff7d8b] opacity-90">1</div>
              <h3 className="font-display font-extrabold text-2xl mt-3.5 tracking-tight text-brand-ink dark:text-[#f8ece9]">Post or search</h3>
              <p className="mt-2.5 text-brand-muted dark:text-[#c2a8a9] text-base">Pick the blood type and area. Tell us if the blood is for you or someone else, and share only what is needed.</p>
            </article>
            <article className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[22px] p-6 pb-7 shadow-custom relative md:translate-y-[18px]">
              <div className="font-display font-extrabold text-[56px] leading-none text-brand-accent dark:text-[#ff7d8b] opacity-90">2</div>
              <h3 className="font-display font-extrabold text-2xl mt-3.5 tracking-tight text-brand-ink dark:text-[#f8ece9]">Donors respond</h3>
              <p className="mt-2.5 text-brand-muted dark:text-[#c2a8a9] text-base">Available donors nearby review the request and accept or decline. Accepting means they are willing to coordinate.</p>
            </article>
            <article className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[22px] p-6 pb-7 shadow-custom relative md:translate-y-[36px]">
              <div className="font-display font-extrabold text-[56px] leading-none text-brand-accent dark:text-[#ff7d8b] opacity-90">3</div>
              <h3 className="font-display font-extrabold text-2xl mt-3.5 tracking-tight text-brand-ink dark:text-[#f8ece9]">Coordinate safely</h3>
              <p className="mt-2.5 text-brand-muted dark:text-[#c2a8a9] text-base">Once a donor accepts, a private chat for that request opens. Phone numbers stay hidden. The hospital screens before any donation.</p>
            </article>
          </div>
        </section>

        {/* Blood Type Guide Band */}
        <section className="bg-brand-bg2 dark:bg-[#1e1013] py-16 md:py-24 transition-colors duration-300">
          <div className="max-w-[1160px] mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-8 md:gap-16 items-center">
            <div>
              <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">Blood type guide</span>
              <h2 className="font-display font-extrabold text-[32px] md:text-[52px] tracking-tight mt-3 text-balance text-brand-ink dark:text-[#f8ece9]">Who can give to whom?</h2>
              <p className="mt-3.5 text-brand-muted dark:text-[#c2a8a9]">Tap a blood type to see which donors are usually compatible. Not sure of yours? That is fine. A hospital can test it.</p>
              <div className="grid grid-cols-4 gap-2.5 mt-7">
                {BLOOD_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveGuideType(t)}
                    className={`h-16 rounded-2xl border-[1.5px] font-display font-extrabold text-2xl transition hover:-translate-y-0.5 ${
                      activeGuideType === t 
                        ? 'bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn border-brand-btn dark:border-[#c9253a] shadow-[0_10px_22px_-12px_#a4121f] dark:shadow-[0_10px_22px_-12px_#c9253a]' 
                        : 'bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] hover:border-brand-accent dark:hover:border-[#ff7d8b]'
                    }`}
                  >
                    {t.replace('-', '−')}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-3xl p-6 md:p-8 shadow-custom">
              <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">Selected</span>
              <h3 className="font-display font-extrabold text-2xl md:text-3xl mt-1 tracking-tight text-brand-ink dark:text-[#f8ece9]">{activeGuideType.replace('-', '−')} can receive from</h3>
              
              <div className="mt-5">
                <small className="block text-[12.5px] tracking-[0.1em] uppercase text-brand-muted dark:text-[#c2a8a9] font-mono mb-2">Can receive from</small>
                <div className="flex flex-wrap gap-2">
                  {FROM[activeGuideType].map(t => (
                    <span key={t} className={`font-mono font-medium text-[15px] px-3 py-1.5 rounded-[10px] border min-w-[52px] text-center ${t === activeGuideType ? 'bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn border-brand-btn dark:border-[#c9253a]' : 'bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328]'}`}>
                      {t.replace('-', '−')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <small className="block text-[12.5px] tracking-[0.1em] uppercase text-brand-muted dark:text-[#c2a8a9] font-mono mb-2">Can donate to</small>
                <div className="flex flex-wrap gap-2">
                  {getCanDonateTo(activeGuideType).map(t => (
                    <span key={t} className={`font-mono font-medium text-[15px] px-3 py-1.5 rounded-[10px] border min-w-[52px] text-center ${t === activeGuideType ? 'bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn border-brand-btn dark:border-[#c9253a]' : 'bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328]'}`}>
                      {t.replace('-', '−')}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-5 pt-4 border-t border-brand-line dark:border-[#3b2328] text-[14px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">
                Based on red blood cell compatibility. BloodBuddy does not test blood or confirm eligibility. The hospital makes the final match.
              </p>
            </div>
          </div>
        </section>

        {/* Donor Pitch Section */}
        <section id="donors" className="py-16 md:py-24 scroll-mt-24">
          <div className="max-w-[1160px] mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-[72px] items-center">
            <div>
              <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">For donors</span>
              <h2 className="font-display font-extrabold text-[32px] md:text-[52px] tracking-tight mt-3 text-balance text-brand-ink dark:text-[#f8ece9]">You decide when you're available.</h2>
              <p className="mt-3.5 text-brand-muted dark:text-[#c2a8a9]">Switch on "Available to Donate" and nearby requesters can find you. Switch it off whenever life gets busy.</p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-brand-muted dark:text-[#c2a8a9]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mt-0.5 text-brand-accent dark:text-[#ff7d8b] flex-none"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>One tap to show or hide your profile</li>
                <li className="flex items-start gap-3 text-brand-muted dark:text-[#c2a8a9]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mt-0.5 text-brand-accent dark:text-[#ff7d8b] flex-none"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Accept or decline each request on your own terms</li>
                <li className="flex items-start gap-3 text-brand-muted dark:text-[#c2a8a9]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mt-0.5 text-brand-accent dark:text-[#ff7d8b] flex-none"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>Your contact details stay private until you accept</li>
              </ul>
            </div>
            <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[26px] p-6 md:p-8 shadow-custom max-w-[440px] w-full mx-auto">
              <div className="flex items-center justify-between gap-4">
                <strong className="font-display font-bold text-2xl tracking-tight text-brand-ink dark:text-[#f8ece9]">Available to Donate</strong>
                <button 
                  onClick={() => setDemoSwitchOn(!demoSwitchOn)}
                  className={`relative flex-none w-[68px] h-[38px] rounded-full transition-colors duration-250 ${demoSwitchOn ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-line dark:bg-[#3b2328]'}`}
                >
                  <span className={`absolute top-1 left-1 w-[30px] h-[30px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-transform duration-250 ${demoSwitchOn ? 'translate-x-[30px]' : 'translate-x-0'}`}></span>
                </button>
              </div>
              <div className={`flex items-center gap-3 mt-5 px-4 py-3.5 rounded-2xl transition-colors duration-250 text-[15px] ${demoSwitchOn ? 'bg-brand-okSoft dark:bg-[#173326] text-brand-ok dark:text-[#58cf92]' : 'bg-brand-bg2 dark:bg-[#1e1013] text-brand-muted dark:text-[#c2a8a9]'}`}>
                <i className={`relative w-3 h-3 rounded-full flex-none ${demoSwitchOn ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-muted dark:bg-[#c2a8a9]'}`}>
                  {demoSwitchOn && <span className="absolute inset-0 rounded-full bg-brand-ok dark:bg-[#58cf92] animate-ping"></span>}
                </i>
                <span>{demoSwitchOn ? "You're visible. Nearby requesters can reach you." : "You're hidden. Nobody sees you in searches."}</span>
              </div>
              <p className="mt-4 text-[13.5px] text-brand-muted dark:text-[#c2a8a9]">Try the switch. This is a preview of the donor setting.</p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        {!session && (
          <section className="px-4 md:px-6 pb-12">
            <div className="max-w-[1160px] mx-auto relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-crimsonHi dark:from-[#f2606f] to-brand-crimsonDeep dark:to-[#8f1224] text-white p-8 md:p-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-7 items-center">
              <div className="absolute -right-[60px] -top-[80px] w-[340px] h-[340px] rounded-full bg-white/10 pointer-events-none"></div>
              <div className="relative z-10">
                <h2 className="font-display font-extrabold text-3xl md:text-[54px] text-balance tracking-tight">Every drop counts.</h2>
                <p className="mt-3 text-white/85 max-w-[30em]">Join the community. Ask for help when you need it, or be the person who answers.</p>
              </div>
              <div className="relative z-10 flex flex-wrap gap-3">
                <button onClick={() => onOpenAuth(false)} className="px-5 py-2.5 bg-white text-[#7a0d1a] dark:text-[#8f1224] font-bold rounded-xl hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)] transition">Register</button>
                <button onClick={() => onOpenAuth(true)} className="px-5 py-2.5 bg-transparent border border-white/55 text-white font-bold rounded-xl hover:bg-white/10 transition">Log in</button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-brand-line dark:border-[#3b2328] py-12 px-4 md:px-6 text-[14px] text-brand-muted dark:text-[#c2a8a9] transition-colors duration-300">
        <div className="max-w-[1160px] mx-auto flex flex-wrap justify-between gap-6">
          <div>
            <a href="#top" className="block font-display font-extrabold text-xl text-brand-ink dark:text-[#f8ece9] mb-3 tracking-tight">BloodBuddy</a>
            <p className="max-w-[46em] text-[11px] leading-relaxed">
              BloodBuddy helps people find volunteer donors. It does not verify blood type, donor eligibility or compatibility. Screening and testing are done by accredited healthcare facilities. No payments for blood donations are allowed on the platform.
            </p>
          </div>
          <p className="max-w-[20em] text-[10px] text-slate-500 dark:text-[#c2a8a9]">A project of the Computer Studies Department, University of Caloocan City, Congress Campus.</p>
        </div>
      </footer>
    </div>
  );
}