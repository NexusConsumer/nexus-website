import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAgent } from '../middleware/authenticate';
import { apiLimiter } from '../middleware/rateLimiter';
import { prisma } from '../config/database';
import * as NotificationService from '../services/notification.service';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate, requireAgent);

// ─── GET /api/dashboard/metrics ───────────────────────────

router.get('/metrics', apiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) ?? 'week';
    const days = period === 'day' ? 1 : period === 'month' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

    const [
      currentVisitors, prevVisitors,
      currentChats, prevChats,
      currentLeads, prevLeads,
    ] = await Promise.all([
      prisma.pageView.groupBy({ by: ['visitorId'], where: { createdAt: { gte: since } } }).then(r => r.length),
      prisma.pageView.groupBy({ by: ['visitorId'], where: { createdAt: { gte: prevSince, lt: since } } }).then(r => r.length),
      prisma.chatSession.count({ where: { createdAt: { gte: since } } }),
      prisma.chatSession.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
      prisma.lead.count({ where: { createdAt: { gte: since } } }),
      prisma.lead.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    ]);

    const pct = (curr: number, prev: number) =>
      prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

    const conversionRate = currentVisitors > 0
      ? Math.round((currentLeads / currentVisitors) * 1000) / 10
      : 0;

    res.json({
      period,
      visitors:   { value: currentVisitors,  change: pct(currentVisitors, prevVisitors) },
      chats:      { value: currentChats,      change: pct(currentChats, prevChats) },
      leads:      { value: currentLeads,      change: pct(currentLeads, prevLeads) },
      conversion: { value: conversionRate,    unit: '%' },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard/chart ──────────────────────────────

router.get('/chart', apiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 7;
    const points: Array<{ date: string; visitors: number; chats: number; leads: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [visitors, chats, leads] = await Promise.all([
        prisma.pageView.groupBy({
          by: ['visitorId'],
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
        }).then(r => r.length),
        prisma.chatSession.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.lead.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      ]);

      points.push({
        date: dayStart.toISOString().split('T')[0],
        visitors,
        chats,
        leads,
      });
    }

    res.json(points);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard/visitors ──────────────────────────

router.get('/visitors', apiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const profiles = await prisma.visitorProfile.findMany({
      orderBy: { lastSeen: 'desc' },
      take: limit,
    });

    // Enrich with last page visited
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const lastView = await prisma.pageView.findFirst({
          where: { visitorId: p.visitorId },
          orderBy: { createdAt: 'desc' },
          select: { page: true, createdAt: true },
        });
        return { ...p, lastPage: lastView?.page, lastPageAt: lastView?.createdAt };
      }),
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/dashboard/notifications ─────────────────────

router.get(
  '/notifications',
  apiLimiter,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await NotificationService.getUnreadNotifications(30);
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/dashboard/notifications/read ───────────────

router.post(
  '/notifications/read',
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body as { ids: string[] };
      await NotificationService.markNotificationsRead(ids);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/dashboard/ai-stats ──────────────────────────

router.get('/ai-stats', apiLimiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalRatings, avgRatingResult, lowRatedCount, knowledgeCount] = await Promise.all([
      prisma.aiRating.count(),
      prisma.aiRating.aggregate({ _avg: { rating: true } }),
      prisma.aiRating.count({ where: { rating: { lte: 2 } } }),
      prisma.knowledgeChunk.count({ where: { isActive: true } }),
    ]);

    res.json({
      totalRatings,
      avgRating: Math.round((avgRatingResult._avg.rating ?? 0) * 10) / 10,
      lowRatedCount,
      knowledgeChunks: knowledgeCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
