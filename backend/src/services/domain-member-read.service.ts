/**
 * Reads tenant members, roles, permissions, and safe invite previews.
 * Dashboard pages use this service instead of legacy Prisma organizations.
 */
import { prisma } from '../config/database';
import { getMongoDb } from '../config/mongo';
import { normalizeEmail } from '../config/platform-admins';
import { createError } from '../middleware/errorHandler';
import {
  getIdentityDomainCollections,
  getTenantDomainCollections,
  type TenantUserRoleName,
} from '../models/domain';
import { hashToken } from '../utils/crypto';
import { syncDomainIdentityForLoginUser } from './domain-identity.service';
import { requireMemberManagementAccess } from './domain-member.service';
import { DOMAIN_PERMISSIONS, type DomainPermission } from './domain-permissions.service';

export interface TenantMemberListItem {
  tenantMemberId: string;
  nexusIdentityId: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: TenantUserRoleName[];
  groupIds: string[];
  joinedAt: string;
}

export interface TenantRoleListItem {
  role: TenantUserRoleName;
  permissions: DomainPermission[];
}

export interface TenantMemberInvitationPreview {
  tenantName: string;
  invitedEmail: string;
  role: TenantUserRoleName;
  status: string;
  expiresAt: string;
}

/**
 * Lists tenant members visible to the tenant admin/member manager.
 * Input: authenticated Prisma user id.
 * Output: tenant member rows with identity email, roles, and group ids.
 */
export async function listTenantMembersForManager(userId: string): Promise<{
  tenantId: string;
  members: TenantMemberListItem[];
}> {
  const access = await requireMemberManagementAccess(userId);
  const db = await getMongoDb();
  const tenantCollections = getTenantDomainCollections(db);
  const identityCollections = getIdentityDomainCollections(db);
  const members = await tenantCollections.tenantMembers
    .find({ tenantId: access.tenantId }, { sort: { createdAt: -1 } })
    .toArray();
  const identityIds = members.map((member) => member.nexusIdentityId);
  const memberIds = members.map((member) => member.tenantMemberId);
  const [identities, roles, assignments] = await Promise.all([
    identityCollections.nexusIdentities
      .find({ nexusIdentityId: { $in: identityIds } }, { projection: { nexusIdentityId: 1, normalizedEmail: 1, displayName: 1 } })
      .toArray(),
    identityCollections.tenantUserRoles
      .find({ tenantId: access.tenantId, nexusIdentityId: { $in: identityIds } }, { projection: { nexusIdentityId: 1, role: 1 } })
      .toArray(),
    tenantCollections.memberGroupAssignments
      .find({ tenantMemberId: { $in: memberIds } }, { projection: { tenantMemberId: 1, memberGroupId: 1 } })
      .toArray(),
  ]);
  const identityById = new Map(identities.map((identity) => [identity.nexusIdentityId, identity]));
  const rolesByIdentity = new Map<string, TenantUserRoleName[]>();
  const groupsByMember = new Map<string, string[]>();

  for (const role of roles) {
    rolesByIdentity.set(role.nexusIdentityId, [...(rolesByIdentity.get(role.nexusIdentityId) ?? []), role.role]);
  }
  for (const assignment of assignments) {
    groupsByMember.set(assignment.tenantMemberId, [
      ...(groupsByMember.get(assignment.tenantMemberId) ?? []),
      assignment.memberGroupId,
    ]);
  }

  return {
    tenantId: access.tenantId,
    members: members.map((member) => {
      const identity = identityById.get(member.nexusIdentityId);
      return {
        tenantMemberId: member.tenantMemberId,
        nexusIdentityId: member.nexusIdentityId,
        email: identity?.normalizedEmail ?? '',
        displayName: identity?.displayName ?? null,
        status: member.status,
        roles: rolesByIdentity.get(member.nexusIdentityId) ?? [],
        groupIds: groupsByMember.get(member.tenantMemberId) ?? [],
        joinedAt: member.createdAt.toISOString(),
      };
    }),
  };
}

/**
 * Lists roles and permissions from Mongo RolePermissionMap records.
 * Input: authenticated Prisma user id with member-management access.
 * Output: tenant-scoped roles and their permission strings.
 */
