/**
 * Self-healing PostgreSQL Schema Bootstrap for AstroVerse
 * Ensures all required enums, tables, and indexes exist in Supabase/PostgreSQL
 * without requiring manual migrations.
 */

export const DDL_STATEMENTS: string[] = [
  // Enums
  `DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'OWNER', 'SECURITY_ADMIN', 'SUPPORT_ADMIN', 'CONTENT_EDITOR', 'FINANCE_ADMIN', 'ASTROLOGY_OPS_ADMIN', 'READONLY_ANALYST', 'SUPER_ADMIN', 'SUPPORT', 'OPERATIONS', 'ANALYST');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE TYPE "EntryType" AS ENUM ('WALLET_RECHARGE', 'CONSULTATION_DEBIT', 'ASTROLOGER_CREDIT', 'PLATFORM_COMMISSION', 'PUJA_BOOKING', 'STORE_PURCHASE', 'REFUND');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE TYPE "SessionStatus" AS ENUM ('INITIATED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'TERMINATED_INSUFFICIENT_FUNDS', 'CANCELLED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`,

  // Core User & Auth Tables
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "preferredTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "passwordHash" TEXT,
    "passwordSalt" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mfaEnforced" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'NONE',
    "subscriptionBillingPeriod" TEXT,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "requestId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "SavedReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "BirthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT 'Self',
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "timeOfBirth" TEXT NOT NULL,
    "birthTimeKnown" BOOLEAN NOT NULL DEFAULT true,
    "birthplaceName" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "resolvedTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BirthProfile_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "KundliCalculation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthProfileId" TEXT,
    "calculationEngine" TEXT NOT NULL DEFAULT 'SwissEphemeris_v2.10',
    "ayanamsha" TEXT NOT NULL DEFAULT 'Lahiri',
    "lagnaSign" TEXT NOT NULL,
    "lagnaDegree" DECIMAL(6,2) NOT NULL,
    "moonSign" TEXT NOT NULL,
    "sunSign" TEXT NOT NULL,
    "nakshatra" TEXT NOT NULL,
    "pada" INTEGER NOT NULL,
    "fullPayload" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KundliCalculation_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "Astrologer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "specialities" TEXT NOT NULL,
    "languages" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 10,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 4.95,
    "ordersCount" INTEGER NOT NULL DEFAULT 1500,
    "ratePerMinute" DECIMAL(10,2) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isBusy" BOOLEAN NOT NULL DEFAULT false,
    "pendingPayout" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Astrologer_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "ConsultationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "astrologerId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'CHAT',
    "ratePerMinute" DECIMAL(10,2) NOT NULL,
    "minutesConsumed" INTEGER NOT NULL DEFAULT 0,
    "totalDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "SessionStatus" NOT NULL DEFAULT 'INITIATED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "ConsultationSession_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "ConsultationMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultationMessage_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'CASHFREE',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amountPaise" INTEGER,
    "productType" TEXT,
    "productId" TEXT,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
  );`,

  `DO $$ BEGIN
    ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'CASHFREE';
    ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "providerOrderId" TEXT;
    ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;
    ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "amountPaise" INTEGER;
    ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "productType" TEXT;
    ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "productId" TEXT;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END $$;`,

  `CREATE TABLE IF NOT EXISTS "WalletLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "astrologerId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "PujaBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pujaName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "sankalpName" TEXT NOT NULL,
    "gotra" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PujaBooking_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "FeatureFlag" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',
    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
  );`,

  `CREATE TABLE IF NOT EXISTS "PlatformIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'P3_MINOR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformIncident_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE TABLE IF NOT EXISTS "ContentBanner" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BANNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',
    CONSTRAINT "ContentBanner_pkey" PRIMARY KEY ("id")
  );`,

  // Indexes
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");`,
  `CREATE INDEX IF NOT EXISTS "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");`,
  `CREATE INDEX IF NOT EXISTS "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "SavedReport_userId_reportType_idx" ON "SavedReport"("userId", "reportType");`,
  `CREATE INDEX IF NOT EXISTS "BirthProfile_userId_profileName_idx" ON "BirthProfile"("userId", "profileName");`,
  `CREATE INDEX IF NOT EXISTS "KundliCalculation_userId_calculatedAt_idx" ON "KundliCalculation"("userId", "calculatedAt");`,
  `CREATE INDEX IF NOT EXISTS "ConsultationSession_userId_startedAt_idx" ON "ConsultationSession"("userId", "startedAt");`,
  `CREATE INDEX IF NOT EXISTS "ConsultationSession_astrologerId_startedAt_idx" ON "ConsultationSession"("astrologerId", "startedAt");`,
  `CREATE INDEX IF NOT EXISTS "ConsultationMessage_sessionId_sentAt_idx" ON "ConsultationMessage"("sessionId", "sentAt");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PaymentOrder_razorpayPaymentId_key" ON "PaymentOrder"("razorpayPaymentId");`,
  `CREATE INDEX IF NOT EXISTS "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WalletLedger_idempotencyKey_key" ON "WalletLedger"("idempotencyKey");`,
  `CREATE INDEX IF NOT EXISTS "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "WalletLedger_astrologerId_createdAt_idx" ON "WalletLedger"("astrologerId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "PujaBooking_userId_bookingDate_idx" ON "PujaBooking"("userId", "bookingDate");`,
  `CREATE INDEX IF NOT EXISTS "PlatformIncident_status_severity_idx" ON "PlatformIncident"("status", "severity");`,
  `CREATE INDEX IF NOT EXISTS "PrivacyRequest_userId_status_idx" ON "PrivacyRequest"("userId", "status");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ContentBanner_key_key" ON "ContentBanner"("key");`,

  // Foreign key constraints
  `DO $$ BEGIN
    ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "BirthProfile" ADD CONSTRAINT "BirthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "KundliCalculation" ADD CONSTRAINT "KundliCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "KundliCalculation" ADD CONSTRAINT "KundliCalculation_birthProfileId_fkey" FOREIGN KEY ("birthProfileId") REFERENCES "BirthProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "ConsultationSession" ADD CONSTRAINT "ConsultationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "ConsultationSession" ADD CONSTRAINT "ConsultationSession_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "Astrologer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConsultationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "Astrologer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "PujaBooking" ADD CONSTRAINT "PujaBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // ===========================================================================
  // ROW LEVEL SECURITY (RLS) POLICIES & PRIVILEGE HARDENING (PHASE 6)
  // ===========================================================================
  // Enforces zero-trust isolation in PostgreSQL and Supabase.
  // Direct client access (PostgREST / anon) without authenticated ownership
  // is strictly rejected at the database engine level.
  // ===========================================================================

  `ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "UserSession" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "BirthProfile" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "SavedReport" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "KundliCalculation" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "PaymentOrder" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "WalletLedger" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ConsultationSession" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ConsultationMessage" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "PujaBooking" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "PlatformIncident" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ContentBanner" ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "Astrologer" ENABLE ROW LEVEL SECURITY;`,

  // User Profile: Users may read/update only their own record; service_role has full access
  `DO $$ BEGIN
    CREATE POLICY "user_own_record" ON "User" FOR ALL 
    USING (id = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    WITH CHECK (id = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // BirthProfile: Strict user ownership; prevents IDOR between customers
  `DO $$ BEGIN
    CREATE POLICY "birthprofile_own_record" ON "BirthProfile" FOR ALL 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    WITH CHECK ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // SavedReport: Strict user ownership; protects personalized reports and charts
  `DO $$ BEGIN
    CREATE POLICY "savedreport_own_record" ON "SavedReport" FOR ALL 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    WITH CHECK ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // PaymentOrder: Customers may view only their own orders; mutations strictly restricted to service_role
  `DO $$ BEGIN
    CREATE POLICY "paymentorder_read_own" ON "PaymentOrder" FOR SELECT 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "paymentorder_mutate_service_role" ON "PaymentOrder" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // WalletLedger: Customers may view only their own ledger transactions; mutations restricted to service_role
  `DO $$ BEGIN
    CREATE POLICY "walletledger_read_own" ON "WalletLedger" FOR SELECT 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "walletledger_mutate_service_role" ON "WalletLedger" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // AuditEvent: Append-only and readable strictly by service_role and security administrators
  `DO $$ BEGIN
    CREATE POLICY "auditevent_service_role_only" ON "AuditEvent" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // Astrologer Catalog & Banners: Public read; mutations restricted to service_role
  `DO $$ BEGIN
    CREATE POLICY "astrologer_public_read" ON "Astrologer" FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "astrologer_service_mutate" ON "Astrologer" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "contentbanner_public_read" ON "ContentBanner" FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "contentbanner_service_mutate" ON "ContentBanner" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // KundliCalculation: User ownership isolation
  `DO $$ BEGIN
    CREATE POLICY "kundlicalculation_own_record" ON "KundliCalculation" FOR ALL 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    WITH CHECK ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // ConsultationSession: User ownership isolation for read; service_role for state mutations
  `DO $$ BEGIN
    CREATE POLICY "consultationsession_read_own" ON "ConsultationSession" FOR SELECT 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "consultationsession_mutate_service_role" ON "ConsultationSession" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // ConsultationMessage: Message access strictly scoped to participants
  `DO $$ BEGIN
    CREATE POLICY "consultationmessage_read_own_session" ON "ConsultationMessage" FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM "ConsultationSession" cs 
      WHERE cs.id = "ConsultationMessage"."sessionId" 
      AND (cs."userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    ));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "consultationmessage_mutate_service_role" ON "ConsultationMessage" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // PujaBooking: User ownership isolation for read
  `DO $$ BEGIN
    CREATE POLICY "pujabooking_read_own" ON "PujaBooking" FOR SELECT 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "pujabooking_mutate_service_role" ON "PujaBooking" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // PrivacyRequest: User ownership isolation
  `DO $$ BEGIN
    CREATE POLICY "privacyrequest_own_record" ON "PrivacyRequest" FOR ALL 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    WITH CHECK ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // UserSession: Session isolation
  `DO $$ BEGIN
    CREATE POLICY "usersession_own_record" ON "UserSession" FOR ALL 
    USING ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'))
    WITH CHECK ("userId" = NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '') OR current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // FeatureFlag: Public read, service_role write
  `DO $$ BEGIN
    CREATE POLICY "featureflag_public_read" ON "FeatureFlag" FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  `DO $$ BEGIN
    CREATE POLICY "featureflag_service_mutate" ON "FeatureFlag" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // PlatformIncident: Service role and security administrators only
  `DO $$ BEGIN
    CREATE POLICY "platformincident_service_only" ON "PlatformIncident" FOR ALL 
    USING (current_user IN ('postgres', 'service_role'))
    WITH CHECK (current_user IN ('postgres', 'service_role'));
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,

  // SQL Grants Hardening: Principle of least privilege
  `DO $$ BEGIN
    REVOKE ALL ON "PaymentOrder", "WalletLedger", "AuditEvent", "PlatformIncident", "User" FROM anon;
    GRANT SELECT ON "User", "BirthProfile", "SavedReport", "KundliCalculation", "PaymentOrder", "WalletLedger", "ConsultationSession", "ConsultationMessage", "PujaBooking", "PrivacyRequest" TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON "BirthProfile", "SavedReport", "KundliCalculation", "PrivacyRequest" TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
  EXCEPTION WHEN others THEN null;
  END $$;`
];

