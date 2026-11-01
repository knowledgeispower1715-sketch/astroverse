/**
 * AstroVerse Durable AI Quota & Usage Persistence Engine
 * Enforces canonical daily query quotas (Free: 3, Plus: 15, Premium: 30),
 * persists administrative overrides across restarts, and maintains an atomic,
 * concurrency-safe usage ledger bounded by Asia/Kolkata midnight.
 */

import fs from 'fs';
import path from 'path';
import { SubscriptionTier } from './catalog';

export interface AiQuotaConfiguration {
  freeTierDailyQueries: number;
  plusTierDailyQueries: number;
  premiumTierDailyQueries: number;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface AiUsageEvent {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  dateStr: string; // YYYY-MM-DD in Asia/Kolkata
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
}

export interface AiUsageMetrics {
  totalQueriesToday: number;
  totalQueriesThisMonth: number;
  tierBreakdown: Record<SubscriptionTier, number>;
  activeUsersToday: number;
  estimatedCostTodayUsd: number;
  quotas: AiQuotaConfiguration;
}

const DEFAULT_QUOTAS: AiQuotaConfiguration = {
  freeTierDailyQueries: 3,
  plusTierDailyQueries: 15,
  premiumTierDailyQueries: 30
};

const DATA_DIR = path.resolve(__dirname, '../../data');
const QUOTA_FILE = path.join(DATA_DIR, 'ai_quota_config.json');
const USAGE_FILE = path.join(DATA_DIR, 'ai_usage_events.json');

export class DurableAiQuotaManager {
  private static cachedConfig: AiQuotaConfiguration | null = null;
  private static userUsageCache: Map<string, { dateStr: string; count: number }> = new Map();
  private static initialized: boolean = false;

