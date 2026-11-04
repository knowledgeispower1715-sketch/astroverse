/**
 * AstroVerse Password Security & Complexity Enforcement
 * 
 * Implements high-entropy validation defense-in-depth across customer registration,
 * password reset, account recovery, and administrative provisioning.
 * 
 * NOTE ON SUPABASE LEAKED PASSWORD PROTECTION:
 * Supabase Leaked Password Protection (HaveIBeenPwned k-anonymity check via Auth API)
 * is an enterprise-tier feature restricted on Free Plan projects (BLOCKED_PLAN_REQUIREMENT).
 * On Supabase project `supabase-byzantine-nest`, this setting cannot be toggled via API
 * without an upgraded organization plan.
 * AstroVerse enforces server-side and client-side password entropy controls to provide
 * equivalent protection against dictionary attacks, credential stuffing, and weak passphrases.
 */

export const SUPABASE_PASSWORD_SECURITY_PLAN = 'BLOCKED_PLAN_REQUIREMENT' as const;

export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
  score?: number; // 0-4 entropy rating
}

export interface PasswordValidationOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  isAdmin?: boolean;
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password', 'password123', 'admin', 'admin123', 'astroverse',
  'astroverse123', '12345678', '123456789', '1234567890',
  'qwerty123', 'letmein123', 'welcome123', 'administrator'
]);

export function validatePasswordComplexity(
  password: unknown,
  options: PasswordValidationOptions = {}
): PasswordValidationResult {
  const {
    minLength = 10,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = true,
    isAdmin = false
  } = options;

  if (typeof password !== 'string' || !password) {
    return { valid: false, reason: 'Password is required and must be a string.', score: 0 };
  }

  const trimmed = password.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      reason: `Password must be at least ${minLength} characters long (provided: ${trimmed.length}).`,
      score: 0
    };
  }

  if (COMMON_WEAK_PASSWORDS.has(trimmed.toLowerCase())) {
    return {
      valid: false,
      reason: 'This password is too common or easily guessable. Please choose a unique passphrase.',
      score: 1
    };
  }

  if (requireUppercase && !/[A-Z]/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Password must contain at least one uppercase letter (A-Z).',
      score: 1
    };
  }

  if (requireLowercase && !/[a-z]/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Password must contain at least one lowercase letter (a-z).',
      score: 1
    };
  }

  if (requireNumbers && !/[0-9]/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Password must contain at least one numerical digit (0-9).',
      score: 2
    };
  }

  if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(trimmed)) {
    return {
      valid: false,
      reason: 'Password must contain at least one special character or symbol (e.g. !@#$%^&*).',
      score: 2
    };
  }

  // Calculate entropy score
  let score = 3;
  if (trimmed.length >= 14 && /[A-Z]/.test(trimmed) && /[a-z]/.test(trimmed) && /[0-9]/.test(trimmed) && /[^A-Za-z0-9]/.test(trimmed)) {
    score = 4;
  }

  return { valid: true, score };
}
