import React, { useState } from 'react';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function LandingPage({ onOpenAuth, onSearch }) {
  const [selectedType, setSelectedType] = useState('');
  const [location, setLocation] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({ bloodType: selectedType || 'All', city: location });
    }
    onOpenAuth(); // Guide visitor to sign in / sign up to interact
  };

  const handleQuickSearch = (type, city) => {
    setSelectedType(type);
    setLocation(city);
    if (onSearch) {
      onSearch({ bloodType: type, city });
    }
    onOpenAuth();
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 font-sans flex flex-col">
      {/* Navigation */}
      <nav className="max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blood-600 flex items-center justify-center text-white font-black text-lg">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-blood-700">BloodBuddy</span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-slate-600">
          <a href="#home" className="text-blood-700 border-b-2 border-blood-700 pb-1">Home</a>
          <a href="#how-it-works" className="hover:text-blood-700 transition">How It Works</a>
          <a href="#disclaimer" className="hover:text-blood-700 transition">Medical Notice</a>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onOpenAuth(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
          >
            Log In
          </button>
          <button
            onClick={() => onOpenAuth(false)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blood-600 hover:bg-blood-700 rounded-lg shadow-sm transition"
          >
            Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-12 pb-16 max-w-4xl mx-auto w-full">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-blood-700 mb-6">
          🩸 COMMUNITY BLOOD MATCHING
        </span>

        <h1 className="text-4xl sm:text-6xl font-serif font-black tracking-tight text-slate-900 leading-tight">
          Find blood when every <br className="hidden sm:block" /> second counts.
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          BloodBuddy connects families in urgent need directly with nearby volunteer donors,
          making it simple and fast to coordinate support when hospitals experience blood shortages.
        </p>

        {/* Search Widget */}
        <div className="mt-10 w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200/80 p-5 sm:p-6 text-left">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Blood Type Needed *
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blood-500 focus:outline-none"
              >
                <option value="">Select blood type (e.g. A+, O-, B+)</option>
                {BLOOD_TYPES.map(bt => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                City or Area <span className="text-[10px] text-slate-400 font-normal">(Metro Manila)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. North Caloocan or Quezon City"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blood-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blood-600 hover:bg-blood-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5"
              >
                <span>🔍</span>
                <span>Search Donors</span>
              </button>
            </div>
          </form>

          {/* Quick searches */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-[11px]">Quick searches:</span>
            <button onClick={() => handleQuickSearch('A+', 'Caloocan')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium transition">
              A+ in Caloocan
            </button>
            <button onClick={() => handleQuickSearch('O+', 'Quezon City')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium transition">
              O+ in Quezon City
            </button>
            <button onClick={() => handleQuickSearch('B+', 'Caloocan')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium transition">
              B+ in Caloocan
            </button>
            <button onClick={() => handleQuickSearch('O-', 'Manila')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium transition">
              O- in Manila
            </button>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left">
          <div className="flex items-start space-x-2.5">
            <span className="text-emerald-600 font-bold">✓</span>
            <div>
              <p className="text-xs font-bold text-slate-900">Real-Time Status</p>
              <p className="text-[11px] text-slate-500">Active availability updated by donors</p>
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="text-emerald-600 font-bold">✓</span>
            <div>
              <p className="text-xs font-bold text-slate-900">100% Voluntary</p>
              <p className="text-[11px] text-slate-500">No fees or commercial intermediaries</p>
            </div>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="text-emerald-600 font-bold">✓</span>
            <div>
              <p className="text-xs font-bold text-slate-900">Hospital Screening</p>
              <p className="text-[11px] text-slate-500">Final health tests verified at the facility</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="bg-white border-t border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blood-700">Community Workflow</span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-900">How BloodBuddy Works</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            A simple three-step coordination flow designed for urgent times.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-blood-600 text-white font-bold text-xs flex items-center justify-center">1</span>
              <h3 className="text-sm font-bold text-slate-900">Find or Post Request</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filter donors by compatible blood type and city, or submit an urgent patient request with hospital location.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-blood-600 text-white font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="text-sm font-bold text-slate-900">Donor Direct Response</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Available donors review requests and accept to indicate immediate willingness to assist.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="w-7 h-7 rounded-full bg-blood-600 text-white font-bold text-xs flex items-center justify-center">3</span>
              <h3 className="text-sm font-bold text-slate-900">Coordinate Securely</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect inside a request-specific coordination chat to schedule arrival at the medical center.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Disclaimer */}
      <footer id="disclaimer" className="border-t border-slate-200 py-8 px-6 text-center text-xs text-slate-400 space-y-2">
        <p className="max-w-xl mx-auto text-[11px] leading-relaxed">
          <strong>Notice:</strong> BloodBuddy is a community coordination platform and does not provide medical services.
          Medical verification, donor screening, and compatibility testing remain the responsibility of accredited healthcare facilities.
        </p>
        <p className="text-[10px] text-slate-500">© 2026 BloodBuddy — University of Caloocan City</p>
      </footer>
    </div>
  );
}