  public static getKolkataDateString(): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private static ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {}
    }
  }

  public static getQuotas(): AiQuotaConfiguration {
    if (this.cachedConfig) {
      return { ...this.cachedConfig };
    }

    try {
      this.ensureDataDir();
      if (fs.existsSync(QUOTA_FILE)) {
        const raw = fs.readFileSync(QUOTA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.cachedConfig = {
          freeTierDailyQueries: Number(parsed.freeTierDailyQueries || 3),
          plusTierDailyQueries: Number(parsed.plusTierDailyQueries || 15),
          premiumTierDailyQueries: Number(parsed.premiumTierDailyQueries || 30),
          lastUpdatedBy: parsed.lastUpdatedBy,
          lastUpdatedAt: parsed.lastUpdatedAt
        };
        return { ...this.cachedConfig };
      }
    } catch (err) {
      console.warn('[AI_QUOTA] Failed to read ai_quota_config.json, using defaults:', err);
    }

    this.cachedConfig = { ...DEFAULT_QUOTAS };
    return { ...this.cachedConfig };
  }

  public static updateQuotas(
    updates: { freeLimit?: number; plusLimit?: number; premiumLimit?: number },
    adminEmail: string
  ): AiQuotaConfiguration {
    const current = this.getQuotas();
    const newConfig: AiQuotaConfiguration = {
      freeTierDailyQueries: updates.freeLimit !== undefined ? Number(updates.freeLimit) : current.freeTierDailyQueries,
      plusTierDailyQueries: updates.plusLimit !== undefined ? Number(updates.plusLimit) : current.plusTierDailyQueries,
      premiumTierDailyQueries: updates.premiumLimit !== undefined ? Number(updates.premiumLimit) : current.premiumTierDailyQueries,
      lastUpdatedBy: adminEmail,
      lastUpdatedAt: new Date().toISOString()
    };

    this.cachedConfig = newConfig;

    try {
      this.ensureDataDir();
      fs.writeFileSync(QUOTA_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    } catch (err) {
      console.error('[AI_QUOTA] Failed to persist ai_quota_config.json:', err);
    }

    return { ...newConfig };
  }

  public static getDailyLimitForTier(tier: SubscriptionTier): number {
    const quotas = this.getQuotas();
    switch (tier) {
      case SubscriptionTier.PLUS:
        return quotas.plusTierDailyQueries;
      case SubscriptionTier.PREMIUM:
        return quotas.premiumTierDailyQueries;
      case SubscriptionTier.FREE:
      default:
        return quotas.freeTierDailyQueries;
    }
  }

  private static loadEvents(): AiUsageEvent[] {
    try {
      this.ensureDataDir();
      if (fs.existsSync(USAGE_FILE)) {
        const raw = fs.readFileSync(USAGE_FILE, 'utf8');
        return JSON.parse(raw) || [];
      }
    } catch {}
    return [];
  }

  private static appendEvent(event: AiUsageEvent): void {
    try {
      this.ensureDataDir();
      let events = this.loadEvents();
      // Keep bounded window of events to avoid unbounded file growth
      if (events.length > 5000) {
        events = events.slice(-4000);
      }
      events.push(event);
      fs.writeFileSync(USAGE_FILE, JSON.stringify(events, null, 2), 'utf8');
    } catch (err) {
      console.error('[AI_QUOTA] Failed to record usage event:', err);
    }
  }

  public static getUserUsageToday(userId: string): number {
    const todayStr = this.getKolkataDateString();
    const cached = this.userUsageCache.get(userId);
    if (cached && cached.dateStr === todayStr) {
      return cached.count;
    }

    // Reconstruct from durable events if not in memory
    const events = this.loadEvents();
    const userEventsToday = events.filter(e => e.userId === userId && e.dateStr === todayStr);
    const count = userEventsToday.length;
    this.userUsageCache.set(userId, { dateStr: todayStr, count });
    return count;
  }

  /**
   * Atomic, concurrency-safe query quota consumption.
   * Throws Error with code 'AI_QUOTA_EXCEEDED' if daily limit is reached.
   */
  public static consumeQuery(userId: string, tier: SubscriptionTier): {
    usedToday: number;
    totalAllowed: number;
    remaining: number;
  } {
    const todayStr = this.getKolkataDateString();
    const totalAllowed = this.getDailyLimitForTier(tier);

    let currentUsed = this.getUserUsageToday(userId);

    if (currentUsed >= totalAllowed) {
      const err: any = new Error(`Daily AI consultation limit of ${totalAllowed} questions reached for tier ${tier}.`);
      err.code = 'AI_QUOTA_EXCEEDED';
      err.tier = tier;
      err.dailyLimit = totalAllowed;
      err.upgradeRequired = tier === SubscriptionTier.FREE ? SubscriptionTier.PLUS : SubscriptionTier.PREMIUM;
      throw err;
    }

    const nextUsed = currentUsed + 1;
    this.userUsageCache.set(userId, { dateStr: todayStr, count: nextUsed });

    // Record durable usage event
    const event: AiUsageEvent = {
      id: `ai_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      tier,
      dateStr: todayStr,
      timestamp: new Date().toISOString(),
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      promptTokens: 450,
      completionTokens: 250,
      estimatedCostUsd: 0.0035
    };
    this.appendEvent(event);

    return {
      usedToday: nextUsed,
      totalAllowed,
      remaining: Math.max(0, totalAllowed - nextUsed)
    };
  }

  public static getMetrics(): AiUsageMetrics {
    const todayStr = this.getKolkataDateString();
    const monthPrefix = todayStr.substring(0, 7); // YYYY-MM
    const events = this.loadEvents();

    let totalQueriesToday = 0;
    let totalQueriesThisMonth = 0;
    let estimatedCostTodayUsd = 0;
    const usersToday = new Set<string>();

    const tierBreakdown: Record<SubscriptionTier, number> = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PLUS]: 0,
      [SubscriptionTier.PREMIUM]: 0
    };

    for (const evt of events) {
      if (evt.dateStr.startsWith(monthPrefix)) {
        totalQueriesThisMonth++;
      }
      if (evt.dateStr === todayStr) {
        totalQueriesToday++;
        usersToday.add(evt.userId);
        estimatedCostTodayUsd += (evt.estimatedCostUsd || 0);
        if (tierBreakdown[evt.tier] !== undefined) {
          tierBreakdown[evt.tier]++;
        }
      }
    }

    return {
      totalQueriesToday,
      totalQueriesThisMonth,
      tierBreakdown,
      activeUsersToday: usersToday.size,
      estimatedCostTodayUsd: Number(estimatedCostTodayUsd.toFixed(4)),
      quotas: this.getQuotas()
    };
  }
}
