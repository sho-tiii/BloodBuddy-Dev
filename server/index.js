import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper para i-check kung valid UUID
const isValidUUID = (str) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

// Endpoint 1: Create Didit Session
app.post('/api/didit/create-session', async (req, res) => {
  try {
    const { userId, userEmail } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // FIX: Nilagyan natin ng explicit return URLs para piliting bumalik ang Didit sa BloodBuddy
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?didit_return=true`;

    const payload = {
      workflow_id: process.env.DIDIT_WORKFLOW_ID,
      vendor_data: userId,
      callback_url: returnUrl,
      success_url: returnUrl,
      error_url: returnUrl,
      redirect_url: returnUrl,
    };

    if (userEmail) {
      payload.contact_email = userEmail;
    }

    const response = await fetch('https://verification.didit.me/v1/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIDIT_API_KEY}`,
        'x-api-key': process.env.DIDIT_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const sessionData = await response.json();

    if (!response.ok) {
      console.error('Didit session error:', sessionData);
      return res.status(response.status).json({ 
        error: sessionData.detail || sessionData.message || 'Failed to create Didit session' 
      });
    }

    // Itala sa database ang session id at gawing pending
    await supabase
      .from('profiles')
      .update({
        id_verification_status: 'pending',
        didit_session_id: sessionData.session_id || sessionData.id || sessionData.session_token,
      })
      .eq('id', userId);

    res.json({
      url: sessionData.url || sessionData.session_url,
      sessionId: sessionData.session_id || sessionData.id,
    });
  } catch (err) {
    console.error('Server error on create-session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint 2: Didit Webhook Receiver (For Production)
app.post('/api/didit/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    
    if (
      payload.metadata?.test_webhook === true ||
      payload.metadata?.test_webhook === 'true' ||
      payload.vendor_data === 'test-vendor-data-123' ||
      payload['X-Didit-Test-Webhook'] === 'true'
    ) {
      return res.status(200).json({ status: 'success', message: 'Test webhook acknowledged' });
    }

    const userId = payload.vendor_data || payload.client_user_id;

    if (!userId || !isValidUUID(userId)) {
      return res.status(200).json({ message: 'Ignored non-UUID or missing vendor_data' });
    }

    const decisionStatus = payload.status || payload.decision?.status;
    const isApproved = decisionStatus === 'Approved' || decisionStatus === 'verified' || decisionStatus === 'approved';
    const newStatus = isApproved ? 'verified' : 'rejected';

    const updatePayload = { id_verification_status: newStatus };

    if (isApproved) {
      updatePayload.id_verified_at = new Date().toISOString();
      updatePayload.id_verified_by = 'Didit KYC System';
    } else {
      updatePayload.id_rejection_reason = payload.decline_reason || payload.decision?.decline_reason || 'Verification unsuccessful';
    }

    await supabase.from('profiles').update(updatePayload).eq('id', userId);
    res.status(200).json({ status: 'success', message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BAGONG ENDPOINT 3: Manual Status Checker (Crucial para sa Localhost / Fallback)
app.post('/api/didit/check-status', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // 1. Kunin ang session ID sa database
    const { data: profile } = await supabase
      .from('profiles')
      .select('didit_session_id, id_verification_status')
      .eq('id', userId)
      .single();

    if (!profile || !profile.didit_session_id) {
      return res.status(404).json({ error: 'No verification session found.' });
    }

    // Kung verified na via webhook, wag nang ipagpatuloy
    if (profile.id_verification_status === 'verified') {
       return res.json({ status: 'verified' });
    }

    // 2. I-fetch ang actual status galing mismong Didit API
    const response = await fetch(`https://verification.didit.me/v1/session/${profile.didit_session_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.DIDIT_API_KEY}`,
        'x-api-key': process.env.DIDIT_API_KEY,
      },
    });

    const sessionData = await response.json();
    
    // Basahin ang decision status
    const decisionStatus = sessionData.status || sessionData.decision?.status;
    const isApproved = decisionStatus === 'Approved' || decisionStatus === 'verified' || decisionStatus === 'approved';
    const isRejected = decisionStatus === 'Declined' || decisionStatus === 'rejected';
    
    const newStatus = isApproved ? 'verified' : (isRejected ? 'rejected' : 'pending');

    // 3. I-update ang database kung may nagbago
    if (newStatus !== profile.id_verification_status) {
       const updatePayload = { id_verification_status: newStatus };
       if (isApproved) {
         updatePayload.id_verified_at = new Date().toISOString();
         updatePayload.id_verified_by = 'Didit KYC System (Manual Sync)';
       }
       await supabase.from('profiles').update(updatePayload).eq('id', userId);
    }

    res.json({ status: newStatus });
  } catch (err) {
    console.error('Check status error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BloodBuddy Didit Auth Service running on port ${PORT}`);
});