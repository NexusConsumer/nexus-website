import axios from 'axios';
import { env } from '../config/env';

const API_URL = `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const HEADERS = {
  Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json',
};

// ─── Send text message ────────────────────────────────────

export async function sendText(to: string, text: string): Promise<string | null> {
  try {
    const res = await axios.post(
      API_URL,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text, preview_url: false },
      },
      { headers: HEADERS },
    );
    return res.data?.messages?.[0]?.id ?? null;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error('[WhatsApp] sendText error:', err.response?.data);
    }
    return null;
  }
}

// ─── Send agent notification ──────────────────────────────

export async function notifyAgent(message: string): Promise<void> {
  if (!env.AGENT_WHATSAPP_NUMBER) return; // notification disabled
  await sendText(env.AGENT_WHATSAPP_NUMBER, message);
}

// ─── Format visitor notification ─────────────────────────

export function formatVisitorAlert(data: {
  page: string;
  country?: string;
  apolloData?: { name?: string; title?: string; company?: string; email?: string };
}): string {
  const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  let msg = `👋 *מבקר חדש באתר*\nדף: ${data.page}${data.country ? ` | מדינה: ${data.country}` : ''} | ${time}`;

  if (data.apolloData?.name) {
    msg += `\n\n👤 *${data.apolloData.name}*`;
    if (data.apolloData.title) msg += `\n${data.apolloData.title}`;
    if (data.apolloData.company) msg += ` @ ${data.apolloData.company}`;
    if (data.apolloData.email) msg += `\n${data.apolloData.email}`;
  }

  return msg;
}

export function formatChatOpenedAlert(data: {
  sessionId: string;
  page?: string;
  apolloData?: { name?: string; title?: string; company?: string; email?: string };
}): string {
  let msg = `💬 *צ'אט חדש נפתח*\nסשן: ${data.sessionId.slice(-8)}`;
  if (data.page) msg += `\nדף: ${data.page}`;

  if (data.apolloData?.name) {
    msg += `\n\n👤 *${data.apolloData.name}*`;
    if (data.apolloData.title) msg += `\n${data.apolloData.title}`;
    if (data.apolloData.company) msg += ` @ ${data.apolloData.company}`;
    if (data.apolloData.email) msg += `\n✉️ ${data.apolloData.email}`;
  }

  return msg;
}

export function formatLeadAlert(data: {
  fullName?: string;
  company?: string;
  phone?: string;
  email?: string;
  message?: string;
}): string {
  let msg = `📩 *ליד חדש*`;
  if (data.fullName) msg += `\nשם: ${data.fullName}`;
  if (data.company) msg += ` | חברה: ${data.company}`;
  if (data.phone) msg += `\nטלפון: ${data.phone}`;
  if (data.email) msg += ` | מייל: ${data.email}`;
  if (data.message) msg += `\n💬 "${data.message.slice(0, 100)}"`;

  return msg;
}