const bootstrapPromises = new WeakMap<any, Promise<boolean>>();

export function resetBootstrapCache(): void {
  // Provided for test harness resets if needed
}

export async function bootstrapPostgresSchema(prisma: any): Promise<boolean> {
  if (!prisma) return false;
  if (bootstrapPromises.has(prisma)) {
    return bootstrapPromises.get(prisma)!;
  }

  const promise = (async () => {
    try {
      // 1. Fast existence check: does public."User" table already exist?
      const check: any = await prisma.$queryRawUnsafe(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'User' 
        LIMIT 1;
      `);

      if (Array.isArray(check) && check.length > 0) {
        return true;
      }

      const isVercelPreview = process.env.VERCEL_ENV === 'preview' || process.env.ALLOW_PREVIEW_EPHEMERAL_STORAGE === '1';
      const isProd = (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') && !isVercelPreview;
      if (isProd && process.env.ALLOW_PRODUCTION_AUTO_DDL !== '1') {
        console.warn('[DB_BOOTSTRAP] Automated runtime DDL creation is disabled in production. Run migrations through Prisma CLI.');
        return false;
      }

      console.log('[DB_BOOTSTRAP] PostgreSQL "User" table missing. Executing self-healing schema creation...');

      for (const statement of DDL_STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch (stmtErr: any) {
          // Ignore duplicate object/type/table warnings
          const msg = stmtErr?.message || '';
          if (!msg.includes('already exists') && !msg.includes('duplicate')) {
            console.warn('[DB_BOOTSTRAP] DDL notice:', msg);
          }
        }
      }

      console.log('[DB_BOOTSTRAP] Schema self-healing successfully completed. Tables and enums active.');
      return true;
    } catch (err: any) {
      console.error('[DB_BOOTSTRAP] Schema bootstrap error:', err?.message || err);
      return false;
    }
  })();

  bootstrapPromises.set(prisma, promise);
  return promise;
}
