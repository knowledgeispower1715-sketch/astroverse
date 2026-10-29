/**
 * AstroVerse Entitlement & Subscription Management Engine
 * Authoritatively verifies user tiers, active profile limits, daily AI query quotas,
 * feature access permissions, and report ownership on every request.
 */

import { SUBSCRIPTION_PLANS, SubscriptionTier, calculateReportPrice } from './catalog';

export interface UserEntitlementSnapshot {
  userId: string;
  tier: SubscriptionTier;
  tierDisplayName: string;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'NONE';
  expiresAt: string | null;
  billingPeriod: 'MONTHLY' | 'ANNUAL' | null;
  maxProfilesAllowed: number;
  currentProfilesCount: number;
  canCreateMoreProfiles: boolean;
  dailyAiQuotaTotal: number;
  dailyAiQuotaUsed: number;
  dailyAiQuotaRemaining: number;
  allowedDivisionalCharts: string[];
  reportDiscountPercent: number;
  hasPersonalizedReportReader: boolean;
  features: string[];
}

export class EntitlementManager {
  // In-memory daily AI usage cache: userId -> { dateStr: string, count: number }
  private static dailyAiUsageMap = new Map<string, { dateStr: string; count: number }>();
  // Daily numerology usage cache: userId -> { dateStr: string; count: number }
  private static dailyNumerologyUsageMap = new Map<string, { dateStr: string; count: number }>();

  /**
   * Returns current active subscription tier for a user, handling automatic expiration.
   */
  public static resolveEffectiveTier(user: any): {
    tier: SubscriptionTier;
    status: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'NONE';
    expiresAt: string | null;
    billingPeriod: 'MONTHLY' | 'ANNUAL' | null;
  } {
    if (!user) {
      return {
        tier: SubscriptionTier.FREE,
        status: 'NONE',
        expiresAt: null,
        billingPeriod: null
      };
    }

    // Support simulated subscription tier in non-production demo mode strictly for authorized administrators
    const isDemo = process.env.DEMO_MODE === 'true' || 
                   process.env.NODE_ENV === 'test' || 
                   process.env.NODE_ENV === 'development' || 
                   process.env.VERCEL_ENV === 'preview';
    if (isDemo && user.simulatedSubscriptionTier) {
      const userRole = (user.role || '').toUpperCase();
      const isAdminUser = [
        'OWNER', 'SUPER_ADMIN', 'ADMIN', 'SECURITY_ADMIN', 'TECH_OPS_ADMIN',
        'FINANCE_ADMIN', 'CUSTOMER_OPS_ADMIN', 'ASTROLOGY_OPS_ADMIN',
        'DATA_OFFICER', 'SUPPORT_ADMIN', 'CONTENT_EDITOR', 'READONLY_ANALYST'
      ].includes(userRole);

      if (isAdminUser) {
        const simTier = user.simulatedSubscriptionTier as SubscriptionTier;
        if (SUBSCRIPTION_PLANS[simTier]) {
          return {
            tier: simTier,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
            billingPeriod: 'MONTHLY'
          };
        }
      }
    }

    const tier = (user.subscriptionTier as SubscriptionTier) || SubscriptionTier.FREE;
    if (tier === SubscriptionTier.FREE) {
      return {
        tier: SubscriptionTier.FREE,
        status: 'ACTIVE',
        expiresAt: null,
        billingPeriod: null
      };
    }

    const expiresAt = user.subscriptionExpiresAt;
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (expDate.getTime() < Date.now()) {
        // Subscription has lapsed
        return {
          tier: SubscriptionTier.FREE,
          status: 'EXPIRED',
          expiresAt,
          billingPeriod: user.subscriptionBillingPeriod || null
        };
      }
    }

