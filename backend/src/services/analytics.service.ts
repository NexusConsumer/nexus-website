import { prisma } from '../config/database';

// ─── Page view ────────────────────────────────────────────

export async function trackPageView(data: {
  visitorId: string;
  userId?: string;
  page: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  language?: string;
}) {
  await prisma.$transaction([
    prisma.pageView.create({ data }),
    prisma.visitorProfile.upsert({
      where: { visitorId: data.visitorId },
      create: {
        visitorId: data.visitorId,
        pageViewCount: 1,
      },
      update: {
        pageViewCount: { increment: 1 },
        lastSeen: new Date(),
      },
    }),
  ]);
}

// ─── Event tracking ───────────────────────────────────────

export async function trackEvent(data: {
  visitorId: string;
  userId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.visitorEvent.create({
    data: {
      visitorId: data.visitorId,
      userId: data.userId,
      eventType: data.eventType,
      metadata: (data.metadata ?? null) as any,
    },
  });
}

// ─── Visitor profile ──────────────────────────────────────

export async function getVisitorProfile(visitorId: string) {
  return prisma.visitorProfile.findUnique({ where: { visitorId } });
}

export async function isNewVisitorToday(visitorId: string): Promise<boolean> {
  const profile = await prisma.visitorProfile.findUnique({ where: { visitorId } });
  if (!profile) return true; // Brand new

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return profile.lastSeen < today;
}

// ─── Summary (admin) ──────────────────────────────────────

export async function getAnalyticsSummary(periodDays = 7) {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [totalPageViews, uniqueVisitors, events] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.groupBy({ by: ['visitorId'], where: { createdAt: { gte: since } } }).then(
      (r) => r.length,
    ),
    prisma.visitorEvent.groupBy({
      by: ['eventType'],
      _count: { eventType: true },
      where: { createdAt: { gte: since } },
    }),
  ]);

  return { totalPageViews, uniqueVisitors, events, periodDays };
}
