/**
 * Exposes MongoDB-backed tenant domain APIs for the Nexus dashboard.
 * These routes are separate from legacy Prisma organization routes.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { apiLimiter } from '../middleware/rateLimiter';
import { inviteTenantMemberSchema } from '../schemas/domain-member.schemas';
import { benefitsCatalogActivationSchema } from '../schemas/domain-service-activation.schemas';
import { inviteTenantMemberByEmail } from '../services/domain-member.service';
import { activateBenefitsCatalogForUser } from '../services/domain-service-activation.service';

const router = Router();

router.post(
  '/services/benefits-catalog/activate',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = benefitsCatalogActivationSchema.parse(req.body);
      const result = await activateBenefitsCatalogForUser(req.user!.sub, input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/members/invitations',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = inviteTenantMemberSchema.parse(req.body);
      const result = await inviteTenantMemberByEmail(req.user!.sub, input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
