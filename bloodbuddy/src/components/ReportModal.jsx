import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

const getSafeFileName = (name = 'attachment') =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'attachment';

export default function ReportModal({ request, currentUser, targetUser, onClose, onReportSubmitted }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0] || null;
    setError('');

    if (!file) {
      setAttachment(null);
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(extension)) {
      setAttachment(null);
      e.target.value = '';
      setError('Please attach a JPG, PNG, WEBP, or PDF file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAttachment(null);
      e.target.value = '';
      setError('The attachment must be 8 MB or smaller.');
      return;
    }

    setAttachment(file);
  };

  const handleReport = async (e) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select a reason for reporting.');
      return;
    }
    if (!currentUser?.id || !request?.id) {
      setError('Unable to identify the current user or request. Please close this window and try again.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    let uploadedPath = null;

    try {
      // Upload to the existing "reports" Storage bucket only when a file is attached.
      if (attachment) {
        const safeName = getSafeFileName(attachment.name);
        uploadedPath = `${currentUser.id}/${request.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(uploadedPath, attachment, {
            cacheControl: '3600',
            upsert: false,
            contentType: attachment.type,
          });

        if (uploadError) throw uploadError;
      }

      // Match the database enum values used by the existing BloodBuddy schema.
      const reasonMap = {
        no_show: 'no_show',
        spam: 'false_information',
        harassment: 'inappropriate_behavior',
        other: 'other',
      };

      const reportPayload = {
        reporter_id: currentUser.id,
        reported_user_id: targetUser?.id || null,
        request_id: request.id,
        reason: reasonMap[reason] || reason,
        details: details.trim() || null,
        // Store the Storage object path, not a temporary signed URL.
        // The column name matches the SQL you already ran.
        attachment_url: uploadedPath,
      };

      const { error: dbError } = await supabase.from('reports').insert([reportPayload]);
      if (dbError) throw dbError;

      onReportSubmitted?.();
      onClose?.();
    } catch (err) {
      console.error('Failed to submit report:', err);

      // If the report row failed after upload, try not to leave an orphaned file.
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from('reports').remove([uploadedPath]);
        if (cleanupError) console.error('Could not clean up report attachment:', cleanupError);
      }

      setError(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[500px] w-full p-7 md:p-8 shadow-custom animate-[rise_0.2s_ease_both]">
        <div className="flex items-center justify-between border-b border-brand-line dark:border-[#3b2328] pb-4 mb-5">
          <div>
            <h3 id="report-modal-title" className="font-display font-extrabold text-[22px] text-brand-crimsonHi dark:text-[#f2606f]">Report User / Issue</h3>
            <p className="text-[13.5px] text-brand-muted dark:text-[#c2a8a9] mt-0.5">Help us keep the BloodBuddy community safe.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close report form" className="text-brand-muted hover:text-brand-ink dark:hover:text-white transition disabled:opacity-50">✕</button>
        </div>

        {error && <div role="alert" className="p-3 bg-brand-blush dark:bg-[#3a1a20] border border-brand-line dark:border-[#3b2328] rounded-xl text-brand-crimsonHi dark:text-[#f2606f] text-[13px] font-bold mb-5">{error}</div>}

        <form onSubmit={handleReport} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Reporting User:</label>
            <input type="text" disabled value={targetUser?.full_name || 'Unknown User'} className="w-full text-[15px] font-medium border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-muted rounded-xl px-4 py-3 opacity-70 cursor-not-allowed" />
          </div>

          <div>
            <label htmlFor="report-reason" className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Reason for Report <span className="text-brand-crimsonHi">*</span></label>
            <select id="report-reason" required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full text-[15px] font-medium border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-crimsonHi appearance-none">
              <option value="">Select a reason...</option>
              <option value="no_show">Donor/Requester did not show up</option>
              <option value="spam">Spam or Fake Request</option>
              <option value="harassment">Harassment or Inappropriate Behavior</option>
              <option value="other">Other Issue</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-details" className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Additional Details</label>
            <textarea id="report-details" rows="4" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Please provide more details to help admins review this report..." className="w-full text-[15px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3 focus:outline-none focus:border-brand-crimsonHi custom-scrollbar" />
          </div>

          <div>
            <label htmlFor="report-attachment" className="block text-[13px] font-bold text-brand-ink dark:text-[#f8ece9] mb-1.5">Attach File <span className="font-medium text-brand-muted">(optional)</span></label>
            <input
              ref={fileInputRef}
              id="report-attachment"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleAttachmentChange}
              disabled={isSubmitting}
              className="block w-full text-[13px] text-brand-muted file:mr-3 file:rounded-lg file:border file:border-brand-line dark:file:border-[#3b2328] file:bg-brand-bg dark:file:bg-[#150a0c] file:px-3 file:py-2 file:font-bold file:text-brand-ink dark:file:text-[#f8ece9] hover:file:opacity-80"
            />
            <p className="mt-1.5 text-[12px] text-brand-muted dark:text-[#c2a8a9]">JPG, PNG, WEBP, or PDF · Maximum 8 MB</p>
            {attachment && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] px-3 py-2">
                <span className="min-w-0 break-all text-[12px] font-medium text-brand-ink dark:text-[#f8ece9]">{attachment.name} ({(attachment.size / (1024 * 1024)).toFixed(2)} MB)</span>
                <button type="button" disabled={isSubmitting} onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="shrink-0 text-[12px] font-bold text-brand-crimsonHi dark:text-[#f2606f] hover:opacity-80 disabled:opacity-50">Remove</button>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-brand-line dark:border-[#3b2328] mt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2.5 text-[14px] font-bold text-brand-ink dark:text-[#f8ece9] bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-xl hover:opacity-80 transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-[14px] font-bold text-white bg-brand-crimsonHi dark:bg-[#f2606f] hover:opacity-90 rounded-xl shadow-sm transition disabled:opacity-70 flex items-center">
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
