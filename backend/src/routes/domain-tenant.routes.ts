/**
 * Exposes MongoDB-backed tenant domain APIs for the Nexus dashboard.
 * These routes are separate from legacy Prisma organization routes.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { apiLimiter } from '../middleware/rateLimiter';
import { bulkInviteTenantMembersSchema, inviteTenantMemberSchema } from '../schemas/domain-member.schemas';
import { listMembersQuerySchema } from '../schemas/domain-member-read.schemas';
import { benefitsCatalogActivationSchema } from '../schemas/domain-service-activation.schemas';
import { bulkInviteTenantMembersByEmail, inviteTenantMemberByEmail } from '../services/domain-member.service';
import {
  listTenantMembersPaginated,
  listPendingInvitationsForTenant,
  listTenantRolesForManager,
} from '../services/domain-member-read.service';
import {
  activateBenefitsCatalogForUser,
  deactivateBenefitsCatalogForUser,
} from '../services/domain-service-activation.service';
import { triggerGoLive } from '../services/onboarding.service';
import { resolveTenantContextWithPermission } from '../utils/resolve-tenant-context';

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

/**
 * POST /api/v1/tenant/services/benefits-catalog/deactivate
 *
 * Suspends the Benefits Catalog service for the authenticated user's tenant.
 * Sets TenantServiceActivation.status = 'suspended' and marks all active
 * tenant-created NexusOffer records as inactive.
 *
 * Members will immediately see the 'Service not yet active' gate in MemberCatalog
 * because resolveCatalogMode() returns 'inactive' when no active activation exists.
 *
 * Requires the workspace.activate_service permission (held by tenant owner/admin).
 * Tenant context is derived from server-side MongoDB membership - never from the request.
 *
 * Returns: { tenantId, serviceKey, status: 'suspended', offersDeactivated: number }
 * Errors:  401 when not authenticated.
 *          403 when the user lacks workspace.activate_service permission.
 */
router.post(
  '/services/benefits-catalog/deactivate',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await deactivateBenefitsCatalogForUser(req.user!.sub);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/members/pending-invitations',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await listPendingInvitationsForTenant(req.user!.sub);
      res.json(result);
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
      const query = listMembersQuerySchema.parse(req.query);
      const result = await listTenantMembersPaginated(req.user!.sub, query);
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

/**
 * POST /api/v1/tenant/go-live
 *
 * Transitions the authenticated user's tenant catalog from sandbox mode to live.
 * Sets Tenant.status = 'active' and TenantOnboardingState.state = 'active'.
 *
 * Requires the workspace.trigger_go_live permission (held by tenant admin role).
 * Tenant context is always derived from the server-side MongoDB membership record
 * and never accepted from the request body or URL params.
 *
 * Returns: { success: true, catalogMode: 'live' } on success.
 * Errors:  400 when business setup is not in a ready state before going live.
 *          401 when the request is not authenticated.
 *          403 when the user lacks the workspace.trigger_go_live permission.
 */
router.post(
  '/go-live',
  authenticate,
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Resolve tenantId from server-side MongoDB membership + enforce permission.
      // resolveTenantContextWithPermission is required here because the tenantId is
      // not in the URL, so requireDomainPermission middleware would find no tenant scope.
      const { tenantId } = await resolveTenantContextWithPermission(req, 'workspace.trigger_go_live');
      await triggerGoLive(tenantId);
      res.json({ success: true, catalogMode: 'live' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
