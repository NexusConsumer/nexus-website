/**
 * Defines request schemas for MongoDB-backed tenant member APIs.
 * These schemas validate member management input from the dashboard.
 */
import { z } from 'zod';

export const inviteTenantMemberSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  displayName: z.string().trim().min(1).max(255).optional(),
  role: z.enum(['admin', 'finance', 'operator', 'analyst', 'developer', 'supply_manager', 'member']).default('member'),
  groupIds: z.array(z.string().min(1)).default([]),
  employeeId: z.string().trim().min(1).max(100).optional(),
  customFields: z.record(z.unknown()).default({}),
});

export type InviteTenantMemberInput = z.infer<typeof inviteTenantMemberSchema>;
