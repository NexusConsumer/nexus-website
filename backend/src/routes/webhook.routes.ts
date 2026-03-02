import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { hmacSha256 } from '../utils/crypto';
import * as ChatService from '../services/chat.service';
import * as PaymentService from '../services/payment.service';
import { getIO } from '../socket';

const router = Router();

// ─── GET /api/webhooks/whatsapp — Meta verification ────────

router.get('/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[Webhook] WhatsApp verification OK');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// ─── POST /api/webhooks/whatsapp — Inbound messages ────────

router.post('/whatsapp', async (req: Request, res: Response) => {
  // HMAC verification (raw body preserved by express.raw middleware)
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = req.body as Buffer;

  if (signature && env.WHATSAPP_APP_SECRET) {
    const expected = `sha256=${hmacSha256(env.WHATSAPP_APP_SECRET, rawBody)}`;
    if (expected !== signature) {
      console.warn('[Webhook] HMAC mismatch');
      res.status(403).send('Invalid signature');
      return;
    }
  }

  // Always respond 200 immediately (Meta requires <5s)
  res.status(200).send('OK');

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(rawBody.toString()) as WhatsAppPayload;
  } catch {
    return;
  }

  // Process each entry
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      // Handle incoming messages (agent replies from WhatsApp)
      for (const msg of value.messages ?? []) {
        if (msg.type !== 'text') continue;

        const from = msg.from; // Agent's WhatsApp number
        const text = msg.text?.body ?? '';
        const waMessageId = msg.id;
        const threadId = from; // Use sender number as thread identifier

        // Find the open chat session linked to this WhatsApp thread
        const session = await ChatService.findSessionByWaThread(threadId);
        if (!session) {
          console.warn(`[Webhook] No session for WA thread ${threadId}`);
          continue;
        }

        // Save agent message to DB
        const agentMsg = await ChatService.saveMessage({
          sessionId: session.id,
          text,
          sender: 'AGENT',
          channel: 'WHATSAPP',
          waMessageId,
        });

        // Emit to customer browser via Socket.io
        const io = getIO();
        io.to(`session:${session.id}`).emit('new_message', {
          id: agentMsg.id,
          text: agentMsg.text,
          sender: agentMsg.sender,
          channel: agentMsg.channel,
          timestamp: agentMsg.createdAt,
        });
      }

      // Handle message status updates (delivered, read, etc.)
      for (const status of value.statuses ?? []) {
        // Emit status update to relevant session room
        // We'd need to look up the session by waMessageId for full accuracy
        console.log(`[Webhook] Status update: ${status.id} → ${status.status}`);
      }
    }
  }
});

// ─── POST /api/webhooks/payment — Stripe events ────────────

router.post('/payment', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const rawBody = req.body as Buffer;

  if (!signature) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  try {
    await PaymentService.handleStripeWebhook(rawBody, signature);
    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Webhook] Stripe error:', err.message);
    res.status(err.statusCode ?? 400).json({ error: err.message });
  }
});

// ─── Type definitions ──────────────────────────────────────

interface WhatsAppPayload {
  entry?: Array<{
    changes?: Array<{
      value: {
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

export default router;
