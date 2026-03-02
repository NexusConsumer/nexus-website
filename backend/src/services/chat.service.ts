import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';

// ─── Create session ────────────────────────────────────────

export async function createSession(data: {
  visitorId: string;
  userId?: string;
  page?: string;
  language?: string;
  userAgent?: string;
}) {
  return prisma.chatSession.create({
    data: {
      visitorId: data.visitorId,
      userId: data.userId,
      metadata: {
        page: data.page,
        language: data.language,
        userAgent: data.userAgent,
      },
    },
    select: {
      id: true,
      visitorId: true,
      status: true,
      mode: true,
      createdAt: true,
    },
  });
}

// ─── Get session ───────────────────────────────────────────

export async function getSession(sessionId: string) {
  return prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
  });
}

// ─── Get messages ──────────────────────────────────────────

export async function getMessages(sessionId: string, limit = 50) {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

// ─── Save message ──────────────────────────────────────────

export async function saveMessage(data: {
  sessionId: string;
  text: string;
  sender: 'CUSTOMER' | 'AI' | 'AGENT' | 'SYSTEM';
  channel?: 'WEB' | 'WHATSAPP';
  waMessageId?: string;
}) {
  return prisma.chatMessage.create({
    data: {
      sessionId: data.sessionId,
      text: data.text,
      sender: data.sender,
      channel: data.channel ?? 'WEB',
      waMessageId: data.waMessageId,
    },
  });
}

// ─── Escalate to human ─────────────────────────────────────

export async function escalateSession(sessionId: string) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw createError('Session not found', 404);
  if (session.mode === 'HUMAN') return session; // Already escalated

  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { mode: 'HUMAN', status: 'PENDING_HUMAN' },
  });
}

// ─── Close session ─────────────────────────────────────────

export async function closeSession(sessionId: string) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: 'CLOSED' },
  });
}

// ─── All sessions (admin/agent) ────────────────────────────

export async function getAllSessions(filter?: {
  status?: string;
  mode?: string;
  limit?: number;
}) {
  return prisma.chatSession.findMany({
    where: {
      ...(filter?.status && { status: filter.status as 'OPEN' | 'PENDING_HUMAN' | 'RESOLVED' | 'CLOSED' }),
      ...(filter?.mode && { mode: filter.mode as 'AI' | 'HUMAN' }),
    },
    orderBy: { updatedAt: 'desc' },
    take: filter?.limit ?? 50,
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
}

// ─── Link WhatsApp thread ──────────────────────────────────

export async function linkWhatsappThread(sessionId: string, waThreadId: string) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { waThreadId },
  });
}

// ─── Find session by WhatsApp thread ──────────────────────

export async function findSessionByWaThread(waThreadId: string) {
  return prisma.chatSession.findFirst({
    where: { waThreadId, status: { in: ['OPEN', 'PENDING_HUMAN'] } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Update session metadata (Apollo enrichment) ──────────

export async function enrichSessionMetadata(sessionId: string, apolloData: object) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      metadata: {
        ...(session.metadata as object),
        apolloData,
      },
    },
  });
}
