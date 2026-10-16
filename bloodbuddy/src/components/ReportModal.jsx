import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ReportModal({ request, currentUser, targetUser, onClose, onReportSubmitted }) {
  const [reason, setReason] = useState('no_show');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!details.trim()) {
      setErrorMessage('Please provide specific details regarding this incident.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('reports').insert([
      {
        request_id: request.id,
        reporter_id: currentUser.id,
        reported_user_id: targetUser.id,
        reason: reason,
        details: details.trim(),
      },
    ]);

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      if (onReportSubmitted) onReportSubmitted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
        
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Report Coordination Issue</h3>
            <p className="text-[11px] text-slate-500">Subject: {targetUser.full_name || 'User'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {/* US-10 Moderation Disclaimer */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
          <strong>Moderation Notice:</strong> Reports are submitted for administrative review and do not automatically restrict or penalize accounts. False reporting is subject to platform review (US-10).
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmitReport} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blood-500 focus:outline-none"
            >
              <option value="no_show">Donor / Requester did not show up (No-Show)</option>
              <option value="unresponsive_during_coordination">Unresponsive during active coordination</option>
              <option value="false_information">Inaccurate / False information provided</option>
              <option value="inappropriate_behavior">Inappropriate / Unsafe behavior</option>
              <option value="other">Other issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation</label>
            <textarea
              rows="3"
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what occurred during the hospital coordination..."
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}