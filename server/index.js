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

// Helper para i-check kung valid UUID (iwas-crash sa database)
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

    const payload = {
      workflow_id: process.env.DIDIT_WORKFLOW_ID,
      vendor_data: userId,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}`,
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

// Endpoint 2: Didit Webhook Receiver
app.post('/api/didit/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('Natanggap na Webhook Payload:', JSON.stringify(payload, null, 2));

    // Safeguard 1: Test Webhook mula sa Didit Console
    if (
      payload.metadata?.test_webhook === true ||
      payload.metadata?.test_webhook === 'true' ||
      payload.vendor_data === 'test-vendor-data-123' ||
      payload['X-Didit-Test-Webhook'] === 'true'
    ) {
      console.log('Matagumpay na natanggap ang Didit Test Event!');
      return res.status(200).json({ status: 'success', message: 'Test webhook acknowledged' });
    }

    // Kunin ang User ID mula sa vendor_data
    const userId = payload.vendor_data || payload.client_user_id;

    if (!userId) {
      console.warn('Webhook received without vendor_data/userId');
      return res.status(200).json({ message: 'Ignored: No vendor_data' });
    }

    if (!isValidUUID(userId)) {
      console.warn(`Ignored: vendor_data "${userId}" is not a valid UUID.`);
      return res.status(200).json({ message: 'Ignored non-UUID vendor_data' });
    }

    // Kunin ang status ng desisyon
    const decisionStatus = payload.status || payload.decision?.status;
    const isApproved = decisionStatus === 'Approved' || decisionStatus === 'verified' || decisionStatus === 'approved';
    const newStatus = isApproved ? 'verified' : 'rejected';

    const updatePayload = {
      id_verification_status: newStatus,
    };

    if (isApproved) {
      updatePayload.id_verified_at = new Date().toISOString();
      updatePayload.id_verified_by = 'Didit KYC System';
    } else {
      updatePayload.id_rejection_reason = payload.decline_reason || payload.decision?.decline_reason || 'Verification unsuccessful';
    }

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (error) {
      console.error('Database update failed:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`User ${userId} status updated to: ${newStatus}`);
    res.status(200).json({ status: 'success', message: 'Profile updated' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BloodBuddy Didit Auth Service running on port ${PORT}`);
});