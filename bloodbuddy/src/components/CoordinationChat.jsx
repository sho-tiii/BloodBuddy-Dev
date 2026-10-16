import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function CoordinationChat({ request, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();

    // Realtime channel
    const channel = supabase
      .channel(`chat_${request.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coordination_messages',
          filter: `request_id=eq.${request.id}`,
        },
        async (payload) => {
          // Kunin ang profile ng sender kung hindi sarili
          if (payload.new.sender_id !== currentUser.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.sender_id)
              .single();

            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, { ...payload.new, sender: profile }];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [request.id, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('coordination_messages')
      .select('*, sender:profiles(full_name)')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSendError('');
    if (!newMessage.trim()) return;

    const textToSend = newMessage.trim();
    setNewMessage('');

    // Optimistic message para makita mo agad sa sarili mong screen
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      request_id: request.id,
      sender_id: currentUser.id,
      message: textToSend,
      created_at: new Date().toISOString(),
      sender: { full_name: 'You' },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from('coordination_messages')
      .insert([
        {
          request_id: request.id,
          sender_id: currentUser.id,
          message: textToSend,
        },
      ])
      .select('*, sender:profiles(full_name)')
      .single();

    if (error) {
      setSendError(`Failed to deliver message: ${error.message}`);
      // Tanggalin ang temporary message kapag nag-fail
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data) {
      // Palitan ang temporary ID ng opisyal na ID mula sa database
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full h-[520px] shadow-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h3 className="text-sm font-bold text-slate-900">Coordination Channel</h3>
              <span className="text-[11px] font-semibold bg-blood-100 text-blood-700 px-2 py-0.5 rounded">
                {request.blood_type}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Patient: <strong>{request.patient_name}</strong> • Hospital: {request.hospital_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500 text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Error notification banner if blocked by policy */}
        {sendError && (
          <div className="bg-red-50 text-red-700 text-xs px-3 py-1.5 border-b border-red-200">
            {sendError}
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <p className="text-xs text-center text-slate-400 py-6">Loading messages...</p>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 space-y-1">
              <p className="text-xs font-semibold text-slate-600">Secure coordination channel established.</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Coordinate donation schedules and hospital intake protocols safely here (US-08)[cite: 13].
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                    {isMe ? 'You' : msg.sender?.full_name || 'Participant'}
                  </span>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-blood-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your coordination message..."
            className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blood-600 hover:bg-blood-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}