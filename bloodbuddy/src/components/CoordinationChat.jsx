import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { createPortal } from 'react-dom';

export default function CoordinationChat({ request, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [accessError, setAccessError] = useState('');
  const messagesEndRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const canChat = Boolean(
    currentUser?.id &&
    (request?.requester_id === currentUser.id || request?.selected_donor_id === currentUser.id) &&
    request?.donor_response === 'accepted' &&
    request?.status !== 'cancelled'
  );

  const fetchMessages = useCallback(async () => {
    if (!canChat) {
      setAccessError('Chat is available only to the requester and assigned donor after the request is accepted.');
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('coordination_messages')
      .select('*, sender:profiles(full_name)')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true });

    if (error) {
      setAccessError(`Unable to load this chat: ${error.message}`);
      setMessages([]);
    } else {
      setAccessError('');
      setMessages(data || []);
    }
    setLoading(false);
  }, [canChat, request?.id]);

  useEffect(() => {
    fetchMessages();
    if (!canChat) return undefined;

    const channel = supabase
      .channel(`chat_${request.id}_${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'coordination_messages', filter: `request_id=eq.${request.id}`,
      }, async (payload) => {
        const message = payload.new;
        let sender = null;
        if (message.sender_id !== currentUser.id) {
          const { data } = await supabase.from('profiles').select('full_name').eq('id', message.sender_id).maybeSingle();
          sender = data;
        } else {
          sender = { full_name: 'You' };
        }
        setMessages((previous) => previous.some((item) => item.id === message.id)
          ? previous
          : [...previous, { ...message, sender }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages, canChat, request?.id, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { 
        setSendError('File size must be under 5MB.');
        return;
      }
      setSelectedFile(file);
      setSendError('');
    }
  };

  const uploadFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${request.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_attachments') 
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    setSendError('');
    const messageText = newMessage.trim();
    
    if ((!messageText && !selectedFile) || sending || !canChat) return;

    setSending(true);
    try {
      let finalMessage = messageText;

      if (selectedFile) {
        const fileUrl = await uploadFile(selectedFile);
        finalMessage = `[Attachment: ${fileUrl}] ${finalMessage}`.trim();
      }

      const { data, error } = await supabase
        .from('coordination_messages')
        .insert({ request_id: request.id, sender_id: currentUser.id, message: finalMessage })
        .select('*, sender:profiles(full_name)')
        .single();

      if (error) {
        throw error;
      } else if (data) {
        setMessages((previous) => previous.some((item) => item.id === data.id) ? previous : [...previous, data]);
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      setSendError(`Message was not sent: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const renderMessageContent = (text) => {
    const attachmentRegex = /\[Attachment: (.*?)\]/g;
    const match = attachmentRegex.exec(text);
    
    if (match) {
      const url = match[1];
      const cleanText = text.replace(match[0], '').trim();
      
      const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(url) || url.includes('chat_attachments'); 
      
      return (
        <div className="flex flex-col gap-2">
          {isImage ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt="Attachment" className="max-w-full rounded-lg border border-brand-line dark:border-[#3b2328] max-h-[200px] object-contain bg-white/5" />
            </a>
          ) : (
             <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-accent break-all">
               📎 Download File
             </a>
          )}
          {cleanText && <span>{cleanText}</span>}
        </div>
      );
    }
    return text;
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-brand-ink/40 p-4 backdrop-blur-sm dark:bg-black/60 font-body">
      <div className="bg-brand-surface dark:bg-[#25141a] rounded-3xl max-w-[600px] w-full h-[85vh] min-h-[500px] max-h-[700px] shadow-custom flex flex-col overflow-hidden border border-brand-line dark:border-[#3b2328] animate-[rise_0.2s_ease_both]">
        
        <div className="p-5 md:p-6 border-b border-brand-line dark:border-[#3b2328] flex items-center justify-between gap-4 flex-none bg-brand-surface dark:bg-[#25141a]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
              <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${canChat ? 'bg-brand-ok dark:bg-[#58cf92]' : 'bg-brand-crimsonHi dark:bg-[#f2606f]'}`} />
              <h3 className="text-[18px] md:text-[20px] font-display font-extrabold text-brand-ink dark:text-[#f8ece9] leading-none">Coordination Channel</h3>
              <span className="text-[11px] font-bold bg-brand-blush dark:bg-[#3a1a20] text-brand-accent dark:text-[#ff7d8b] px-2.5 py-0.5 rounded-md leading-none border border-brand-accent/20">
                {request.blood_type.replace('-', '−')}
              </span>
            </div>
            <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] leading-snug">
              Patient: <strong className="text-brand-ink dark:text-[#f8ece9]">{request.patient_name}</strong> · Hospital: {request.hospital_name}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            aria-label="Close chat" 
            className="w-9 h-9 flex-none flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-ink dark:hover:text-white hover:bg-brand-bg dark:hover:bg-[#150a0c] transition"
          >
            ✕
          </button>
        </div>

        {(accessError || sendError) && (
          <div role="alert" className="bg-brand-blush dark:bg-[#3a1a20] text-brand-crimsonHi dark:text-[#f2606f] text-[13px] font-bold px-6 py-3 border-b border-brand-line dark:border-[#3b2328] flex-none">
            {accessError || sendError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 bg-brand-bg dark:bg-[#150a0c] custom-scrollbar">
          {loading ? (
            <p className="text-[13.5px] font-medium text-center text-brand-muted dark:text-[#c2a8a9] py-10">Loading messages...</p>
          ) : !canChat ? (
            <p className="text-[13.5px] font-medium text-center text-brand-muted dark:text-[#c2a8a9] py-10">This coordination chat is not available for this request.</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 bg-brand-surface dark:bg-[#25141a] rounded-full mx-auto flex items-center justify-center border border-brand-line dark:border-[#3b2328] mb-3">
                <svg className="w-5 h-5 text-brand-accent dark:text-[#ff7d8b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <p className="text-[15px] font-bold text-brand-ink dark:text-[#f8ece9]">Start coordinating safely.</p>
              <p className="text-[13px] text-brand-muted dark:text-[#c2a8a9] max-w-[250px] mx-auto leading-relaxed">
                Only the requester and assigned donor should use this chat to coordinate next steps.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.sender_id === currentUser.id;
              return (
                <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] font-medium text-brand-muted dark:text-[#c2a8a9] mb-1.5 px-1">
                    {isMe ? 'You' : message.sender?.full_name || 'Participant'}
                  </span>
                  <div 
                    className={`max-w-[85%] break-words px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                      isMe 
                        ? 'bg-brand-btn dark:bg-[#c9253a] text-white rounded-[20px] rounded-br-sm' 
                        : 'bg-brand-surface dark:bg-[#25141a] border border-brand-line dark:border-[#3b2328] text-brand-ink dark:text-[#f8ece9] rounded-[20px] rounded-bl-sm'
                    }`}
                  >
                    {renderMessageContent(message.message)}
                  </div>
                  <span className="text-[10px] font-medium text-brand-muted/70 dark:text-[#c2a8a9]/70 mt-1.5 px-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-5 bg-brand-surface dark:bg-[#25141a] border-t border-brand-line dark:border-[#3b2328] flex-none">
          {selectedFile && (
            <div className="flex items-center justify-between bg-brand-bg dark:bg-[#150a0c] border border-brand-line dark:border-[#3b2328] rounded-lg p-2 mb-3">
               <span className="text-[12px] text-brand-ink dark:text-[#f8ece9] truncate pr-3 flex items-center gap-2">
                 <svg className="w-3.5 h-3.5 text-brand-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                 {selectedFile.name}
               </span>
               <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-brand-muted hover:text-brand-crimsonHi p-1 transition">✕</button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canChat || loading || sending}
              className="px-3 text-brand-muted hover:text-brand-ink dark:hover:text-[#f8ece9] transition disabled:opacity-50"
              title="Attach image or file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*,.pdf,.doc,.docx"
            />

            <input 
              type="text" 
              value={newMessage} 
              onChange={(event) => setNewMessage(event.target.value)} 
              maxLength={2000} 
              disabled={!canChat || loading || sending} 
              placeholder="Type your coordination message..." 
              className="flex-1 min-w-0 text-[14.5px] border-[1.5px] border-brand-line dark:border-[#3b2328] bg-brand-bg dark:bg-[#150a0c] text-brand-ink dark:text-[#f8ece9] rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-accent transition disabled:opacity-60" 
            />
            <button 
              type="submit" 
              disabled={!canChat || (!newMessage.trim() && !selectedFile) || sending || loading} 
              className="px-6 py-3.5 text-[14px] font-bold text-white bg-brand-btn dark:bg-[#c9253a] hover:opacity-90 rounded-xl shadow-[0_8px_20px_-10px_#a4121f] transition disabled:opacity-60 flex items-center justify-center flex-none min-w-[90px]"
            >
              {sending ? (
                <svg className="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}