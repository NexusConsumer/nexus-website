/**
 * Implements MongoDB-backed tenant member management.
 * Member invites follow FLOW-005 and do not use legacy Prisma organizations.
 */
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { getMongoDb } from '../config/mongo';
import { createError } from '../middleware/errorHandler';
import {
  getIdentityDomainCollections,
  getTenantDomainCollections,
  type TenantUserRoleName,
} from '../models/domain';
import type { InviteTenantMemberInput } from '../schemas/domain-member.schemas';
import { getDomainAuthorizationContext, hasDomainPermission } from './domain-authorization.service';
import { syncDomainIdentityForLoginUser, syncDomainIdentityForMemberInvite } from './domain-identity.service';
import { syncDomainTenantMembership } from './domain-tenant-sync.service';
import { getUserContext } from './onboarding.service';
import { getOnboardingCollections } from '../models/onboarding.models';
import { ObjectId } from 'mongodb';

export interface InviteTenantMemberResponse {
  tenantId: string;
  tenantMemberId: string;
  nexusIdentityId: string;
  email: string;
  role: TenantUserRoleName;
  status: 'active';
  groupIds: string[];
}

/**
 * Loads trusted login data for a member management request.
 * Input: Prisma user id from the authenticated request.
 * Output: minimal login user fields or a 404 error.
 */
async function getMemberManagerLoginUser(userId: string): Promise<{
  id: string;
  email: string;
  fullName: string;
  provider: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, provider: true },
  });
  if (!user) throw createError('User not found', 404);
  return user;
}

/**
 * Requires tenant member management permission from Mongo domain roles.
 * Input: Prisma user id from the authenticated request.
 * Output: tenant id and manager identity id when permission is granted.
 */
async function requireMemberManagementAccess(userId: string): Promise<{
  tenantId: string;
  managerIdentityId: string;
}> {
  const [user, context] = await Promise.all([getMemberManagerLoginUser(userId), getUserContext(userId)]);
  if (!context.isTenant || !context.tenantId) throw createError('Tenant access required', 403);

  const domainIdentity = await syncDomainIdentityForLoginUser(user);
  const db = await getMongoDb();
  const tenantCollections = getTenantDomainCollections(db);
  const tenantMember = await tenantCollections.tenantMembers.findOne({
    tenantId: context.tenantId,
    nexusIdentityId: domainIdentity.nexusIdentityId,
    status: 'active',
  });

  if (!tenantMember) {
    const legacyCollections = getOnboardingCollections(db);
    const legacyTenantId = new ObjectId(context.tenantId);
    const [legacyTenant, legacyMembership] = await Promise.all([
      legacyCollections.tenants.findOne({ _id: legacyTenantId }),
      legacyCollections.tenantMembers.findOne({ tenantId: legacyTenantId, userId, status: 'active' }),
    ]);
    if (legacyTenant && legacyMembership?._id) {
      await syncDomainTenantMembership({
        tenantId: legacyTenantId,
        tenant: legacyTenant,
        tenantMembershipId: legacyMembership._id,
        tenantMembership: legacyMembership,
        nexusIdentityId: domainIdentity.nexusIdentityId,
      });
    }
  }

  const authorization = await getDomainAuthorizationContext(domainIdentity.nexusIdentityId, context.tenantId);
  if (!hasDomainPermission(authorization, 'member.manage')) throw createError('Forbidden', 403);

  return {
    tenantId: context.tenantId,
    managerIdentityId: domainIdentity.nexusIdentityId,
  };
}

/**
 * Validates that requested member groups belong to the tenant.
 * Input: tenant id and requested group ids.
 * Output: deduplicated group ids or a 400 error when any group is invalid.
 */
async function validateTenantGroupIds(tenantId: string, groupIds: string[]): Promise<string[]> {
  const uniqueGroupIds = Array.from(new Set(groupIds));
  if (uniqueGroupIds.length === 0) return [];

  const db = await getMongoDb();
  const collections = getTenantDomainCollections(db);
  const foundGroups = await collections.memberGroups
    .find({ tenantId, memberGroupId: { $in: uniqueGroupIds } }, { projection: { memberGroupId: 1 } })
    .toArray();
  const foundIds = new Set(foundGroups.map((group) => group.memberGroupId));
  const missing = uniqueGroupIds.filter((groupId) => !foundIds.has(groupId));
  if (missing.length > 0) throw createError('One or more member groups were not found', 400);

  return uniqueGroupIds;
}

/**
 * Invites one tenant member by email and activates tenant membership.
 * Input: manager user id and validated invitation data.
 * Output: created member identity, membership, role, and group assignment ids.
 */
export async function inviteTenantMemberByEmail(
  managerUserId: string,
  input: InviteTenantMemberInput,
): Promise<InviteTenantMemberResponse> {
  const access = await requireMemberManagementAccess(managerUserId);
  const invitedIdentity = await syncDomainIdentityForMemberInvite({
    email: input.email,
    displayName: input.displayName,
  });
  const groupIds = await validateTenantGroupIds(access.tenantId, input.groupIds);
  const db = await getMongoDb();
  const tenantCollections = getTenantDomainCollections(db);
  const identityCollections = getIdentityDomainCollections(db);
  const now = new Date();

  const existingMembership = await tenantCollections.tenantMembers.findOne({
    tenantId: access.tenantId,
    nexusIdentityId: invitedIdentity.nexusIdentityId,
  });
  if (existingMembership) throw createError('membership_exists', 409);

  const tenantMemberId = `tenant_member_${randomUUID()}`;
  await tenantCollections.tenantMembers.insertOne({
    tenantMemberId,
    tenantId: access.tenantId,
    nexusIdentityId: invitedIdentity.nexusIdentityId,
    status: 'active',
    employeeId: input.employeeId,
    requireAdminApproval: false,
    customFields: input.customFields,
    createdAt: now,
    updatedAt: now,
  });

  await identityCollections.tenantUserRoles.updateOne(
    { tenantId: access.tenantId, nexusIdentityId: invitedIdentity.nexusIdentityId, role: input.role },
    {
      $setOnInsert: {
        tenantUserRoleId: `tenant_user_role_${randomUUID()}`,
        nexusIdentityId: invitedIdentity.nexusIdentityId,
        tenantId: access.tenantId,
        role: input.role,
        grantedByIdentityId: access.managerIdentityId,
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );

  if (groupIds.length > 0) {
    await tenantCollections.memberGroupAssignments.bulkWrite(
      groupIds.map((memberGroupId) => ({
        updateOne: {
          filter: { memberGroupId, tenantMemberId },
          update: {
            $setOnInsert: {
              memberGroupAssignmentId: `member_group_assignment_${randomUUID()}`,
              tenantId: access.tenantId,
              memberGroupId,
              tenantMemberId,
              createdAt: now,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  return {
    tenantId: access.tenantId,
    tenantMemberId,
    nexusIdentityId: invitedIdentity.nexusIdentityId,
    email: invitedIdentity.normalizedEmail,
    role: input.role,
    status: 'active',
    groupIds,
  };
}
