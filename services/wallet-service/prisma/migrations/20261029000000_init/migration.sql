-- AstroVerse Initial Migration for PostgreSQL / Supabase
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'OWNER', 'SECURITY_ADMIN', 'SUPPORT_ADMIN', 'CONTENT_EDITOR', 'FINANCE_ADMIN', 'ASTROLOGY_OPS_ADMIN', 'READONLY_ANALYST', 'SUPER_ADMIN', 'SUPPORT', 'OPERATIONS', 'ANALYST');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('WALLET_RECHARGE', 'CONSULTATION_DEBIT', 'ASTROLOGER_CREDIT', 'PLATFORM_COMMISSION', 'PUJA_BOOKING', 'STORE_PURCHASE', 'REFUND');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('INITIATED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'TERMINATED_INSUFFICIENT_FUNDS', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
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
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthProfile" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KundliCalculation" (
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
);

-- CreateTable
CREATE TABLE "Astrologer" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Astrologer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationSession" (
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
);

-- CreateTable
CREATE TABLE "ConsultationMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
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
);

-- CreateTable
CREATE TABLE "PujaBooking" (
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
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PlatformIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'P3_MINOR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "summary" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBanner" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BANNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "ContentBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");
CREATE INDEX "SavedReport_userId_reportType_idx" ON "SavedReport"("userId", "reportType");
CREATE INDEX "BirthProfile_userId_profileName_idx" ON "BirthProfile"("userId", "profileName");
CREATE INDEX "KundliCalculation_userId_calculatedAt_idx" ON "KundliCalculation"("userId", "calculatedAt");
CREATE INDEX "ConsultationSession_userId_startedAt_idx" ON "ConsultationSession"("userId", "startedAt");
CREATE INDEX "ConsultationSession_astrologerId_startedAt_idx" ON "ConsultationSession"("astrologerId", "startedAt");
CREATE INDEX "ConsultationMessage_sessionId_sentAt_idx" ON "ConsultationMessage"("sessionId", "sentAt");
CREATE UNIQUE INDEX "PaymentOrder_razorpayOrderId_key" ON "PaymentOrder"("razorpayOrderId");
CREATE UNIQUE INDEX "PaymentOrder_razorpayPaymentId_key" ON "PaymentOrder"("razorpayPaymentId");
CREATE INDEX "PaymentOrder_userId_createdAt_idx" ON "PaymentOrder"("userId", "createdAt");
CREATE UNIQUE INDEX "WalletLedger_idempotencyKey_key" ON "WalletLedger"("idempotencyKey");
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");
CREATE INDEX "WalletLedger_astrologerId_createdAt_idx" ON "WalletLedger"("astrologerId", "createdAt");
CREATE INDEX "PujaBooking_userId_bookingDate_idx" ON "PujaBooking"("userId", "bookingDate");
CREATE INDEX "PlatformIncident_status_severity_idx" ON "PlatformIncident"("status", "severity");
CREATE INDEX "PrivacyRequest_userId_status_idx" ON "PrivacyRequest"("userId", "status");
CREATE UNIQUE INDEX "ContentBanner_key_key" ON "ContentBanner"("key");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BirthProfile" ADD CONSTRAINT "BirthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KundliCalculation" ADD CONSTRAINT "KundliCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KundliCalculation" ADD CONSTRAINT "KundliCalculation_birthProfileId_fkey" FOREIGN KEY ("birthProfileId") REFERENCES "BirthProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsultationSession" ADD CONSTRAINT "ConsultationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultationSession" ADD CONSTRAINT "ConsultationSession_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "Astrologer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConsultationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_astrologerId_fkey" FOREIGN KEY ("astrologerId") REFERENCES "Astrologer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PujaBooking" ADD CONSTRAINT "PujaBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