    return {
      tier,
      status: (user.subscriptionStatus as any) || 'ACTIVE',
      expiresAt: expiresAt || null,
      billingPeriod: user.subscriptionBillingPeriod || null
    };
  }

  /**
   * Generates a complete entitlement snapshot for the authenticated user.
   */
  public static getEntitlementSnapshot(user: any, profilesCount: number = 0): UserEntitlementSnapshot {
    const { tier, status, expiresAt, billingPeriod } = this.resolveEffectiveTier(user);
    const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS[SubscriptionTier.FREE];

    const todayStr = new Date().toISOString().split('T')[0];
    const userId = user?.id || 'guest';
    const userUsage = this.dailyAiUsageMap.get(userId);
    let usedToday = 0;
    if (userUsage && userUsage.dateStr === todayStr) {
      usedToday = userUsage.count;
    }

    const totalDaily = plan.dailyAiLimit;
    const remainingDaily = Math.max(0, totalDaily - usedToday);
    const maxProfiles = plan.maxProfiles;
    const canCreateMore = profilesCount < maxProfiles;

    return {
      userId,
      tier,
      tierDisplayName: plan.displayName,
      subscriptionStatus: status,
      expiresAt,
      billingPeriod,
      maxProfilesAllowed: maxProfiles,
      currentProfilesCount: profilesCount,
      canCreateMoreProfiles: canCreateMore,
      dailyAiQuotaTotal: totalDaily,
      dailyAiQuotaUsed: usedToday,
      dailyAiQuotaRemaining: remainingDaily,
      allowedDivisionalCharts: plan.allowedDivisionalCharts,
      reportDiscountPercent: plan.reportDiscountPercent,
      hasPersonalizedReportReader: plan.hasPersonalizedReportReader,
      features: plan.features
    };
  }

  /**
   * Consumes one AI Astrologer query against the user's daily quota.
   * Throws Error('AI_QUOTA_EXCEEDED') if daily limit reached.
   */
  public static consumeAiQuery(userId: string, tier: SubscriptionTier = SubscriptionTier.FREE): {
    usedToday: number;
    totalAllowed: number;
    remaining: number;
  } {
    const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS[SubscriptionTier.FREE];
    const totalAllowed = plan.dailyAiLimit;
    const todayStr = new Date().toISOString().split('T')[0];

    let entry = this.dailyAiUsageMap.get(userId);
    if (!entry || entry.dateStr !== todayStr) {
      entry = { dateStr: todayStr, count: 0 };
    }

    if (entry.count >= totalAllowed) {
      const err: any = new Error(`Daily AI consultation limit of ${totalAllowed} questions reached for ${plan.displayName}.`);
      err.code = 'AI_QUOTA_EXCEEDED';
      err.tier = tier;
      err.dailyLimit = totalAllowed;
      err.upgradeRequired = tier === SubscriptionTier.FREE ? SubscriptionTier.PLUS : SubscriptionTier.PREMIUM;
      throw err;
    }

    entry.count += 1;
    this.dailyAiUsageMap.set(userId, entry);

    return {
      usedToday: entry.count,
      totalAllowed,
      remaining: totalAllowed - entry.count
    };
  }

  /**
   * Validates whether a user can create another birth profile under their tier limit.
   */
  public static assertProfileCreationAllowed(user: any, currentProfilesCount: number): void {
    const { tier } = this.resolveEffectiveTier(user);
    const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS[SubscriptionTier.FREE];
    if (currentProfilesCount >= plan.maxProfiles) {
      const err: any = new Error(`Your ${plan.displayName} plan allows a maximum of ${plan.maxProfiles} birth profile(s). Upgrade to add more profiles.`);
      err.code = 'PROFILE_LIMIT_REACHED';
      err.maxAllowed = plan.maxProfiles;
      err.currentCount = currentProfilesCount;
      throw err;
    }
  }

  /**
   * Validates whether a divisional chart (e.g. D9, D10, D60) is accessible under the user's tier.
   */
  public static isDivisionalChartAllowed(vargaCode: string, tier: SubscriptionTier): boolean {
    const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS[SubscriptionTier.FREE];
    if (plan.allowedDivisionalCharts.includes('*')) return true;
    return plan.allowedDivisionalCharts.includes(vargaCode.toUpperCase());
  }

  /**
   * Consumes one numerology check against plan entitlements and server-side quotas:
   * - FREE: 1 lifetime preview check per account
   * - PLUS: 3 checks per day (resets daily UTC)
   * - PREMIUM: up to 30 checks per day
   */
  public static consumeNumerologyCheck(userId: string, tier: SubscriptionTier = SubscriptionTier.FREE): {
    usedToday: number;
    totalAllowed: number;
    remaining: number;
  } {
    const todayStr = new Date().toISOString().split('T')[0];
    let limit = 1;
    if (tier === SubscriptionTier.PLUS) {
      limit = 3;
    } else if (tier === SubscriptionTier.PREMIUM) {
      limit = 30;
    }

    let entry = this.dailyNumerologyUsageMap.get(userId);
    if (!entry || (tier !== SubscriptionTier.FREE && entry.dateStr !== todayStr)) {
      entry = { dateStr: todayStr, count: 0 };
    }

    if (entry.count >= limit) {
      const err: any = new Error(
        tier === SubscriptionTier.FREE
          ? 'Free account preview check used. Upgrade to Plus (3 checks/day) or Premium for full Name Correction Studio.'
          : `Daily limit of ${limit} numerology checks reached for your ${tier} plan.`
      );
      err.code = 'NUMEROLOGY_QUOTA_EXCEEDED';
      err.tier = tier;
      err.limit = limit;
      err.upgradeRequired = tier === SubscriptionTier.FREE ? SubscriptionTier.PLUS : SubscriptionTier.PREMIUM;
      throw err;
    }

    entry.count += 1;
    this.dailyNumerologyUsageMap.set(userId, entry);

    return {
      usedToday: entry.count,
      totalAllowed: limit,
      remaining: limit - entry.count
    };
  }

  /**
   * Validates whether the user's tier grants access to the AI Name Correction Studio.
   */
  public static assertNameCorrectionAllowed(tier: SubscriptionTier): void {
    if (tier !== SubscriptionTier.PREMIUM) {
      const err: any = new Error('AI Vedic Name Correction Studio is exclusively available for AstroVerse Premium members. Upgrade to unlock custom spelling recommendations.');
      err.code = 'PREMIUM_REQUIRED';
      err.tier = tier;
      err.upgradeRequired = SubscriptionTier.PREMIUM;
      throw err;
    }
  }

  /**
   * Validates whether commercial/mobile analysis is allowed.
   */
  public static assertBusinessOrMobileAllowed(tier: SubscriptionTier): void {
    if (tier === SubscriptionTier.FREE) {
      const err: any = new Error('Business name and mobile number numerology analysis requires an AstroVerse Plus or Premium subscription.');
      err.code = 'UPGRADE_REQUIRED';
      err.tier = tier;
      err.upgradeRequired = SubscriptionTier.PLUS;
      throw err;
    }
  }
}
