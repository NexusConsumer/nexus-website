import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { hmacSha256 } from '../utils/crypto';
import { prisma } from '../config/database';
import * as OrchestrationService from '../services/orchestration.service';
import * as PaymentService from '../services/payment.service';
import * as ChatService from '../services/chat.service';
import { getIO } from '../socket';

const router = Router();

// ─── Idempotency helpers ─────────────────────────────────

async function isProcessed(externalId: string): Promise<boolean> {
  const existing = await prisma.webhookLog.findUnique({ where: { externalId } });
  return !!existing;
}

async function markProcessed(externalId: string, source: string): Promise<void> {
  await prisma.webhookLog
    .create({ data: { externalId, source } })
    .catch(() => {}); // Ignore duplicate key race condition
}

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

// ─── POST /api/webhooks/whatsapp — Meta inbound messages ──

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

      // Handle incoming messages — route through orchestration
      for (const msg of value.messages ?? []) {
        if (msg.type !== 'text') continue;

        const externalId = msg.id;

        // Idempotency check
        if (await isProcessed(externalId)) continue;
        await markProcessed(externalId, 'meta');

        const from = msg.from;
        const text = msg.text?.body ?? '';

        // Route through orchestration service
        await OrchestrationService.handleIncomingWhatsAppMessage({ from, text, externalId });
      }

      // Handle message status updates (delivered, read, etc.)
      for (const status of value.statuses ?? []) {
        console.log(`[Webhook] Status update: ${status.id} → ${status.status}`);
      }
    }
  }
});

// ─── POST /api/webhooks/greenapi — Green API inbound ──────

router.post('/greenapi', async (req: Request, res: Response) => {
  // Always respond 200 immediately
  res.status(200).send('OK');

  let payload: GreenApiWebhookPayload;
  try {
    const rawBody = req.body as Buffer;
    payload = JSON.parse(rawBody.toString()) as GreenApiWebhookPayload;
  } catch {
    return;
  }

  // Only process incoming text messages
  if (payload.typeWebhook !== 'incomingMessageReceived') return;
  if (payload.messageData?.typeMessage !== 'textMessage') return;

  const externalId = payload.idMessage;
  const from = payload.senderData?.sender?.replace('@c.us', '') ?? '';
  const text = payload.messageData?.textMessageData?.textMessage ?? '';

  if (!externalId || !from || !text) return;

  // Idempotency check
  if (await isProcessed(externalId)) return;
  await markProcessed(externalId, 'green_api');

  // Route through orchestration service
  await OrchestrationService.handleIncomingWhatsAppMessage({ from, text, externalId });
});

// ─── POST /api/webhooks/email-inbound — Agent email replies ─

router.post('/email-inbound', async (req: Request, res: Response) => {
  // Parse body (JSON — sent by Make.com / Zapier / any email-to-webhook service)
  let payload: EmailInboundPayload;
  try {
    const rawBody = req.body as Buffer;
    payload = JSON.parse(rawBody.toString()) as EmailInboundPayload;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Verify secret
  if (env.INBOUND_EMAIL_SECRET && payload.secret !== env.INBOUND_EMAIL_SECRET) {
    res.status(403).json({ error: 'Invalid secret' });
    return;
  }

  const { subject, text, from } = payload;
  if (!subject || !text) {
    res.status(400).json({ error: 'Missing subject or text' });
    return;
  }

  // Extract session short ID from subject: [Chat-XXXXXXXX]
  const match = subject.match(/\[Chat-([a-zA-Z0-9]{6,})\]/);
  if (!match) {
    res.status(400).json({ error: 'No session ID found in subject' });
    return;
  }

  const shortId = match[1];

  // Resolve session
  const sessions = await prisma.chatSession.findMany({
    where: {
      id: { endsWith: shortId },
      status: { in: ['OPEN', 'PENDING_HUMAN'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  });

  const session = sessions[0];
  if (!session) {
    res.status(404).json({ error: `Session ${shortId} not found` });
    return;
  }

  // Clean reply text — strip quoted email content
  const cleanText = stripEmailQuote(text);
  if (!cleanText.trim()) {
    res.status(400).json({ error: 'Empty reply after stripping quotes' });
    return;
  }

  // Auto-take session if not already in HUMAN mode
  if (session.mode !== 'HUMAN') {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        mode: 'HUMAN',
        status: 'OPEN',
        assignedAgentName: from ?? 'Agent',
        modeLockUntil: new Date(Date.now() + 5000),
      },
    });

    const io = getIO();
    io.to(`session:${session.id}`).emit('mode_changed', { mode: 'HUMAN' });

    await ChatService.saveMessage({
      sessionId: session.id,
      text: 'נציג הצטרף לשיחה.',
      sender: 'SYSTEM',
      channel: 'WEB',
    });
  }

  // Save agent message
  const agentMsg = await ChatService.saveMessage({
    sessionId: session.id,
    text: cleanText,
    sender: 'AGENT',
    channel: 'EMAIL',
  });

  // Forward to customer via Socket.io
  const io = getIO();
  io.to(`session:${session.id}`).emit('new_message', {
    id: agentMsg.id,
    text: agentMsg.text,
    sender: agentMsg.sender,
    channel: agentMsg.channel,
    timestamp: agentMsg.createdAt,
  });

  console.log(`[EmailInbound] Agent reply routed to session ${shortId}: "${cleanText.slice(0, 80)}..."`);
  res.status(200).json({ ok: true, sessionId: session.id, messageId: agentMsg.id });
});

/**
 * Strip quoted email content from a reply.
 * Removes lines starting with ">", "On ... wrote:", Outlook-style headers, etc.
 */
function stripEmailQuote(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Stop at common quote markers
    if (line.match(/^On .+ wrote:$/)) break;
    if (line.match(/^-{3,}\s*Original Message/i)) break;
    if (line.match(/^_{3,}/)) break;
    if (line.match(/^From:\s/i)) break;
    if (line.match(/^Sent:\s/i)) break;
    if (line.match(/^>{1,}/)) continue; // Skip quoted lines

    result.push(line);
  }

  return result.join('\n').trim();
}

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

interface EmailInboundPayload {
  secret?: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

interface GreenApiWebhookPayload {
  typeWebhook: string;
  instanceData?: { idInstance: number; wid: string };
  timestamp: number;
  idMessage: string;
  senderData?: {
    chatId: string;
    sender: string;
    chatName: string;
    senderName: string;
  };
  messageData?: {
    typeMessage: string;
    textMessageData?: { textMessage: string };
  };
}

export default router;
