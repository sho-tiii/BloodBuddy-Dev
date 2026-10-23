import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import bloodBuddyLogo from '../assets/bloodbuddy-logo-transparent.png';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PH_CITIES = [
  "Alaminos City",
  "Angeles City",
  "Antipolo City",
  "Bacoor City",
  "Bacolod City",
  "Bago City",
  "Baguio City",
  "Bais City",
  "Balanga City",
  "Baliwag City",
  "Batac City",
  "Batangas City",
  "Bayawan City",
  "Baybay City",
  "Bayugan City",
  "Biñan City",
  "Bislig City",
  "Bogo City",
  "Borongan City",
  "Butuan City",
  "Cabadbaran City",
  "Cabanatuan City",
  "Cabuyao City",
  "Cadiz City",
  "Cagayan de Oro City",
  "Calaca City",
  "Calamba City",
  "Calapan City",
  "Calbayog City",
  "Caloocan City",
  "Candon City",
  "Canlaon City",
  "Carmona City",
  "Catbalogan City",
  "Cauayan City",
  "Cavite City",
  "Cebu City",
  "Cotabato City",
  "Dagupan City",
  "Danao City",
  "Dapitan City",
  "Dasmariñas City",
  "Davao City",
  "Digos City",
  "Dipolog City",
  "Dumaguete City",
  "El Salvador City",
  "Escalante City",
  "Gapan City",
  "General Santos City",
  "General Trias City",
  "Gingoog City",
  "Guihulngan City",
  "Himamaylan City",
  "Ilagan City",
  "Iligan City",
  "Iloilo City",
  "Imus City",
  "Iriga City",
  "Isabela City (Basilan)",
  "Kabankalan City",
  "Kidapawan City",
  "Koronadal City",
  "La Carlota City",
  "Lamitan City",
  "Laoag City",
  "Lapu-Lapu City",
  "Las Piñas City",
  "Legazpi City",
  "Ligao City",
  "Lipa City",
  "Lucena City",
  "Mabalacat City",
  "Makati City",
  "Malabon City",
  "Malaybalay City",
  "Malolos City",
  "Mandaluyong City",
  "Mandaue City",
  "Manila City",
  "Marawi City",
  "Marikina City",
  "Masbate City",
  "Mati City",
  "Meycauayan City",
  "Muntinlupa City",
  "Naga City (Camarines Sur)",
  "Naga City (Cebu)",
  "Navotas City",
  "Olongapo City",
  "Ormoc City",
  "Oroquieta City",
  "Ozamiz City",
  "Pagadian City",
  "Palayan City",
  "Panabo City",
  "Parañaque City",
  "Pasay City",
  "Passi City",
  "Puerto Princesa City",
  "Quezon City",
  "Roxas City",
  "Sagay City",
  "Samal City (Davao del Norte)",
  "San Carlos City (Negros Occidental)",
  "San Carlos City (Pangasinan)",
  "San Fernando City (La Union)",
  "San Fernando City (Pampanga)",
  "San Jose City (Nueva Ecija)",
  "San Jose del Monte City (Bulacan)",
  "San Juan City",
  "San Pablo City (Laguna)",
  "San Pedro City (Laguna)",
  "Santa Rosa City (Laguna)",
  "Santiago City (Isabela)",
  "Santo Tomas City (Batangas)",
  "Science City of Muñoz (Nueva Ecija)",
  "Silay City",
  "Sipalay City",
  "Sorsogon City",
  "Surigao City",
  "Tabaco City",
  "Tabuk City",
  "Tacloban City",
  "Tacurong City",
  "Tagaytay City",
  "Tagbilaran City",
  "Taguig City",
  "Tagum City",
  "Talisay City (Cebu)",
  "Talisay City (Negros Occidental)",
  "Tanauan City (Batangas)",
  "Tangub City",
  "Tanjay City",
  "Tarlac City",
  "Tayabas City",
  "Toledo City",
  "Trece Martires City",
  "Tuguegarao City",
  "Urdaneta City",
  "Valencia City (Bukidnon)",
  "Valenzuela City",
  "Victorias City",
  "Vigan City",
  "Zamboanga City"
];

// Red blood cell compatibility: key = recipient, value = donors they can receive from
const FROM = {
  'O-': ['O-'], 'O+': ['O+', 'O-'], 'A-': ['A-', 'O-'], 'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'], 'B+': ['B+', 'B-', 'O+', 'O-'], 'AB-': ['AB-', 'A-', 'B-', 'O-'], 'AB+': [...BLOOD_TYPES]
};
const getCanDonateTo = (type) => BLOOD_TYPES.filter(t => FROM[t]?.includes(type));

// Dot positions (percent) inside a well. CLUMP = where dots gather when they agglutinate.
const SCATTER = [[22, 24], [42, 16], [68, 22], [84, 42], [30, 48], [56, 40], [76, 64], [24, 70], [48, 74], [68, 82], [88, 74], [14, 50], [60, 60], [40, 34]];
const CLUMP = SCATTER.map(([x, y]) => [50 + (x - 50) * 0.14, 50 + (y - 50) * 0.14]);
const BUBBLES = [
  { l: 18, d: 0, s: 8 }, { l: 38, d: 0.35, s: 6 }, { l: 60, d: 0.7, s: 10 },
  { l: 78, d: 1.05, s: 7 }, { l: 28, d: 1.3, s: 5 }, { l: 52, d: 1.6, s: 9 }
];

// Reagents used in a real blood typing test
const REAGENTS = [
  { id: 'A', label: 'Anti-A', tint: '#dbeafe', hint: 'Clumps if the red cells carry the A antigen.' },
  { id: 'B', label: 'Anti-B', tint: '#fef3c7', hint: 'Clumps if the red cells carry the B antigen.' },
  { id: 'D', label: 'Anti-D (Rh)', tint: '#ecfdf5', hint: 'Clumps if the red cells carry the D antigen, which means Rh-positive.' }
];

const GLOBAL_CSS = `
@keyframes bbRise { 0% { transform: translateY(0) scale(.6); opacity: 0; } 15% { opacity: .9; } 100% { transform: translateY(-190px) scale(1.05); opacity: 0; } }
@keyframes bbBurst { 0% { transform: translate(-50%, -50%) scale(.25); opacity: .9; } 100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; } }
@keyframes bbPulse { 0%, 100% { transform: scale(1); } 8% { transform: scale(1.035); } 16% { transform: scale(1); } 24% { transform: scale(1.02); } 40% { transform: scale(1); } }
@keyframes bbShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
`;

const randomType = () => BLOOD_TYPES[Math.floor(Math.random() * BLOOD_TYPES.length)];
const hasA = (t) => t.replace(/[+-]/g, '').includes('A');
const hasB = (t) => t.replace(/[+-]/g, '').includes('B');
const isRhPos = (t) => t.endsWith('+');
const reactsFor = (t) => ({ A: hasA(t), B: hasB(t), D: isRhPos(t) });
const deriveType = (r) => {
  const abo = r.A && r.B ? 'AB' : r.A ? 'A' : r.B ? 'B' : 'O';
  return abo + (r.D ? '+' : '-');
};
const reactionSummary = (r) =>
  `Anti-A ${r.A ? 'clumped' : 'stayed smooth'}, anti-B ${r.B ? 'clumped' : 'stayed smooth'}, anti-D ${r.D ? 'clumped' : 'stayed smooth'}`;

// Which antigens a donor bag carries (shown on hover)
const getAntigens = (bt) => {
  const abo = bt.replace(/[+-]/g, '');
  const parts = [];
  if (abo.includes('A')) parts.push('A');
  if (abo.includes('B')) parts.push('B');
  const aboText = parts.length ? parts.join(' + ') + ' antigen' + (parts.length > 1 ? 's' : '') : 'No A or B antigen';
  return `${aboText} · ${bt.endsWith('+') ? 'D (Rh+)' : 'No D (Rh−)'}`;
};

// Explain why a donor is incompatible with a patient, using ABO and Rh antigen rules
const getLabReasons = (patient, donor) => {
  const pAbo = patient.replace(/[+-]/g, '');
  const dAbo = donor.replace(/[+-]/g, '');
  const pRh = patient.endsWith('+');
  const dRh = donor.endsWith('+');
  const reasons = [];
  if (dAbo.includes('A') && !pAbo.includes('A')) reasons.push(`${patient} has anti-A antibodies, and ${donor} red cells carry A antigens. The cells clump.`);
  if (dAbo.includes('B') && !pAbo.includes('B')) reasons.push(`${patient} has anti-B antibodies, and ${donor} red cells carry B antigens. The cells clump.`);
  if (!pRh && dRh) reasons.push(`${patient} is Rh-negative and has no D antigen, so Rh-positive red cells can trigger an immune reaction.`);
  if (reasons.length === 0) reasons.push(`${donor} is not on the compatible list for ${patient}.`);
  return reasons;
};

const StepLabel = ({ n, text, right = null }) => (
  <div className="flex items-center justify-between gap-3 mb-3.5">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="flex-none w-6 h-6 rounded-full bg-brand-btn dark:bg-[#c9253a] text-white text-[12px] font-bold flex items-center justify-center">{n}</span>
      <span className="text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">{text}</span>
    </div>
    {right}
  </div>
);

