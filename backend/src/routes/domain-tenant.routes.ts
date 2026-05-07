/**
 * Exposes MongoDB-backed tenant domain APIs for the Nexus dashboard.
 * These routes are separate from legacy Prisma organization routes.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { apiLimiter } from '../middleware/rateLimiter';
import { bulkInviteTenantMembersSchema, inviteTenantMemberSchema } from '../schemas/domain-member.schemas';
import { benefitsCatalogActivationSchema } from '../schemas/domain-service-activation.schemas';
import { bulkInviteTenantMembersByEmail, inviteTenantMemberByEmail } from '../services/domain-member.service';
import { listTenantMembersForManager, listTenantRolesForManager } from '../services/domain-member-read.service';
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

router.get(
  '/members',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await listTenantMembersForManager(req.user!.sub);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/roles',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await listTenantRolesForManager(req.user!.sub);
      res.json(result);
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

router.post(
  '/members/invitations/bulk',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = bulkInviteTenantMembersSchema.parse(req.body);
      const invitations = input.invitations.map((invitation) => ({
        ...invitation,
        language: invitation.language ?? input.language,
      }));
      const result = await bulkInviteTenantMembersByEmail(req.user!.sub, invitations);
      res.status(207).json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
