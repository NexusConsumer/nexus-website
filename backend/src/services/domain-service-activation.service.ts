/**
 * Owns domain service activation helpers for tenant services.
 * Benefits Catalog activation must create a TenantCatalogPolicy immediately.
 */
import { getMongoDb } from '../config/mongo';
import { getTenantDomainCollections, type CatalogAdoptionMode, type DefaultPricingRule } from '../models/domain';

export type BenefitsCatalogStartingMode = 'plug_and_play' | 'curated' | 'build_from_scratch';

interface BenefitsCatalogPolicyDefaults {
  catalogAdoptionMode: CatalogAdoptionMode;
  defaultPricingRule: DefaultPricingRule;
}

const BENEFITS_CATALOG_MODE_DEFAULTS: Record<BenefitsCatalogStartingMode, BenefitsCatalogPolicyDefaults> = {
  plug_and_play: {
    catalogAdoptionMode: 'auto_silent',
    defaultPricingRule: 'nexus_price',
  },
  curated: {
    catalogAdoptionMode: 'auto_notify',
    defaultPricingRule: 'inherit_selection',
  },
  build_from_scratch: {
    catalogAdoptionMode: 'manual',
    defaultPricingRule: 'manual_required',
  },
};

/**
 * Ensures a Benefits Catalog policy exists for one tenant.
 * Input: tenant id and starting mode selected during service activation.
 * Output: TenantCatalogPolicy exists with source-of-truth default rules.
 */
export async function ensureBenefitsCatalogPolicy(
  tenantId: string,
  startingMode: BenefitsCatalogStartingMode,
): Promise<void> {
  const db = await getMongoDb();
  const collections = getTenantDomainCollections(db);
  const now = new Date();
  const defaults = BENEFITS_CATALOG_MODE_DEFAULTS[startingMode];

  await collections.tenantCatalogPolicies.updateOne(
    { tenantId },
    {
      $setOnInsert: {
        tenantCatalogPolicyId: `tenant_catalog_policy_${tenantId}`,
        tenantId,
        pendingReviewTimeoutDays: 30,
        notificationRoles: ['admin', 'operator'],
        createdAt: now,
      },
      $set: {
        catalogAdoptionMode: defaults.catalogAdoptionMode,
        defaultPricingRule: defaults.defaultPricingRule,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}