export async function listTenantRolesForManager(userId: string): Promise<{
  roles: TenantRoleListItem[];
}> {
  await requireMemberManagementAccess(userId);
  const db = await getMongoDb();
  const identityCollections = getIdentityDomainCollections(db);
  const roleRecords = await identityCollections.rolePermissionMaps
    .find({ permission: { $in: DOMAIN_PERMISSIONS } }, { sort: { role: 1, permission: 1 } })
    .toArray();
  const rolesByName = new Map<TenantUserRoleName, DomainPermission[]>();

  for (const record of roleRecords) {
    if (record.role.startsWith('platform_')) continue;
    rolesByName.set(record.role, [...(rolesByName.get(record.role) ?? []), record.permission as DomainPermission]);
  }

  return {
    roles: Array.from(rolesByName.entries()).map(([role, permissions]) => ({ role, permissions })),
  };
}

/**
 * Reads public-safe invitation details by raw token.
 * Input: raw invite token from the email URL.
 * Output: tenant name, email, role, status, and expiry without token hash.
 */
export async function getTenantMemberInvitationPreview(token: string): Promise<TenantMemberInvitationPreview> {
  const db = await getMongoDb();
  const tenantCollections = getTenantDomainCollections(db);
  const invite = await tenantCollections.tenantMemberInvitations.findOne({ tokenHash: hashToken(token) });
  if (!invite) throw createError('Invalid invitation link', 404);

  const now = new Date();
  if (invite.status === 'pending' && invite.expiresAt <= now) {
    await tenantCollections.tenantMemberInvitations.updateOne(
      { tenantMemberInvitationId: invite.tenantMemberInvitationId },
      { $set: { status: 'expired', updatedAt: now } },
    );
    invite.status = 'expired';
  }

  const tenant = await tenantCollections.domainTenants.findOne(
    { tenantId: invite.tenantId },
    { projection: { organizationName: 1 } },
  );

  return {
    tenantName: tenant?.organizationName ?? 'Nexus',
    invitedEmail: invite.normalizedEmail,
    role: invite.role as TenantUserRoleName,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/**
 * Accepts an invitation for the currently authenticated matching email.
 * Input: Prisma user id and raw invite token.
 * Output: accepted tenant id, role, and whether it was already accepted.
 */
export async function acceptTenantMemberInvitation(
  userId: string,
  token: string,
): Promise<{ tenantId: string; role: TenantUserRoleName; alreadyAccepted: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, provider: true },
  });
  if (!user) throw createError('User not found', 404);

  const normalizedEmail = normalizeEmail(user.email);
  const db = await getMongoDb();
  const tenantCollections = getTenantDomainCollections(db);
  const invite = await tenantCollections.tenantMemberInvitations.findOne({ tokenHash: hashToken(token) });
  if (!invite) throw createError('Invalid invitation link', 404);
  if (invite.normalizedEmail !== normalizedEmail) throw createError('Invitation email does not match this account', 403);
  if (invite.status === 'revoked') throw createError('Invitation was revoked', 410);
  if (invite.expiresAt <= new Date()) throw createError('Invitation link expired', 410);

  const identity = await syncDomainIdentityForLoginUser(user);
  const tenantMember = await tenantCollections.tenantMembers.findOne({
    tenantId: invite.tenantId,
    nexusIdentityId: identity.nexusIdentityId,
    status: 'active',
  });
  if (!tenantMember) {
    throw createError('Tenant membership was not found for this invite', 403);
  }

  if (invite.status === 'accepted') {
    return { tenantId: invite.tenantId, role: invite.role as TenantUserRoleName, alreadyAccepted: true };
  }

  await tenantCollections.tenantMemberInvitations.updateOne(
    { tenantMemberInvitationId: invite.tenantMemberInvitationId, status: 'pending' },
    {
      $set: {
        status: 'accepted',
        acceptedByIdentityId: identity.nexusIdentityId,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return { tenantId: invite.tenantId, role: invite.role as TenantUserRoleName, alreadyAccepted: false };
}
