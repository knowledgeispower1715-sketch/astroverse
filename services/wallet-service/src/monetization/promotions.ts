/**
 * AstroVerse Authoritative Promotional Offers & Entitlements Engine
 * Single source of truth for promotional trial offers, rates, copy, and eligibility rules.
 */

import { AI_CONSULTATION_SERVICE } from './catalog';

export interface PromotionalOfferDefinition {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  eligibleService: string;
  freeAllowanceSeconds: number;
  postFreeRateRupeesPerMinute: number;
  postFreeRatePaisePerMinute: number;
  billingIncrement: 'PER_MINUTE' | 'PER_SECOND';
  roundingPolicy: 'CEIL_MINUTE';
  currency: 'INR';
  policy: 'ONE_FREE_MINUTE_PER_ACCOUNT';
  campaignStartDate: string;
  campaignEndDate: string | null;
  bannerCopy: {
    badge: string;
    headline: string;
    supportingText: string;
    ctaText: string;
    viewRatesText: string;
    mobileText: string;
    privacyNotice: string;
  };
  bannerCopyHi: {
    badge: string;
    headline: string;
    supportingText: string;
    ctaText: string;
    viewRatesText: string;
    mobileText: string;
    privacyNotice: string;
  };
  version: string;
}

export const ACTIVE_PROMOTIONAL_OFFER: PromotionalOfferDefinition = {
  id: 'promo_ai_first_minute_free_v1',
  name: 'First 60 Seconds Free AI Astrologer Consultation',
  status: 'ACTIVE',
  eligibleService: AI_CONSULTATION_SERVICE.serviceId,
  freeAllowanceSeconds: 60,
  postFreeRateRupeesPerMinute: AI_CONSULTATION_SERVICE.ratePerMinuteRupees,
  postFreeRatePaisePerMinute: AI_CONSULTATION_SERVICE.ratePerMinutePaise,
  billingIncrement: 'PER_MINUTE',
  roundingPolicy: AI_CONSULTATION_SERVICE.roundingPolicy,
  currency: 'INR',
  policy: 'ONE_FREE_MINUTE_PER_ACCOUNT',
  campaignStartDate: '2026-10-01T00:00:00.000Z',
  campaignEndDate: null,
  bannerCopy: {
    badge: 'FREE TRIAL OFFER',
    headline: 'Your First 60 Seconds Free',
    supportingText: 'Try an AI Vedic astrology consultation. Recharge to continue at ₹15/min.',
    ctaText: 'Start Free Minute',
    viewRatesText: 'View Rates',
    mobileText: '1 MINUTE FREE · RECHARGE TO CONTINUE',
    privacyNotice: 'Chart-grounded calculations using your selected birth details'
  },
  bannerCopyHi: {
    badge: 'निःशुल्क परीक्षण ऑफर',
    headline: 'प्रथम 60 सेकंड निःशुल्क',
    supportingText: 'वैदिक AI ज्योतिषी से परामर्श करें। जारी रखने हेतु ₹15/मिनट पर रीचार्ज करें।',
    ctaText: 'निःशुल्क मिनट आरंभ करें',
    viewRatesText: 'दरें देखें',
    mobileText: '1 मिनट फ्री · जारी रखने हेतु रीचार्ज',
    privacyNotice: 'चयनित जन्म विवरण पर आधारित प्रामाणिक गणना'
  },
  version: '1.0.0'
};

/**
 * Validates whether a user or guest is eligible for the promotional free minute.
 */
export function isEligibleForFreeMinute(user?: {
  freeMinuteGranted?: boolean;
  freeMinuteConsumed?: boolean;
} | null): boolean {
  if (!user) {
    return true; // Guest eligibility handled via server-tracked guest trial ID
  }
  return !user.freeMinuteConsumed;
}