const CompatRing = ({ count, total }) => {
  const C = 2 * Math.PI * 20;
  const pct = count / total;
  return (
    <div className="relative flex-none w-14 h-14">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#e9d9d4" strokeWidth="5" />
        <circle
          cx="24" cy="24" r="20" fill="none" stroke="#c9253a" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-[13px] text-brand-ink dark:text-[#f8ece9]">{count}/{total}</span>
    </div>
  );
};

// A small blood drop shape used as the sample token and drag ghost
const DropIcon = ({ className = '' }) => (
  <svg viewBox="0 0 100 120" className={className}>
    <defs>
      <linearGradient id="sampleGrad" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#e5424f" /><stop offset=".55" stopColor="#b3182a" /><stop offset="1" stopColor="#6f0818" />
      </linearGradient>
    </defs>
    <path d="M50 4C50 4 8 52 8 78a42 42 0 0 0 84 0C92 52 50 4 50 4Z" fill="url(#sampleGrad)" />
    <path d="M30 80c0-12 7-23 15-34" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const PATTERNS = [
  { a: true, b: false, d: true, type: 'A+' },
  { a: true, b: false, d: false, type: 'A-' },
  { a: false, b: true, d: true, type: 'B+' },
  { a: false, b: true, d: false, type: 'B-' },
  { a: true, b: true, d: true, type: 'AB+' },
  { a: true, b: true, d: false, type: 'AB-' },
  { a: false, b: false, d: true, type: 'O+' },
  { a: false, b: false, d: false, type: 'O-' }
];

const TYPING_STEPS = [
  { t: 'Red cells carry markers', d: 'Red blood cells can carry A and/or B markers (antigens). They can also carry a D marker, which makes the blood Rh-positive.' },
  { t: 'Add a reagent', d: 'Each reagent is an antibody that targets one marker. Anti-A targets A, anti-B targets B, and anti-D targets D. Drop the sample into each well.' },
  { t: 'Watch for clumping', d: 'If the marker is there, the reagent binds the cells together and they clump. If the marker is missing, the mix stays smooth and even.' },
  { t: 'Read the pattern, then answer', d: 'Match the clumping pattern in the chart below to a blood type. Test all three wells, pick your answer, and check it.' }
];

const CROSS_STEPS = [
  { t: 'Why we test', d: 'Before a transfusion, the lab mixes the donor\'s red cells with the patient\'s plasma. If they clump, the patient\'s antibodies are reacting to the donor blood, so it cannot be given.' },
  { t: 'Patients carry antibodies', d: 'A-type plasma has anti-B, B-type has anti-A, O has both, and AB has neither. Rh-negative people only build anti-D after exposure to Rh-positive blood.' },
  { t: 'Donor cells carry markers', d: 'Donor red cells carry A, B, and/or D markers. An antibody only reacts when it finds the marker it targets.' },
  { t: 'Clumping means incompatible', d: 'Clumping means the blood is not compatible and must not be given. Smooth, even mixing means it is compatible.' }
];

const MiniWell = ({ clumped = false, tint = '#ffffff', className = '' }) => (
  <div
    className={`relative w-20 h-20 rounded-full overflow-hidden border-[4px] border-white dark:border-[#3b2328] shadow-[inset_0_4px_12px_-6px_rgba(20,8,10,0.3)] flex-none ${className}`}
    style={{ background: `radial-gradient(circle at 50% 35%, #ffffff, ${tint})` }}
  >
    {SCATTER.map((pos, i) => {
      const p = clumped ? pos : CLUMP[i];
      return (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#e5424f] to-[#9c1322] transition-all duration-700"
          style={{ left: `${p[0]}%`, top: `${p[1]}%`, transform: 'translate(-50%, -50%)' }}
        ></span>
      );
    })}
  </div>
);

const LabGuide = ({ tab, open, onToggle }) => {
  const isTyping = tab === 'typing';
  const steps = isTyping ? TYPING_STEPS : CROSS_STEPS;

  return (
    <div className="mb-6 rounded-[26px] bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] shadow-custom overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 md:px-7 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-none w-9 h-9 rounded-xl bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] flex items-center justify-center font-display font-extrabold text-[17px]">?</span>
          <div className="min-w-0">
            <p className="font-display font-extrabold text-[16px] md:text-[18px] text-brand-ink dark:text-[#f8ece9]">
              {isTyping ? 'How blood typing works' : 'How crossmatch works'}
            </p>
            <p className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9] truncate">
              {isTyping ? 'Read the reactions, then name the blood type' : 'Find out if a donor is safe for a patient'}
            </p>
          </div>
        </div>
        <span className="flex-none text-[12.5px] font-bold text-brand-accent dark:text-[#ff7d8b]">{open ? 'Hide guide' : 'Show guide'}</span>
      </button>

      {open && (
        <div className="px-5 md:px-7 pb-6 md:pb-7 pt-5 border-t border-brand-line dark:border-[#3b2328] animate-[rise_0.3s_ease_both]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {steps.map((s, i) => (
              <div key={s.t} className="flex gap-3.5 p-4 rounded-2xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328]">
                <span className="flex-none w-7 h-7 rounded-full bg-brand-btn dark:bg-[#c9253a] text-white text-[12.5px] font-bold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">{s.t}</p>
                  <p className="text-[13px] leading-relaxed text-brand-muted dark:text-[#c2a8a9] mt-1">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          {isTyping && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 md:gap-7 items-center">
              <div className="flex items-start gap-5">
                <div className="text-center">
                  <MiniWell clumped className="mx-auto" />
                  <p className="mt-2 text-[12px] font-mono font-bold uppercase text-brand-accent dark:text-[#ff7d8b]">Clumped</p>
                  <p className="text-[11.5px] text-brand-muted dark:text-[#c2a8a9]">Marker present</p>
                </div>
                <div className="text-center">
                  <MiniWell className="mx-auto" />
                  <p className="mt-2 text-[12px] font-mono font-bold uppercase text-brand-ok dark:text-[#58cf92]">Smooth</p>
                  <p className="text-[11.5px] text-brand-muted dark:text-[#c2a8a9]">Marker absent</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-brand-line dark:border-[#3b2328]">
                <table className="w-full min-w-[340px] text-left text-[13px]">
                  <thead className="bg-brand-bg dark:bg-[#150a0c] text-brand-muted dark:text-[#c2a8a9] font-mono text-[10.5px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 font-bold">Anti-A</th>
                      <th className="px-3 py-2.5 font-bold">Anti-B</th>
                      <th className="px-3 py-2.5 font-bold">Anti-D</th>
                      <th className="px-3 py-2.5 font-bold">Blood type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PATTERNS.map(p => (
                      <tr key={p.type} className="border-t border-brand-line dark:border-[#3b2328] text-brand-ink dark:text-[#f8ece9]">
                        <td className={`px-3 py-2 font-medium ${p.a ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-muted dark:text-[#c2a8a9]'}`}>{p.a ? 'Clumps' : 'Smooth'}</td>
                        <td className={`px-3 py-2 font-medium ${p.b ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-muted dark:text-[#c2a8a9]'}`}>{p.b ? 'Clumps' : 'Smooth'}</td>
                        <td className={`px-3 py-2 font-medium ${p.d ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-muted dark:text-[#c2a8a9]'}`}>{p.d ? 'Clumps' : 'Smooth'}</td>
                        <td className="px-3 py-2 font-display font-extrabold text-[15px]">{p.type.replace('-', '−')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isTyping && (
            <>
              <div className="mt-6 p-4 rounded-2xl bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 dark:border-[#ff7d8b]/25">
                <p className="font-display font-extrabold text-[15px] text-brand-accent dark:text-[#ff7d8b]">The rule</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">
                  The donor's markers must not be the ones the patient's antibodies attack. An Rh-negative patient should only receive Rh-negative blood.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/25 dark:border-[#ff7d8b]/30">
                  <div className="flex items-center gap-4">
                    <MiniWell clumped tint="#fde2e4" />
                    <div>
                      <p className="font-display font-extrabold text-[15px] text-brand-accent dark:text-[#ff7d8b]">Not compatible</p>
                      <p className="text-[12.5px] font-mono text-brand-ink dark:text-[#f8ece9] mt-0.5">A+ patient + B+ donor</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">
                    The A+ patient has anti-B. The B+ donor cells carry B markers, so they clump.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-brand-okSoft dark:bg-[#173326] border border-brand-ok/25">
                  <div className="flex items-center gap-4">
                    <MiniWell tint="#e6f7ee" />
                    <div>
                      <p className="font-display font-extrabold text-[15px] text-brand-ok dark:text-[#58cf92]">Compatible</p>
                      <p className="text-[12.5px] font-mono text-brand-ink dark:text-[#f8ece9] mt-0.5">A+ patient + O+ donor</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">
                    O+ donor cells carry no A or B markers, so the patient's antibodies have nothing to attack. The mix stays smooth.
                  </p>
                </div>
              </div>

              <div className="mt-5 p-5 rounded-2xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328]">
                <p className="text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] mb-3">How to use this test</p>
                <ol className="list-decimal pl-5 space-y-1.5 text-[13.5px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">
                  <li>Choose the patient's blood type.</li>
                  <li>Drag a donor bag into the well, or tap it.</li>
                  <li>Predict if you want, then mix and read the result. Hover a bag to see its markers.</li>
                </ol>
              </div>
            </>
          )}

          <p className="mt-5 text-[12px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">
            This is a learning simulation of standard ABO and Rh testing. Real results are read by the hospital blood bank.
          </p>
        </div>
      )}
    </div>
  );
};

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
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeGuideType, setActiveGuideType] = useState('A+');
  const [demoSwitchOn, setDemoSwitchOn] = useState(false);
  const [activeNav, setActiveNav] = useState('home'); 
  const dropdownRef = useRef(null);

  const [searchError, setSearchError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [floatingDonors, setFloatingDonors] = useState([]);

  // Blood guide
  const [guideMode, setGuideMode] = useState('simple');   // simple | lab
  const [labTab, setLabTab] = useState('typing');         // typing | crossmatch

  // Blood typing test
  const [tSample, setTSample] = useState(() => randomType());
  const [tTested, setTTested] = useState({ A: false, B: false, D: false });
  const [tSelected, setTSelected] = useState(false);
  const [tGuess, setTGuess] = useState(null);
  const [tChecked, setTChecked] = useState(false);
  const [tStats, setTStats] = useState({ right: 0, total: 0 });

  const [showGuide, setShowGuide] = useState(true);

  // Crossmatch test
  const [labPatient, setLabPatient] = useState('A+');
  const [labDonor, setLabDonor] = useState(null);
  const [labPhase, setLabPhase] = useState('idle'); // idle | mixing | done
  const [labResults, setLabResults] = useState({});
  const [labGuess, setLabGuess] = useState(null);
  const [labVerdict, setLabVerdict] = useState(null);
  const [labScore, setLabScore] = useState({ right: 0, total: 0 });
  const [runId, setRunId] = useState(0);
  const labTimerRef = useRef(null);

  // Shared drag and drop (mouse drags, touch taps)
  const [ghost, setGhost] = useState(null);     
  const [overDrop, setOverDrop] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => () => clearTimeout(labTimerRef.current), []);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const howSection = document.getElementById('how');
      const donorsSection = document.getElementById('donors');
      const scrollPosition = window.scrollY + 200;

      if (donorsSection && scrollPosition >= donorsSection.offsetTop) {
        setActiveNav('donors');
      } else if (howSection && scrollPosition >= howSection.offsetTop) {
        setActiveNav('how');
      } else {
        setActiveNav('home');
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const filteredCities = PH_CITIES.filter(c => {
    const search = location.toLowerCase().trim();
    if (!search) return true;
    if (search === 'qc' && c === 'Quezon City') return true;
    return c.toLowerCase().includes(search);
  });

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

  // ---- Shared drag and drop ----
  const dropAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const zone = el && el.closest ? el.closest('[data-drop]') : null;
    return zone ? zone.getAttribute('data-drop') : null;
  };

  const startDrag = (e, { label, disabled = false }, onDrop, onTap) => {
    if (disabled) return;
    dragRef.current = { label, onDrop, onTap, sx: e.clientX, sy: e.clientY, dragging: false };
    if (e.pointerType === 'mouse') e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e) => {
    const d = dragRef.current;
    if (!d || e.pointerType !== 'mouse') return;
    if (!d.dragging && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6) d.dragging = true;
    if (d.dragging) {
      setGhost({ label: d.label, x: e.clientX, y: e.clientY });
      setOverDrop(dropAt(e.clientX, e.clientY));
    }
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.dragging) {
      const id = dropAt(e.clientX, e.clientY);
      if (id) d.onDrop(id);
      setGhost(null);
      setOverDrop(null);
    } else {
      d.onTap();
    }
  };

  const cancelDrag = () => {
    dragRef.current = null;
    setGhost(null);
    setOverDrop(null);
  };

  // ---- Blood typing test handlers ----
  const tAllTested = tTested.A && tTested.B && tTested.D;
  const tReacts = reactsFor(tSample);

  const applyReagent = (r) => {
    if (tChecked || tTested[r]) return;
    setTTested(t => ({ ...t, [r]: true }));
    setTSelected(false);
  };

  const newTypingSample = () => {
    let next = randomType();
    while (next === tSample) next = randomType();
    setTSample(next);
    setTTested({ A: false, B: false, D: false });
    setTSelected(false);
    setTGuess(null);
    setTChecked(false);
  };

  const checkTyping = () => {
    if (!tAllTested || !tGuess || tChecked) return;
    const ok = tGuess === tSample;
    setTChecked(true);
    setTStats(s => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
  };

  // ---- Crossmatch handlers ----
  const pickLabPatient = (pt) => {
    if (labPhase === 'mixing') return;
    clearTimeout(labTimerRef.current);
    setLabPatient(pt);
    setLabDonor(null);
    setLabPhase('idle');
    setLabResults({});
    setLabGuess(null);
    setLabVerdict(null);
  };

  const pickLabDonor = (bt) => {
    if (labPhase === 'mixing') return;
    if (bt === labDonor && labPhase === 'done') return;
    if (bt !== labDonor) {
      setLabGuess(null);
      setLabVerdict(null);
    }
    setLabDonor(bt);
    setLabPhase('idle');
  };

  const mixSample = () => {
    if (!labDonor || labPhase === 'mixing') return;
    const donor = labDonor;
    const ok = FROM[labPatient]?.includes(donor);
    const guess = labGuess;
    setLabVerdict(null);
    setLabPhase('mixing');
    clearTimeout(labTimerRef.current);
    labTimerRef.current = setTimeout(() => {
      setLabResults(prev => ({ ...prev, [donor]: ok }));
      setLabPhase('done');
      setRunId(r => r + 1);
      if (guess !== null) {
        const correct = guess === ok;
        setLabVerdict({ guess, correct });
        setLabScore(s => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
        setLabGuess(null);
      }
    }, 1400);
  };

  const clearLabResults = () => {
    clearTimeout(labTimerRef.current);
    setLabResults({});
    setLabDonor(null);
    setLabPhase('idle');
    setLabGuess(null);
    setLabVerdict(null);
    setLabScore({ right: 0, total: 0 });
  };

  const labOk = labDonor ? FROM[labPatient]?.includes(labDonor) : null;
  const labShowResult = labPhase === 'done' && !!labDonor;
  
  const clumped = labShowResult && labOk === false;
  const pAbo = labPatient.replace(/[+-]/g, '');
  const patientAntibodies = [
    ...['A', 'B'].filter(x => !pAbo.includes(x)).map(x => `anti-${x}`),
    ...(labPatient.endsWith('+') ? [] : ['anti-D (after Rh+ exposure)'])
  ];
  const antibodyText = patientAntibodies.length ? patientAntibodies.join(', ') : 'None';
  const compatibleCount = FROM[labPatient]?.length || 0;

  const displayName = profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
  const displayBloodType = profile?.blood_type && profile.blood_type !== "Not provided / I don't know" ? profile.blood_type.replace('-', '−') : 'Not set';
  const userAvatarColor = profile?.avatar_color || 'bg-[#c9253a]';

  const getInitials = (name) => (name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] font-body flex flex-col transition-colors duration-300">
      <style>{GLOBAL_CSS}</style>

      {/* HEADER */}
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
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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
        <section className="relative pt-6 pb-10 md:pt-20 md:pb-40 overflow-hidden">
          <div className="absolute inset-x-0 -top-16 bottom-0 -z-10 bg-[radial-gradient(60%_70%_at_85%_30%,#fbe3e0,transparent_70%),radial-gradient(40%_50%_at_0%_0%,#f4e7e1,transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_85%_30%,#3a1a20,transparent_70%),radial-gradient(40%_50%_at_0%_0%,#1e1013,transparent_70%)] transition-colors duration-300"></div>

          <div className="max-w-[1160px] mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] gap-6 md:gap-16 items-center">
            <div className="text-center md:text-left">
              <h1 className="font-display font-extrabold text-[38px] sm:text-[52px] md:text-[84px] leading-[1.04] tracking-tight mt-4 md:mt-5 text-balance text-brand-ink dark:text-[#f8ece9]">
                Find blood when{' '}
                {['every', 'second', 'counts.'].map((w, i) => (
                  <React.Fragment key={w}>
                    {i > 0 && ' '}
                    <span
                      className="inline-block text-brand-accent dark:text-[#ff7d8b]"
                      style={{ animation: 'bbPulse 1.6s ease-in-out infinite', animationDelay: `${i * 0.14}s` }}
                    >
                      {w}
                    </span>
                  </React.Fragment>
                ))}
              </h1>

              <p className="mt-4 md:mt-8 text-[15px] md:text-[20px] text-brand-muted dark:text-[#c2a8a9] max-w-[30em] mx-auto md:mx-0 leading-relaxed">
                BloodBuddy connects families in urgent need directly with nearby volunteer donors, making it simple and fast to coordinate support when hospitals experience blood shortages.
              </p>

              {/* CTAs */}
              <div className="mt-6 md:mt-8 grid grid-cols-2 md:flex md:flex-wrap gap-3">
                <a href="#find-donor" className="inline-flex items-center justify-center gap-2 h-12 px-4 md:px-6 rounded-2xl bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn font-bold text-[14.5px] md:text-[15px] whitespace-nowrap shadow-[0_12px_24px_-12px_#a4121f] dark:shadow-[0_12px_24px_-12px_#c9253a] hover:bg-brand-btnHover dark:hover:bg-[#e03349] active:scale-[0.98] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="flex-none"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  Find a donor
                </a>
                <a href="#donors" className="inline-flex items-center justify-center gap-2 h-12 px-4 md:px-6 rounded-2xl bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-ink dark:text-[#f8ece9] font-bold text-[14.5px] md:text-[15px] whitespace-nowrap hover:border-brand-accent dark:hover:border-[#ff7d8b] active:scale-[0.98] transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg>
                  Become a donor
                </a>
              </div>
            </div>

            {/* Desktop only: centered drop inside rings + floating DB tags */}
            <div className="hidden md:block relative w-full max-w-[380px] mx-auto aspect-square">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="w-[88%] aspect-square rounded-full border border-brand-accent/15 dark:border-[#ff7d8b]/15"></span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="w-[74%] aspect-square rounded-full border-2 border-brand-accent/25 dark:border-[#ff7d8b]/25 animate-ping" style={{ animationDuration: '3.2s' }}></span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="w-[72%] aspect-square rounded-full bg-brand-accent/25 dark:bg-[#ff7d8b]/15 blur-3xl animate-pulse"></span>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[52%] drop-shadow-[0_28px_36px_rgba(111,8,24,0.45)] dark:drop-shadow-[0_28px_36px_rgba(255,125,139,0.15)]">
                  <svg viewBox="0 0 200 232" className="w-full h-auto block">
                    <defs><linearGradient id="dg" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor="#e5424f"/><stop offset=".55" stopColor="#b3182a"/><stop offset="1" stopColor="#6f0818"/></linearGradient></defs>
                    <path d="M100 6C100 6 22 98 22 148a78 78 0 0 0 156 0C178 98 100 6 100 6Z" fill="url(#dg)"/>
                    <path d="M58 150c0-24 14-46 30-68" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="9" strokeLinecap="round"/>
                    <path className="animate-draw" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" d="M44 148H78L88 148L98 116L112 178L124 134L132 148H156"/>
                  </svg>
                </div>
              </div>

              {floatingDonors.map((tag) => (
                <span key={tag.id} className={`absolute ${tag.pos} animate-float-db font-mono font-medium text-[15px] px-3.5 py-2 rounded-full bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border border-brand-line dark:border-[#3b2328] shadow-custom whitespace-nowrap`} style={{ animationDelay: tag.delay }}>
                  <b className="text-brand-accent dark:text-[#ff7d8b]">{tag.blood_type.replace('-', '−')}</b>&nbsp;in {tag.city}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Search Card Section */}
        <div className="max-w-[1160px] mx-auto px-4 md:px-6 relative z-10 mt-4 md:-mt-28">
          <div id="find-donor" className="scroll-mt-24 max-w-[940px] mx-auto">
            {/* Gradient frame */}
            <div className="relative rounded-[30px] md:rounded-[34px] p-[1.5px] bg-gradient-to-br from-brand-accent/50 via-brand-line to-brand-accent/25 dark:from-[#ff7d8b]/40 dark:via-[#3b2328] dark:to-[#c9253a]/30 shadow-custom">
              <div className="relative rounded-[28.5px] md:rounded-[32.5px] bg-brand-surface dark:bg-[#25141a] overflow-hidden transition-colors duration-300">

                {/* Crimson header */}
                <div className="relative overflow-hidden px-5 md:px-8 pt-6 pb-5 md:pt-7 md:pb-6 bg-gradient-to-br from-[#c9253a] via-[#9c1322] to-[#5e0713] text-white">
                  <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-white/10"></div>
                  <div className="absolute -bottom-20 right-1/3 w-40 h-40 rounded-full bg-white/5"></div>
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[10.5px] md:text-[11.5px] uppercase tracking-[0.2em] text-white/70">Donor finder</p>
                      <h2 className="mt-1.5 font-display font-extrabold text-[24px] md:text-[32px] leading-[1.1] tracking-tight">Find a donor, fast.</h2>
                      <p className="mt-1.5 text-[13px] md:text-[14px] text-white/80 max-w-[28em] leading-snug">Pick a blood type, add an area, and see verified volunteers who are available right now.</p>
                    </div>
                  </div>

                  {/* Step progress */}
                  <div className="relative mt-5 grid grid-cols-2 gap-3 max-w-[360px]">
                    {[
                      { label: 'Blood type', done: !!selectedType },
                      { label: 'Donors', done: searchExecuted && !isSearching }
                    ].map((s, i) => (
                      <div key={s.label} className="flex flex-col gap-1.5">
                        <div className={`h-1 rounded-full transition-colors duration-300 ${s.done ? 'bg-white' : 'bg-white/25'}`}></div>
                        <span className={`text-[11.5px] font-semibold transition-colors ${s.done ? 'text-white' : 'text-white/60'}`}>{i + 1}. {s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSearchSubmit} className="p-5 md:p-8 space-y-7" noValidate>
                  {/* Blood type */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">
                        Blood type needed <span className="text-brand-accent dark:text-[#ff7d8b]">*</span>
                      </label>
                      {selectedType && (
                        <span className="font-mono text-[12px] font-bold text-brand-accent dark:text-[#ff7d8b]">{selectedType.replace('-', '−')} selected</span>
                      )}
                    </div>
                    <div role="radiogroup" aria-label="Blood type needed" className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-2.5">
                      {BLOOD_TYPES.map(bt => {
                        const active = selectedType === bt;
                        return (
                          <button
                            key={bt}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setSelectedType(bt); setSearchError(false); }}
                            className={`relative h-14 md:h-[68px] rounded-2xl border-[1.5px] font-display font-extrabold text-[18px] md:text-[22px] transition-all duration-200 active:scale-95 ${
                              active
                                ? 'bg-gradient-to-br from-[#e5424f] to-[#9c1322] text-white border-transparent shadow-[0_14px_26px_-12px_#9c1322] -translate-y-0.5'
                                : searchError
                                  ? 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-red-400/70 hover:border-brand-accent dark:hover:border-[#ff7d8b]'
                                  : 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] hover:border-brand-accent dark:hover:border-[#ff7d8b] hover:bg-brand-blush dark:hover:bg-[#3a1a20] hover:-translate-y-0.5'
                            }`}
                          >
                            {bt.replace('-', '−')}
                            {active && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {searchError && (
                      <p className="mt-2.5 flex items-center gap-1.5 text-red-500 dark:text-[#ff7d8b] text-[13.5px] font-semibold" role="alert">
                        <svg className="w-4 h-4 flex-none" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Choose the blood type you need.
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="donor-location" className="block text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] mb-3">
                      City or area <span className="font-normal text-brand-muted dark:text-[#c2a8a9]">(optional)</span>
                    </label>
                    <div className="relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-accent dark:text-[#ff7d8b] pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <input 
                        id="donor-location" 
                        type="text" 
                        maxLength={50}
                        autoComplete="off"
                        placeholder="e.g. Caloocan City or Quezon City" 
                        value={location} 
                        onChange={(e) => { setLocation(e.target.value); setShowCityDropdown(true); }} 
                        onFocus={() => setShowCityDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                        className="w-full h-14 text-[15px] text-brand-ink dark:text-[#f8ece9] placeholder:text-brand-muted/70 dark:placeholder:text-[#c2a8a9]/60 bg-brand-bg dark:bg-[#150a0c] border-[1.5px] border-brand-line dark:border-[#3b2328] rounded-2xl pl-12 pr-4 focus:outline-none focus:border-brand-accent dark:focus:border-[#ff7d8b] focus:ring-4 focus:ring-brand-accent/10 dark:focus:ring-[#ff7d8b]/10 transition" 
                      />
                      {showCityDropdown && (
                        <div className="relative z-30 mt-2 w-full max-h-[min(18rem,45vh)] overflow-hidden rounded-[20px] border border-brand-line/90 dark:border-[#513038] bg-white dark:bg-[#25141a] shadow-[0_16px_36px_-18px_rgba(76,12,24,0.24)] dark:shadow-[0_16px_36px_-18px_rgba(0,0,0,0.5)] ring-1 ring-black/[0.025] dark:ring-white/[0.04] animate-[rise_0.16s_ease-out_both]">
                          {filteredCities.length > 0 ? (
                            <ul role="listbox" aria-label="City suggestions" className="max-h-[min(18rem,45vh)] overflow-y-auto overscroll-contain p-1.5 custom-scrollbar">
                              {filteredCities.map((city, index) => {
                                const isSelected = location === city;
                                return (
                                  <li key={city} role="option" aria-selected={isSelected}>
                                    <button
                                      type="button"
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => { setLocation(city); setShowCityDropdown(false); }}
                                      className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                                        isSelected
                                          ? 'bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b]'
                                          : 'text-brand-ink dark:text-[#f8ece9] hover:bg-[#fff2f0] dark:hover:bg-[#321b21]'
                                      }`}
                                    >
                                      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg border transition-colors ${
                                        isSelected
                                          ? 'border-brand-accent/20 bg-white dark:bg-[#25141a]'
                                          : 'border-brand-line/80 bg-brand-bg dark:border-[#493039] dark:bg-[#1b0e12] group-hover:border-brand-accent/30'
                                      }`}>
                                        <svg className="h-4 w-4 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                          <circle cx="12" cy="10" r="2.5" />
                                        </svg>
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-[13.5px] font-semibold leading-5">{city}</span>
                                        <span className="block text-[11px] mt-0.5 text-brand-muted dark:text-[#c2a8a9]">
                                          {city.includes('(') ? 'City · Province specified' : 'Philippines'}
                                        </span>
                                      </span>
                                      {isSelected ? (
                                        <svg className="h-4 w-4 flex-none text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
                                      ) : (
                                        <svg className="h-4 w-4 flex-none text-brand-muted/40 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-[#c2a8a9]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <div className="px-5 py-8 text-center">
                              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-bg text-brand-muted dark:bg-[#150a0c] dark:text-[#c2a8a9]">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 20-4-4" /></svg>
                              </span>
                              <p className="text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">No matching city found</p>
                              <p className="mt-1 text-[12px] text-brand-muted dark:text-[#c2a8a9]">Try another spelling or enter an area manually.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={isSearching} className="group relative w-full h-14 overflow-hidden rounded-2xl bg-gradient-to-r from-[#c9253a] to-[#9c1322] text-white font-bold text-[16px] shadow-[0_16px_30px_-14px_#9c1322] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2.5">
                    <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent"></span>
                    {isSearching ? (
                      <svg className="animate-spin w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                    )}
                    {isSearching ? 'Searching...' : 'Search donors'}
                  </button>
                </form>

                {searchExecuted && (
                  <div className="px-5 md:px-8 pb-6 md:pb-8 animate-[rise_0.35s_ease_both]">
                    <div className="pt-6 border-t border-brand-line dark:border-[#3b2328]">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="font-display font-extrabold text-[18px] md:text-[20px] tracking-tight text-brand-ink dark:text-[#f8ece9]">Available verified donors</h3>
                        <span className="flex-none px-3 py-1 rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] text-[12.5px] font-bold font-mono">{searchResults.length} found</span>
                      </div>

                      {searchResults.length === 0 ? (
                        <div className="text-center py-9 px-4 rounded-2xl border border-dashed border-brand-line dark:border-[#3b2328] bg-brand-bg/60 dark:bg-[#150a0c]/60">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path strokeLinecap="round" d="m20 20-3.5-3.5M8.5 11h5"/></svg>
                          </div>
                          <p className="text-[14px] font-semibold text-brand-ink dark:text-[#f8ece9]">No donors found</p>
                          <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-1">No active verified donors found matching the filters. Try a different area.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                          {searchResults.map(donor => (
                            <div key={donor.id} className="group relative p-4 rounded-2xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] hover:border-brand-accent/60 dark:hover:border-[#ff7d8b]/60 hover:shadow-custom transition flex flex-col gap-4">
                              <div className="flex items-center gap-3">
                                <div className="relative flex-none">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e5424f] to-[#9c1322] text-white flex items-center justify-center text-[14px] font-extrabold shadow-[0_8px_16px_-8px_#9c1322]">
                                    {getInitials(donor.full_name)}
                                  </div>
                                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand-ok dark:bg-[#58cf92] border-2 border-brand-bg dark:border-[#150a0c]" title="Available"></span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-[14.5px] font-bold text-slate-900 dark:text-[#f8ece9] truncate">{donor.full_name}</p>
                                    <svg className="w-3.5 h-3.5 flex-none text-brand-ok dark:text-[#58cf92]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                  <p className="flex items-center gap-1 text-[12.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5 truncate">
                                    <svg className="w-3 h-3 flex-none" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="truncate">{donor.city || 'Metro Manila'}</span>
                                  </p>
                                </div>
                                <div className="flex-none w-12 h-12 rounded-2xl bg-brand-blush dark:bg-[#3a1a20] flex items-center justify-center">
                                  <span className="font-display font-extrabold text-[16px] text-brand-accent dark:text-[#ff7d8b] leading-none">{donor.blood_type.replace('-', '−')}</span>
                                </div>
                              </div>
                              {session ? (
                                donor.id !== session.user.id ? (
                                  <button onClick={() => onRequestDonor(donor)} className="w-full h-10 text-[13.5px] font-bold text-brand-btn dark:text-[#f8ece9] border border-brand-btn dark:border-[#c9253a] hover:bg-brand-btn dark:hover:bg-[#c9253a] hover:text-white rounded-xl transition">
                                    Request this donor
                                  </button>
                                ) : (
                                  <span className="w-full h-10 flex items-center justify-center text-[12.5px] text-brand-muted dark:text-[#c2a8a9] italic bg-brand-bg2 dark:bg-[#1e1013] rounded-xl">Your donor profile</span>
                                )
                              ) : (
                                <button onClick={() => { onRequestDonor(donor); onOpenAuth(true); }} className="w-full h-10 text-[13.5px] font-bold text-brand-btn dark:text-[#f8ece9] border border-brand-btn dark:border-[#c9253a] hover:bg-brand-btn dark:hover:bg-[#c9253a] hover:text-white rounded-xl transition">
                                  Login to request
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trust points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-[940px] mx-auto mt-6 md:mt-8">
            {[
              { t: 'Real-time status', d: 'Availability is updated by donors themselves.', icon: <><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/></> },
              { t: '100% voluntary', d: 'No fees or commercial middlemen.', icon: <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/> },
              { t: 'Hospital screening', d: 'Final health tests are done at the facility.', icon: <><path d="M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/></> }
            ].map(item => (
              <div key={item.t} className="flex items-center sm:items-start gap-3.5 p-4 rounded-2xl bg-brand-surface/70 dark:bg-[#25141a]/70 border border-brand-line dark:border-[#3b2328]">
                <div className="flex-none w-10 h-10 rounded-xl bg-brand-blush dark:bg-[#3a1a20] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[20px] h-[20px] text-brand-accent dark:text-[#ff7d8b]">{item.icon}</svg>
                </div>
                <div>
                  <strong className="block text-[14.5px] font-bold text-brand-ink dark:text-[#f8ece9]">{item.t}</strong>
                  <span className="block text-[13px] text-brand-muted dark:text-[#c2a8a9] leading-snug mt-0.5">{item.d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Steps Section */}
        <section id="how" className="py-16 md:py-28 px-4 md:px-6 max-w-[1160px] mx-auto scroll-mt-24">
          <div className="max-w-[640px]">
            <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">Community workflow</span>
            <h2 className="font-display font-extrabold text-[30px] md:text-5xl mt-3 text-balance tracking-tight text-brand-ink dark:text-[#f8ece9]">How BloodBuddy works</h2>
            <p className="mt-3.5 text-brand-muted dark:text-[#c2a8a9] text-base">A simple three-step flow built for urgent times.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-9 md:mt-11 md:pb-10">
            {[
              { n: 1, t: 'Post or search', d: 'Pick the blood type and area. Tell us if the blood is for you or someone else, and share only what is needed.', shift: '' },
              { n: 2, t: 'Donors respond', d: 'Available donors nearby review the request and accept or decline. Accepting means they are willing to coordinate.', shift: 'md:translate-y-[18px]' },
              { n: 3, t: 'Coordinate safely', d: 'Once a donor accepts, a private chat for that request opens. Phone numbers stay hidden. The hospital screens before any donation.', shift: 'md:translate-y-[36px]' }
            ].map(step => (
              <article key={step.n} className={`bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[22px] p-6 md:pb-7 shadow-custom relative overflow-hidden ${step.shift}`}>
                <div className="flex items-center gap-4 md:block">
                  <div className="flex-none w-12 h-12 md:w-auto md:h-auto rounded-2xl md:rounded-none bg-brand-blush md:bg-transparent dark:bg-[#3a1a20] dark:md:bg-transparent flex items-center justify-center font-display font-extrabold text-[24px] md:text-[56px] md:leading-none text-brand-accent dark:text-[#ff7d8b]">{step.n}</div>
                  <h3 className="font-display font-extrabold text-[21px] md:text-2xl md:mt-3.5 tracking-tight text-brand-ink dark:text-[#f8ece9]">{step.t}</h3>
                </div>
                <p className="mt-3 md:mt-2.5 text-brand-muted dark:text-[#c2a8a9] text-[15px] md:text-base leading-relaxed">{step.d}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Blood Type Guide Band */}
        <section className="bg-brand-bg2 dark:bg-[#1e1013] py-14 md:py-24 transition-colors duration-300">
          <div className="max-w-[1160px] mx-auto px-4 md:px-6">
            <div className="max-w-[660px]">
              <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">Blood type guide</span>
              <h2 className="font-display font-extrabold text-[30px] md:text-[52px] tracking-tight mt-3 text-balance text-brand-ink dark:text-[#f8ece9]">Who can give to whom?</h2>
              <p className="mt-3.5 text-brand-muted dark:text-[#c2a8a9]">
                {guideMode === 'simple' && 'Tap a blood type to see which donors are usually compatible. Not sure of yours? That is fine. A hospital can test it.'}
                {guideMode === 'lab' && labTab === 'typing' && 'Work out a sample\'s blood type the way a lab does. Test it with anti-A, anti-B, and anti-D reagents, read which ones clump, then make your call.'}
                {guideMode === 'lab' && labTab === 'crossmatch' && 'Pick a patient, load a donor bag, then mix. If the sample clumps, the blood is not compatible. Predict first, then see if you were right.'}
              </p>
            </div>

            {/* Mode toggle */}
            <div role="tablist" aria-label="Guide mode" className="mt-6 inline-flex w-full md:w-auto p-1 rounded-2xl bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] shadow-sm mb-5">
              {[
                { id: 'simple', label: 'Simple view' },
                { id: 'lab', label: 'Interactive lab' }
              ].map(m => {
                const on = guideMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setGuideMode(m.id)}
                    className={`flex-1 md:flex-none md:px-8 px-4 py-2.5 rounded-xl text-[13.5px] md:text-[14px] font-bold transition ${
                      on
                        ? 'bg-brand-btn dark:bg-[#c9253a] text-white shadow-[0_8px_18px_-10px_#a4121f]'
                        : 'text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9]'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* SIMPLE VIEW */}
            {guideMode === 'simple' && (
              <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-8 md:gap-16 items-start mt-4 md:mt-5">
                <div className="grid grid-cols-4 gap-2 md:gap-2.5">
                  {BLOOD_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveGuideType(t)}
                      className={`h-14 md:h-16 rounded-2xl border-[1.5px] font-display font-extrabold text-xl md:text-2xl transition hover:-translate-y-0.5 active:scale-95 ${
                        activeGuideType === t
                          ? 'bg-brand-btn dark:bg-[#c9253a] text-brand-onBtn border-brand-btn dark:border-[#c9253a] shadow-[0_10px_22px_-12px_#a4121f] dark:shadow-[0_10px_22px_-12px_#c9253a]'
                          : 'bg-brand-surface dark:bg-[#25141a] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] hover:border-brand-accent dark:hover:border-[#ff7d8b]'
                      }`}
                    >
                      {t.replace('-', '−')}
                    </button>
                  ))}
                </div>
                <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-3xl p-5 md:p-8 shadow-custom">
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
                  <p className="mt-5 pt-4 border-t border-brand-line dark:border-[#3b2328] text-[13.5px] md:text-[14px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">
                    Based on red blood cell compatibility. BloodBuddy does not test blood or confirm eligibility. The hospital makes the final match.
                  </p>
                </div>
              </div>
            )}

            {/* INTERACTIVE LAB */}
            {guideMode === 'lab' && (
              <div className="mt-2 md:mt-3">
                {/* Sub tabs */}
                <div role="tablist" aria-label="Lab test" className="inline-flex flex-wrap gap-2 mb-5">
                  {[
                    { id: 'typing', label: 'Blood typing test' },
                    { id: 'crossmatch', label: 'Crossmatch test' }
                  ].map(s => {
                    const on = labTab === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => setLabTab(s.id)}
                        className={`px-4 py-2 rounded-full text-[12.5px] md:text-[13px] font-bold border transition ${
                          on
                            ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c] border-transparent'
                            : 'bg-brand-surface dark:bg-[#25141a] text-brand-muted dark:text-[#c2a8a9] border-brand-line dark:border-[#3b2328] hover:text-brand-ink dark:hover:text-[#f8ece9]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                <LabGuide tab={labTab} open={showGuide} onToggle={() => setShowGuide((o) => !o)} />

                {/* BLOOD TYPING TEST */}
                {labTab === 'typing' && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-5 md:gap-6 items-stretch">
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[26px] p-5 md:p-7 shadow-custom">
                      <StepLabel
                        n={1}
                        text="Test the sample"
                        right={
                          <button type="button" onClick={newTypingSample} className="text-[12.5px] font-bold text-brand-accent dark:text-[#ff7d8b] hover:underline underline-offset-4">
                            New sample
                          </button>
                        }
                      />

                      {/* Sample token */}
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328]">
                        <button
                          type="button"
                          aria-pressed={tSelected}
                          disabled={tChecked}
                          onPointerDown={(e) => startDrag(e, { label: tChecked ? tSample.replace('-', '−') : '?', disabled: tChecked }, (id) => applyReagent(id), () => setTSelected(s => !s))}
                          onPointerMove={moveDrag}
                          onPointerUp={endDrag}
                          onPointerCancel={cancelDrag}
                          className={`relative flex-none w-20 h-20 md:w-24 md:h-24 rounded-3xl border-[1.5px] flex items-center justify-center select-none transition-all duration-200 active:scale-95 md:cursor-grab disabled:cursor-default ${
                            tSelected
                              ? 'border-brand-accent dark:border-[#ff7d8b] bg-brand-blush dark:bg-[#3a1a20] -translate-y-0.5 shadow-[0_14px_24px_-14px_rgba(111,8,24,0.6)]'
                              : 'border-brand-line dark:border-[#3b2328] bg-brand-surface dark:bg-[#25141a] md:hover:-translate-y-1'
                          }`}
                        >
                          <DropIcon className="w-10 h-12 md:w-12 md:h-14" />
                          <span className="absolute inset-0 flex items-center justify-center pt-3 font-display font-extrabold text-[15px] md:text-[17px] text-white pointer-events-none">
                            {tChecked ? tSample.replace('-', '−') : '?'}
                          </span>
                        </button>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-brand-ink dark:text-[#f8ece9]">
                            {tChecked ? `Sample was ${tSample.replace('-', '−')}` : 'Unknown sample'}
                          </p>
                          <p className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9] mt-1 leading-relaxed">
                            <span className="hidden md:inline">Drag the sample onto a reagent well, or click it and then click a well.</span>
                            <span className="md:hidden">Tap the sample, then tap a reagent well.</span>
                          </p>
                          {tSelected && !tChecked && (
                            <p className="mt-2 text-[12px] font-mono font-bold text-brand-accent dark:text-[#ff7d8b]">Sample selected. Now pick a well.</p>
                          )}
                        </div>
                      </div>

                      {/* Reagent wells */}
                      <div className="mt-6 grid grid-cols-3 gap-3 md:gap-5 justify-items-center">
                        {REAGENTS.map(r => {
                          const tested = tTested[r.id];
                          const reacts = tReacts[r.id];
                          const showClump = tested && reacts;
                          const canTap = tSelected && !tested && !tChecked;
                          return (
                            <div
                              key={r.id}
                              data-drop={r.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`${r.label} reagent well`}
                              onClick={() => { if (canTap) applyReagent(r.id); }}
                              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && canTap) { e.preventDefault(); applyReagent(r.id); } }}
                              className={`group relative flex flex-col items-center gap-2.5 outline-none ${canTap ? 'cursor-pointer' : ''}`}
                            >
                              <div
                                className={`relative w-[96px] h-[96px] md:w-[124px] md:h-[124px] rounded-full overflow-hidden border-[5px] transition-all duration-300 ${
                                  overDrop === r.id
                                    ? 'border-brand-accent dark:border-[#ff7d8b] scale-[1.05]'
                                    : canTap
                                      ? 'border-brand-accent/60 dark:border-[#ff7d8b]/60 ring-4 ring-brand-accent/15'
                                      : 'border-white dark:border-[#3b2328]'
                                } shadow-[inset_0_6px_16px_-8px_rgba(20,8,10,0.25),0_14px_24px_-16px_rgba(111,8,24,0.4)]`}
                                style={{ background: `radial-gradient(circle at 50% 35%, #ffffff, ${r.tint})` }}
                              >
                                {SCATTER.map((pos, i) => {
                                  const p = showClump ? pos : CLUMP[i];
                                  return (
                                    <span
                                      key={i}
                                      className="absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-gradient-to-br from-[#e5424f] to-[#9c1322] transition-all duration-700 ease-out"
                                      style={{ left: `${p[0]}%`, top: `${p[1]}%`, transform: 'translate(-50%, -50%)', opacity: tested ? 1 : 0.35 }}
                                    ></span>
                                  );
                                })}
                                {tested && (
                                  <span className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border-2 border-brand-accent/60 pointer-events-none" style={{ animation: 'bbBurst 0.8s ease-out forwards' }}></span>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="font-display font-extrabold text-[14px] md:text-[15px] text-brand-ink dark:text-[#f8ece9]">{r.label}</p>
                                <p className={`text-[11px] font-mono font-bold uppercase tracking-wider mt-0.5 ${
                                  !tested ? 'text-brand-muted dark:text-[#c2a8a9]' : reacts ? 'text-brand-accent dark:text-[#ff7d8b]' : 'text-brand-ok dark:text-[#58cf92]'
                                }`}>
                                  {!tested ? 'Not tested' : reacts ? 'Clumped' : 'No clumping'}
                                </p>
                              </div>
                              <span className="pointer-events-none hidden md:block absolute -top-12 left-1/2 -translate-x-1/2 w-56 text-center px-3 py-2 rounded-xl bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c] text-[11.5px] font-semibold leading-snug opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition z-20">
                                {r.hint}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="mt-6 text-[12px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">
                        Test all three wells before you answer. Clumping means that antigen is on the red cells.
                      </p>
                    </div>

                    {/* Answer panel */}
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[26px] p-5 md:p-7 shadow-custom flex flex-col">
                      <StepLabel
                        n={2}
                        text="What is the blood type?"
                        right={tStats.total > 0 && (
                          <span className="flex-none px-2.5 py-1 rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] text-[11.5px] font-mono font-bold">
                            {tStats.right}/{tStats.total} right
                          </span>
                        )}
                      />
                      <div role="radiogroup" aria-label="Blood type answer" className="grid grid-cols-4 gap-2">
                        {BLOOD_TYPES.map(bt => {
                          const on = tGuess === bt;
                          return (
                            <button
                              key={bt}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              disabled={tChecked}
                              onClick={() => setTGuess(bt)}
                              className={`h-12 rounded-2xl border-[1.5px] font-display font-extrabold text-[16px] transition active:scale-95 md:hover:-translate-y-0.5 disabled:opacity-60 ${
                                on
                                  ? 'bg-gradient-to-br from-[#e5424f] to-[#9c1322] text-white border-transparent shadow-[0_10px_20px_-12px_#9c1322]'
                                  : 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] hover:border-brand-accent dark:hover:border-[#ff7d8b]'
                              }`}
                            >
                              {bt.replace('-', '−')}
                            </button>
                          );
                        })}
                      </div>

                      {!tChecked && (
                        <button
                          type="button"
                          onClick={checkTyping}
                          disabled={!tAllTested || !tGuess}
                          className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-[#c9253a] to-[#9c1322] text-white font-bold text-[15px] shadow-[0_14px_26px_-14px_#9c1322] md:hover:-translate-y-0.5 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                        >
                          Check answer
                        </button>
                      )}
                      {!tChecked && !tAllTested && (
                        <p className="mt-3 text-[12.5px] text-brand-muted dark:text-[#c2a8a9]">Test all three wells first.</p>
                      )}

                      {tChecked && (
                        <div
                          className={`mt-5 p-4 rounded-2xl border animate-[rise_0.35s_ease_both] ${
                            tGuess === tSample
                              ? 'bg-brand-okSoft dark:bg-[#173326] border-brand-ok/20'
                              : 'bg-brand-blush dark:bg-[#3a1a20] border-brand-accent/20 dark:border-[#ff7d8b]/25'
                          }`}
                        >
                          <p className={`font-display font-extrabold text-[17px] ${tGuess === tSample ? 'text-brand-ok dark:text-[#58cf92]' : 'text-brand-accent dark:text-[#ff7d8b]'}`}>
                            {tGuess === tSample ? 'Correct' : `Not quite. It is ${tSample.replace('-', '−')}`}
                          </p>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">
                            {reactionSummary(tReacts)}. That pattern means {tSample.replace('-', '−')}.
                          </p>
                          <p className="mt-2 text-[12.5px] leading-relaxed text-brand-muted dark:text-[#c2a8a9]">
                            {tReacts.A ? 'The A antigen is present.' : 'No A antigen.'} {tReacts.B ? 'The B antigen is present.' : 'No B antigen.'} {tReacts.D ? 'The D antigen is present, so the blood is Rh-positive.' : 'No D antigen, so the blood is Rh-negative.'}
                          </p>
                          <button type="button" onClick={newTypingSample} className="mt-4 h-11 px-5 rounded-xl bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c] font-bold text-[13.5px] md:hover:-translate-y-0.5 active:scale-[0.98] transition">
                            Next sample
                          </button>
                        </div>
                      )}

                      <p className="mt-auto pt-6 text-[12px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">
                        Learning simulation. Real blood typing is done by the hospital blood bank.
                      </p>
                    </div>
                  </div>
                )}

                {/* CROSSMATCH TEST */}
                {labTab === 'crossmatch' && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 items-stretch">
                    {/* Steps 1 & 2 */}
                    <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[26px] p-5 md:p-7 shadow-custom space-y-7">
                      <div>
                        <StepLabel n={1} text="Choose the patient's blood type" />
                        <div role="radiogroup" aria-label="Patient blood type" className="grid grid-cols-4 gap-2">
                          {BLOOD_TYPES.map(bt => {
                            const on = labPatient === bt;
                            return (
                              <button
                                key={bt}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => pickLabPatient(bt)}
                                className={`h-12 rounded-2xl border-[1.5px] font-display font-extrabold text-[16px] transition active:scale-95 md:hover:-translate-y-0.5 ${
                                  on
                                    ? 'bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c] border-transparent shadow-[0_10px_20px_-12px_rgba(20,8,10,0.6)]'
                                    : 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] hover:border-brand-accent dark:hover:border-[#ff7d8b]'
                                }`}
                              >
                                {bt.replace('-', '−')}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3.5 flex items-center gap-4 p-3.5 rounded-2xl bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328]">
                          <CompatRing count={compatibleCount} total={BLOOD_TYPES.length} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-brand-ink dark:text-[#f8ece9]">Patient antibodies</p>
                            <p className="text-[12.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5 font-mono">{antibodyText}</p>
                            <p className="text-[12px] text-brand-muted dark:text-[#c2a8a9] mt-1">Compatible with {compatibleCount} of 8 donor types</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <StepLabel n={2} text="Load a donor bag" />
                        <div role="radiogroup" aria-label="Donor blood bag" className="grid grid-cols-4 gap-2.5">
                          {BLOOD_TYPES.map(bt => {
                            const on = labDonor === bt;
                            const tested = labResults[bt];
                            return (
                              <button
                                key={bt}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onPointerDown={(e) => startDrag(e, { label: bt.replace('-', '−') }, (id) => { if (id === 'well') pickLabDonor(bt); }, () => pickLabDonor(bt))}
                                onPointerMove={moveDrag}
                                onPointerUp={endDrag}
                                onPointerCancel={cancelDrag}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickLabDonor(bt); } }}
                                className={`group relative h-14 md:h-16 rounded-2xl border-[1.5px] font-display font-extrabold text-[17px] select-none transition-all duration-200 active:scale-95 md:cursor-grab md:hover:-translate-y-1 ${
                                  on
                                    ? 'bg-gradient-to-br from-[#e5424f] to-[#9c1322] text-white border-transparent shadow-[0_12px_22px_-12px_#9c1322] -translate-y-0.5'
                                    : 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] hover:border-brand-accent dark:hover:border-[#ff7d8b]'
                                }`}
                              >
                                {bt.replace('-', '−')}
                                {tested !== undefined && (
                                  <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-brand-surface dark:border-[#25141a] ${tested ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-accent dark:bg-[#ff7d8b]'}`}></span>
                                )}
                                <span className="pointer-events-none hidden md:block absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg bg-brand-ink dark:bg-[#f8ece9] text-white dark:text-[#150a0c] text-[11px] font-mono font-semibold opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition z-20">
                                  {getAntigens(bt)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-3 text-[12.5px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed">
                          <span className="hidden md:inline">Drag a bag into the well, or click it. Hover a bag to see its antigens. </span>
                          <span className="md:hidden">Tap a bag to load it into the well. </span>
                          Green dot = compatible. Red dot = clumped.
                        </p>
                      </div>
                    </div>

                    {/* Step 3: the well */}
                    <div className="relative bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[26px] p-5 md:p-7 shadow-custom flex flex-col items-center text-center">
                      <div className="w-full">
                        <StepLabel
                          n={3}
                          text="Mix and read the result"
                          right={labScore.total > 0 && (
                            <span className="flex-none inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] text-[11.5px] font-mono font-bold">
                              Predicted {labScore.right}/{labScore.total}
                            </span>
                          )}
                        />
                      </div>

                      <div
                        data-drop="well"
                        className={`relative mt-1 w-[200px] h-[200px] md:w-[250px] md:h-[250px] rounded-full bg-gradient-to-b from-[#fdf7f4] to-[#f2e3dd] dark:from-[#2a161b] dark:to-[#1e1013] border-[6px] overflow-hidden transition-all duration-300 ${
                          overDrop === 'well'
                            ? 'border-brand-accent dark:border-[#ff7d8b] scale-[1.03] shadow-[0_0_0_10px_rgba(201,37,58,0.14)]'
                            : 'border-white dark:border-[#3b2328] shadow-[inset_0_6px_18px_-8px_rgba(111,8,24,0.25),0_18px_30px_-18px_rgba(111,8,24,0.4)]'
                        }`}
                      >
                        <div className={`absolute left-0 right-0 bottom-0 transition-all duration-700 ease-out bg-gradient-to-t ${
                          labShowResult && !labOk ? 'from-[#7a0d1a]/70 to-[#e5424f]/35' : 'from-[#9c1322]/55 to-[#e5424f]/20'
                        } ${labDonor ? 'h-[60%] opacity-100' : 'h-0 opacity-0'}`}></div>

                        {labDonor && (
                          <span key={`ripple-${labDonor}`} className="absolute left-1/2 top-1/2 w-full h-full rounded-full border-2 border-brand-accent dark:border-[#ff7d8b] pointer-events-none" style={{ animation: 'bbBurst 0.9s ease-out forwards' }}></span>
                        )}

                        {labShowResult && runId > 0 && (
                          <span key={`res-${runId}`} className={`absolute left-1/2 top-1/2 w-20 h-20 rounded-full border-2 pointer-events-none ${labOk ? 'border-brand-ok dark:border-[#58cf92]' : 'border-brand-accent dark:border-[#ff7d8b]'}`} style={{ animation: 'bbBurst 0.9s ease-out forwards' }}></span>
                        )}

                        {labPhase === 'mixing' && BUBBLES.map((b, i) => (
                          <span
                            key={i}
                            className="absolute rounded-full bg-white/50 border border-white/70 pointer-events-none"
                            style={{ left: `${b.l}%`, bottom: '8%', width: b.s, height: b.s, animation: `bbRise 1.4s ease-in ${b.d}s infinite` }}
                          ></span>
                        ))}

                        <div className={`absolute inset-0 ${labPhase === 'mixing' ? 'animate-spin' : ''}`} style={{ animationDuration: '1.1s' }}>
                          {SCATTER.map((pos, i) => {
                            const p = clumped ? pos : CLUMP[i];
                            return (
                              <span
                                key={i}
                                className={`absolute w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-gradient-to-br from-[#e5424f] to-[#9c1322] shadow-sm transition-all duration-700 ease-out ${labDonor ? 'opacity-100' : 'opacity-30'}`}
                                style={{ left: `${p[0]}%`, top: `${p[1]}%`, transform: 'translate(-50%, -50%)' }}
                              />
                            );
                          })}
                        </div>

                        {overDrop === 'well' && (
                          <div className="absolute inset-x-0 top-[16%] text-center text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] text-brand-accent dark:text-[#ff7d8b] pointer-events-none">
                            Drop here
                          </div>
                        )}
                      </div>

                      <p className={`mt-5 text-[13px] font-bold font-mono uppercase tracking-wider ${
                        labShowResult ? (labOk ? 'text-brand-ok dark:text-[#58cf92]' : 'text-brand-accent dark:text-[#ff7d8b]') : 'text-brand-muted dark:text-[#c2a8a9]'
                      }`}>
                        {labPhase === 'mixing'
                          ? 'Mixing...'
                          : labShowResult
                            ? (labOk ? 'No clumping' : 'Clumping detected')
                            : labDonor
                              ? 'Ready. Predict, then mix.'
                              : 'Load a donor bag to begin'}
                      </p>

                      {labDonor && !labShowResult && labPhase === 'idle' && (
                        <div className="w-full mt-5">
                          <p className="text-[11.5px] font-mono uppercase tracking-wider text-brand-muted dark:text-[#c2a8a9] mb-2">Predict first (optional)</p>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setLabGuess(true)}
                              aria-pressed={labGuess === true}
                              className={`h-11 rounded-xl border-[1.5px] text-[13.5px] font-bold transition active:scale-95 ${
                                labGuess === true
                                  ? 'bg-brand-ok dark:bg-[#58cf92] text-white dark:text-[#173326] border-transparent'
                                  : 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] md:hover:border-brand-ok'
                              }`}
                            >
                              ✓ Compatible
                            </button>
                            <button
                              type="button"
                              onClick={() => setLabGuess(false)}
                              aria-pressed={labGuess === false}
                              className={`h-11 rounded-xl border-[1.5px] text-[13.5px] font-bold transition active:scale-95 ${
                                labGuess === false
                                  ? 'bg-brand-accent dark:bg-[#ff7d8b] text-white dark:text-[#3a1a20] border-transparent'
                                  : 'bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] border-brand-line dark:border-[#3b2328] md:hover:border-brand-accent'
                              }`}
                            >
                              ✕ It clumps
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <button
                          type="button"
                          onClick={mixSample}
                          disabled={!labDonor || labPhase === 'mixing'}
                          className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-gradient-to-r from-[#c9253a] to-[#9c1322] text-white font-bold text-[15px] shadow-[0_14px_26px_-14px_#9c1322] md:hover:-translate-y-0.5 active:scale-[0.98] transition disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
                        >
                          {labPhase === 'mixing' ? 'Mixing...' : labShowResult ? 'Test again' : 'Mix sample'}
                        </button>
                        {(Object.keys(labResults).length > 0 || labScore.total > 0) && (
                          <button type="button" onClick={clearLabResults} className="text-[13px] font-bold text-brand-muted dark:text-[#c2a8a9] hover:text-brand-ink dark:hover:text-[#f8ece9] transition px-3 py-2">
                            Clear results
                          </button>
                        )}
                      </div>

                      {labShowResult && (
                        labOk ? (
                          <div className="w-full mt-6 p-4 rounded-2xl bg-brand-okSoft dark:bg-[#173326] border border-brand-ok/20 text-left animate-[rise_0.35s_ease_both]">
                            <p className="font-display font-extrabold text-[17px] text-brand-ok dark:text-[#58cf92]">Compatible</p>
                            <p className="mt-1 text-[13.5px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">
                              {labDonor} blood can be given to {labPatient}. The red cells stayed separate, so no antibody reaction was seen.
                            </p>
                          </div>
                        ) : (
                          <div className="w-full mt-6 p-4 rounded-2xl bg-brand-blush dark:bg-[#3a1a20] border border-brand-accent/20 dark:border-[#ff7d8b]/25 text-left animate-[rise_0.35s_ease_both]">
                            <p className="font-display font-extrabold text-[17px] text-brand-accent dark:text-[#ff7d8b]">Not compatible</p>
                            <div className="mt-1.5 space-y-1.5">
                              {getLabReasons(labPatient, labDonor).map(r => (
                                <p key={r} className="text-[13.5px] leading-relaxed text-brand-ink dark:text-[#f8ece9]">{r}</p>
                              ))}
                            </div>
                          </div>
                        )
                      )}

                      {labVerdict && labShowResult && (
                        <p className={`mt-3 w-full text-left text-[13px] font-semibold ${labVerdict.correct ? 'text-brand-ok dark:text-[#58cf92]' : 'text-brand-muted dark:text-[#c2a8a9]'}`}>
                          {labVerdict.correct ? 'You called it. Your prediction was right.' : 'Not this time. Check the antigens by hovering the bags.'}
                        </p>
                      )}

                      <p className="mt-auto pt-6 text-[12px] text-brand-muted dark:text-[#c2a8a9] leading-relaxed max-w-[360px]">
                        Learning simulation. Real crossmatching is done by the hospital blood bank.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drag ghost (mouse drag on PC) */}
            {ghost && (
              <div
                className="fixed z-[9999] pointer-events-none min-w-[56px] h-14 px-2 rounded-2xl bg-gradient-to-br from-[#e5424f] to-[#9c1322] text-white font-display font-extrabold text-[15px] flex items-center justify-center shadow-[0_20px_30px_-10px_rgba(111,8,24,0.6)]"
                style={{ left: ghost.x, top: ghost.y, transform: 'translate(-50%, -50%) rotate(-8deg) scale(1.08)' }}
              >
                {ghost.label}
              </div>
            )}
          </div>
        </section>

        {/* Donor Pitch Section */}
        <section id="donors" className="py-14 md:py-28 scroll-mt-24">
          <div className="max-w-[1160px] mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-[72px] items-center">
            <div>
              <span className="font-mono text-[12.5px] tracking-[0.14em] uppercase text-brand-accent dark:text-[#ff7d8b]">For donors</span>
              <h2 className="font-display font-extrabold text-[30px] md:text-[52px] tracking-tight mt-3 text-balance text-brand-ink dark:text-[#f8ece9]">You decide when you're available.</h2>
              <p className="mt-3.5 text-brand-muted dark:text-[#c2a8a9]">Switch on "Available to Donate" and nearby requesters can find you. Switch it off whenever life gets busy.</p>
              <ul className="mt-6 space-y-3">
                {[
                  'One tap to show or hide your profile',
                  'Accept or decline each request on your own terms',
                  'Your contact details stay private until you accept'
                ].map(text => (
                  <li key={text} className="flex items-start gap-3 text-brand-muted dark:text-[#c2a8a9]">
                    <span className="flex-none mt-0.5 w-5 h-5 rounded-full bg-brand-blush dark:bg-[#3a1a20] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-brand-accent dark:text-[#ff7d8b]"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] rounded-[26px] p-6 md:p-8 shadow-custom max-w-[440px] w-full mx-auto">
              <div className="flex items-center justify-between gap-4">
                <strong className="font-display font-bold text-[22px] md:text-2xl tracking-tight text-brand-ink dark:text-[#f8ece9]">Available to Donate</strong>
                <button 
                  onClick={() => setDemoSwitchOn(!demoSwitchOn)}
                  aria-pressed={demoSwitchOn}
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
            <div className="max-w-[1160px] mx-auto relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-brand-crimsonHi dark:from-[#f2606f] to-brand-crimsonDeep dark:to-[#8f1224] text-white p-7 md:p-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-7 items-center">
              <div className="absolute -right-[60px] -top-[80px] w-[340px] h-[340px] rounded-full bg-white/10 pointer-events-none"></div>
              <div className="relative z-10">
                <h2 className="font-display font-extrabold text-[32px] md:text-[54px] leading-[1.1] text-balance tracking-tight">Every drop counts.</h2>
                <p className="mt-3 text-white/85 max-w-[30em]">Join the community. Ask for help when you need it, or be the person who answers.</p>
              </div>
              <div className="relative z-10 grid grid-cols-2 md:flex gap-3">
                <button onClick={() => onOpenAuth(false)} className="px-5 py-3 bg-white text-[#7a0d1a] dark:text-[#8f1224] font-bold rounded-xl hover:-translate-y-px hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)] transition">Register</button>
                <button onClick={() => onOpenAuth(true)} className="px-5 py-3 bg-transparent border border-white/55 text-white font-bold rounded-xl hover:bg-white/10 transition">Log in</button>
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