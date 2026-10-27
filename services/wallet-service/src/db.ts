import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export enum Role {
  USER = 'USER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SUPPORT = 'SUPPORT',
  OPERATIONS = 'OPERATIONS',
  ANALYST = 'ANALYST'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED'
}

export enum EntryType {
  WALLET_RECHARGE = 'WALLET_RECHARGE',
  CONSULTATION_DEBIT = 'CONSULTATION_DEBIT',
  ASTROLOGER_CREDIT = 'ASTROLOGER_CREDIT',
  PLATFORM_COMMISSION = 'PLATFORM_COMMISSION',
  PUJA_BOOKING = 'PUJA_BOOKING',
  STORE_PURCHASE = 'STORE_PURCHASE',
  DEMO_CREDIT = 'DEMO_CREDIT',
  DEMO_REPORT_PURCHASE = 'DEMO_REPORT_PURCHASE',
  DEMO_SUBSCRIPTION = 'DEMO_SUBSCRIPTION',
  DEMO_REVERSAL = 'DEMO_REVERSAL'
}

export function isDemoModeActive(): boolean {
  // Fail-closed security rule: Production environment strictly forbids demo money operations
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
    return false;
  }
  // Explicitly enabled via DEMO_MODE=true or running in test/development/preview
  return process.env.DEMO_MODE === 'true' || 
         process.env.NODE_ENV === 'test' || 
         process.env.NODE_ENV === 'development' || 
         process.env.VERCEL_ENV === 'preview';
}

export enum OrderStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export enum SessionStatus {
  INITIATED = 'INITIATED',
  ACCEPTED = 'ACCEPTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

let PrismaClientConstructor: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PrismaClientConstructor = require('@prisma/client').PrismaClient;
} catch (e: any) {
  console.warn('[DB] Prisma client native library not pre-loaded:', e.message);
}

export interface UserRecord {
  id: string;
  phone: string | null;
  email: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  displayName: string | null;
  passwordHash?: string | null;
  passwordSalt?: string | null;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: string | null;
  role: Role;
  status: AccountStatus;
  preferredLanguage: string;
  preferredTimezone: string;
  walletBalance: number;
  demoWalletBalance?: number;
  simulatedSubscriptionTier?: 'FREE' | 'PLUS' | 'PREMIUM' | null;
  subscriptionTier?: 'FREE' | 'PLUS' | 'PREMIUM';
  subscriptionBillingPeriod?: 'MONTHLY' | 'ANNUAL' | null;
  subscriptionExpiresAt?: string | null;
  subscriptionStatus?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL' | 'NONE';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditEventRecord {
  id: string;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

export interface BirthProfileRecord {
  id: string;
  userId: string;
  profileName: string;
  relationship: string;
  dateOfBirth: string;
  timeOfBirth: string;
  birthTimeKnown: boolean;
  birthplaceName: string;
  latitude: number;
  longitude: number;
  resolvedTimezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportRecord {
  id: string;
  userId: string;
  title: string;
  reportType: string;
  payload: any;
  createdAt: string;
}

export interface AstrologerRecord {
  id: string;
  name: string;
  avatarUrl: string | null;
  specialities: string;
  languages: string;
  experienceYears: number;
  rating: number;
  ordersCount: number;
  ratePerMinute: number;
  isOnline: boolean;
  isBusy: boolean;
  pendingPayout: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletLedgerRecord {
  id: string;
  userId: string | null;
  astrologerId: string | null;
  amount: number;
  entryType: EntryType;
  idempotencyKey: string;
  referenceId: string | null;
  description: string | null;
  isDemo?: boolean;
  createdAt: string;
}

export interface PaymentOrderRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PujaBookingRecord {
  id: string;
  userId: string;
  pujaName: string;
  amount: number;
  bookingDate: string;
  sankalpName: string;
  gotra: string | null;
  status: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  sessions: UserSessionRecord[];
  auditEvents: AuditEventRecord[];
  birthProfiles: BirthProfileRecord[];
  savedReports: SavedReportRecord[];
  astrologers: AstrologerRecord[];
  walletLedgers: WalletLedgerRecord[];
  paymentOrders: PaymentOrderRecord[];
  pujaBookings: PujaBookingRecord[];
}

function resolveDbPaths(): { dataDir: string; dbFile: string } {
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const os = require('os');
    const tmpDir = path.join(os.tmpdir(), 'astroverse_test_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return { dataDir: tmpDir, dbFile: path.join(tmpDir, `astroverse_test_db_${process.pid}.json`) };
    } catch {
      // Fall through
    }
  }

  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join('/tmp', 'astroverse_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return { dataDir: tmpDir, dbFile: path.join(tmpDir, 'astroverse_db.json') };
    } catch {
      // Fall through
    }
  }

  const localDir = path.resolve(__dirname, '..', 'data');
  const localFile = path.join(localDir, 'astroverse_db.json');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return { dataDir: localDir, dbFile: localFile };
  } catch {
    const tmpDir = path.join('/tmp', 'astroverse_data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (_) {}
    return { dataDir: tmpDir, dbFile: path.join(tmpDir, 'astroverse_db.json') };
  }
}

// In-memory cache + file persistence with ACID-like atomic writes
class ResilientDatabase {
  private data: DatabaseSchema;
  private isPostgresAvailable: boolean = false;
  private prisma: any = null;
  private dbFilePath: string;

  constructor() {
    const paths = resolveDbPaths();
    this.dbFilePath = paths.dbFile;

    const resolvedDbUrl = 
      process.env.DATABASE_URL || 
      process.env.POSTGRES_PRISMA_URL || 
      process.env.POSTGRES_URL || 
      process.env.SUPABASE_POSTGRES_URL;

    if (resolvedDbUrl && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = resolvedDbUrl;
    }

    if (process.env.DATABASE_URL && PrismaClientConstructor) {
      try {
        this.prisma = new PrismaClientConstructor();
        this.isPostgresAvailable = true;
        console.log('[DB] PostgreSQL URL detected. Configuring durable PostgreSQL via Prisma.');
      } catch (err: any) {
        console.error('[DB] Failed to initialize Prisma client:', err?.message || err);
        this.isPostgresAvailable = false;
      }
    } else {
      this.isPostgresAvailable = false;
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
        console.warn('[DB_CONFIG_REQUIRED] Running in production/Vercel without DATABASE_URL / POSTGRES_URL. Ephemeral file storage cannot persist across lambda invocations.');
      }
    }

    this.data = this.loadFromFile();
    if (!this.isPostgresAvailable) {
      this.seedDefaults();
    }
  }

  assertDurableStorage(): void {
    const isVercelPreview = process.env.VERCEL_ENV === 'preview' || process.env.ALLOW_PREVIEW_EPHEMERAL_STORAGE === '1';
    const isProd = (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') && !isVercelPreview;
    const hasSupabase = Boolean(
      process.env.SUPABASE_URL && 
      (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    );
    if (isProd && !this.isPostgresAvailable && !hasSupabase) {
      throw new Error(
        'DURABLE_STORAGE_REQUIRED: Production deployment requires a configured and connected PostgreSQL database (DATABASE_URL) or Supabase project. Ephemeral storage fallback is strictly disabled in production.'
      );
    }
  }

  getPersistenceStatus() {
    const isVercelPreview = process.env.VERCEL_ENV === 'preview' || process.env.ALLOW_PREVIEW_EPHEMERAL_STORAGE === '1';
    const isProd = (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') && !isVercelPreview;
    const hasDbUrl = Boolean(
      process.env.DATABASE_URL || 
      process.env.POSTGRES_PRISMA_URL || 
      process.env.POSTGRES_URL || 
      process.env.SUPABASE_POSTGRES_URL
    );
    const hasSupabase = Boolean(
      process.env.SUPABASE_URL && 
      (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
    );
    const isDurable = this.isPostgresAvailable || hasSupabase;
    let mode = 'LOCAL_DEVELOPMENT_FILE';
    if (this.isPostgresAvailable) {
      mode = 'POSTGRES_PRISMA';
    } else if (hasSupabase) {
      mode = 'SUPABASE_CLOUD';
    } else if (isVercelPreview) {
      mode = 'PREVIEW_EPHEMERAL_MODE';
    } else if (isProd) {
      mode = 'UNCONFIGURED_PRODUCTION';
    }

    return {
      durable: isDurable,
      mode,
      databaseConfigured: hasDbUrl || hasSupabase,
      connected: isDurable,
      isProduction: isProd,
      isPreview: isVercelPreview,
      supabaseConnected: hasSupabase
    };
  }

  private mapPrismaUser(u: any): UserRecord {
    return {
      id: u.id,
      phone: u.phone,
      email: u.email,
      phoneVerified: u.phoneVerified,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      passwordHash: u.passwordHash,
      passwordSalt: u.passwordSalt,
      resetTokenHash: u.resetTokenHash,
      resetTokenExpiresAt: u.resetTokenExpiresAt ? (typeof u.resetTokenExpiresAt === 'string' ? u.resetTokenExpiresAt : u.resetTokenExpiresAt.toISOString()) : null,
      role: u.role,
      status: u.status,
      preferredLanguage: u.preferredLanguage,
      preferredTimezone: u.preferredTimezone,
      walletBalance: Number(u.walletBalance),
      lastLoginAt: u.lastLoginAt ? (typeof u.lastLoginAt === 'string' ? u.lastLoginAt : u.lastLoginAt.toISOString()) : null,
      createdAt: typeof u.createdAt === 'string' ? u.createdAt : u.createdAt.toISOString(),
      updatedAt: typeof u.updatedAt === 'string' ? u.updatedAt : u.updatedAt.toISOString()
    };
  }

  private mapPrismaSession(s: any): UserSessionRecord {
    return {
      id: s.id,
      userId: s.userId,
      tokenHash: s.tokenHash,
      expiresAt: typeof s.expiresAt === 'string' ? s.expiresAt : s.expiresAt.toISOString(),
      ipAddress: s.ipAddress || null,
      userAgent: s.userAgent || null,
      createdAt: typeof s.createdAt === 'string' ? s.createdAt : s.createdAt.toISOString()
    };
  }

  private mapPrismaProfile(p: any): BirthProfileRecord {
    return {
      id: p.id,
      userId: p.userId,
      profileName: p.profileName,
      relationship: p.relationship,
      dateOfBirth: typeof p.dateOfBirth === 'string' ? p.dateOfBirth : p.dateOfBirth.toISOString().split('T')[0],
      timeOfBirth: p.timeOfBirth,
      birthTimeKnown: p.birthTimeKnown,
      birthplaceName: p.birthplaceName,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      resolvedTimezone: p.resolvedTimezone,
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString(),
      updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : p.updatedAt.toISOString()
    };
  }

  private mapPrismaReport(r: any): SavedReportRecord {
    return {
      id: r.id,
      userId: r.userId,
      title: r.title,
      reportType: r.reportType,
      payload: r.payload,
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()
    };
  }

  private mapPrismaPaymentOrder(o: any): PaymentOrderRecord {
    return {
      id: o.id,
      userId: o.userId,
      amount: Number(o.amount),
      currency: o.currency,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      status: o.status,
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : o.createdAt.toISOString(),
      updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : o.updatedAt.toISOString()
    };
  }

  private loadFromFile(): DatabaseSchema {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[DB] Could not parse DB file, checking packaged seed:', err);
      }
    }
    const packagedFile = path.resolve(__dirname, '..', 'data', 'astroverse_db.json');
    if (packagedFile !== this.dbFilePath && fs.existsSync(packagedFile)) {
      try {
        const raw = fs.readFileSync(packagedFile, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[DB] Could not parse packaged DB file:', err);
      }
    }
    return {
      users: [],
      sessions: [],
      auditEvents: [],
      birthProfiles: [],
      savedReports: [],
      astrologers: [],
      walletLedgers: [],
      paymentOrders: [],
      pujaBookings: []
    };
  }

  private saveToFile(): void {
    if (this.isPostgresAvailable) {
      // Durably persisted in PostgreSQL; file write not required
      return;
    }
    try {
      const tempFile = `${this.dbFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, this.dbFilePath);
    } catch (err: any) {
      console.error('[DB] Failed to persist database state:', err?.message || err);
      if (err.code === 'EROFS') {
        throw new Error(`PERSISTENCE_FAILED: Read-only filesystem (EROFS) detected under /var/task. Durable PostgreSQL database (DATABASE_URL) is required in production: ${err.message}`);
      }
    }
  }

  private seedDefaults(): void {
    let modified = false;
    // Seed default Super Admin user if not exists
    const adminExists = this.data.users.some(u => u.role === Role.SUPER_ADMIN || u.email === 'admin@astroverse.app');
    if (!adminExists) {
      const adminId = 'usr_super_admin_001';
      this.data.users.push({
        id: adminId,
        phone: '+919999999999',
        email: 'admin@astroverse.app',
        phoneVerified: true,
        emailVerified: true,
        displayName: 'Platform Administrator',
        role: Role.SUPER_ADMIN,
        status: AccountStatus.ACTIVE,
        preferredLanguage: 'en',
        preferredTimezone: 'Asia/Kolkata',
        walletBalance: 1000.00,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('[DB_INIT] Default Super Admin seeded: admin@astroverse.app / +919999999999');
      modified = true;
    }

    // Seed sample astrologers if empty
    if (this.data.astrologers.length === 0) {
      this.data.astrologers = [
        {
          id: 'astro_001',
          name: 'Acharya Ramanuj',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
          specialities: 'Vedic, Prashna, Career, Medical Astrology',
          languages: 'Hindi, English, Sanskrit',
          experienceYears: 18,
          rating: 4.98,
          ordersCount: 4210,
          ratePerMinute: 45.00,
          isOnline: true,
          isBusy: false,
          pendingPayout: 0.00,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'astro_002',
          name: 'Pandit Devratna',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          specialities: 'Kundli Milan, Marriage, Relationship, Dasha',
          languages: 'Hindi, Gujarati, English',
          experienceYears: 12,
          rating: 4.92,
          ordersCount: 2890,
          ratePerMinute: 35.00,
          isOnline: true,
          isBusy: false,
          pendingPayout: 0.00,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'astro_003',
          name: 'Dr. Sunita Shastri',
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
          specialities: 'KP Astrology, Numerology, Financial Forecasting',
          languages: 'Hindi, Marathi, English',
          experienceYears: 15,
          rating: 4.96,
          ordersCount: 3540,
          ratePerMinute: 40.00,
          isOnline: true,
          isBusy: true,
          pendingPayout: 0.00,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      modified = true;
    }
    if (modified && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      try {
        this.saveToFile();
      } catch (err: any) {
        console.warn('[DB] Skipped saving default seed:', err?.message || err);
      }
    }
  }

  // ==================== USERS & AUTH ====================

  async findUserById(id: string): Promise<UserRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const u = await this.prisma.user.findUnique({ where: { id } });
        return u ? this.mapPrismaUser(u) : null;
      } catch (err: any) {
        console.error('[DB] findUserById Prisma error:', err?.message || err);
      }
    }
    return this.data.users.find(u => u.id === id) || null;
  }

  async findUserByIdentifier(identifier: string): Promise<UserRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const clean = identifier.trim().toLowerCase();
        const u = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: clean, mode: 'insensitive' } },
              { phone: identifier }
            ]
          }
        });
        return u ? this.mapPrismaUser(u) : null;
      } catch (err: any) {
        console.error('[DB] findUserByIdentifier Prisma error:', err?.message || err);
      }
    }
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(u => 
      (u.email && u.email.toLowerCase() === clean) || 
      (u.phone && (u.phone === identifier || u.phone.replace(/[\s\-\+]/g, '') === identifier.replace(/[\s\-\+]/g, '')))
    ) || null;
  }

  async findUserByPhone(phone: string): Promise<UserRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const u = await this.prisma.user.findFirst({ where: { phone } });
        return u ? this.mapPrismaUser(u) : null;
      } catch (err: any) {
        console.error('[DB] findUserByPhone Prisma error:', err?.message || err);
      }
    }
    const digits = phone.replace(/[\s\-\(\)\+]/g, '');
    return this.data.users.find(u => u.phone && u.phone.replace(/[\s\-\(\)\+]/g, '') === digits) || null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const clean = email.trim().toLowerCase();
        const u = await this.prisma.user.findFirst({
          where: { email: { equals: clean, mode: 'insensitive' } }
        });
        return u ? this.mapPrismaUser(u) : null;
      } catch (err: any) {
        console.error('[DB] findUserByEmail Prisma error:', err?.message || err);
      }
    }
    const clean = email.trim().toLowerCase();
    return this.data.users.find(u => u.email && u.email.toLowerCase() === clean) || null;
  }

  async createUser(userData: {
    id?: string;
    phone?: string | null;
    email?: string | null;
    phoneVerified?: boolean;
    emailVerified?: boolean;
    displayName?: string | null;
    passwordHash?: string | null;
    passwordSalt?: string | null;
    role?: Role;
    status?: AccountStatus;
    preferredLanguage?: string;
    preferredTimezone?: string;
    walletBalance?: number;
  }): Promise<UserRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const u = await this.prisma.user.create({
          data: {
            ...(userData.id ? { id: userData.id } : {}),
            phone: userData.phone || null,
            email: userData.email ? userData.email.trim().toLowerCase() : null,
            phoneVerified: userData.phoneVerified || false,
            emailVerified: userData.emailVerified || false,
            displayName: userData.displayName || (userData.email ? userData.email.split('@')[0] : `User_${userData.phone?.slice(-4) || 'Astro'}`),
            passwordHash: userData.passwordHash || null,
            passwordSalt: userData.passwordSalt || null,
            role: userData.role || Role.USER,
            status: userData.status || AccountStatus.ACTIVE,
            preferredLanguage: userData.preferredLanguage || 'en',
            preferredTimezone: userData.preferredTimezone || 'Asia/Kolkata',
            walletBalance: userData.walletBalance != null ? userData.walletBalance : 0.00,
            lastLoginAt: new Date()
          }
        });
        const mapped = this.mapPrismaUser(u);
        this.data.users.push(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB] createUser Prisma error:', err?.message || err);
        throw err;
      }
    }

    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: userData.id || ('usr_' + crypto.randomBytes(8).toString('hex')),
      phone: userData.phone || null,
      email: userData.email ? userData.email.trim().toLowerCase() : null,
      phoneVerified: userData.phoneVerified || false,
      emailVerified: userData.emailVerified || false,
      displayName: userData.displayName || (userData.email ? userData.email.split('@')[0] : `User_${userData.phone?.slice(-4) || 'Astro'}`),
      passwordHash: userData.passwordHash || null,
      passwordSalt: userData.passwordSalt || null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      role: userData.role || Role.USER,
      status: userData.status || AccountStatus.ACTIVE,
      preferredLanguage: userData.preferredLanguage || 'en',
      preferredTimezone: userData.preferredTimezone || 'Asia/Kolkata',
      walletBalance: userData.walletBalance != null ? userData.walletBalance : 0.00,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now
    };
    this.data.users.push(newUser);
    this.saveToFile();
    return newUser;
  }

  async syncSupabaseUser(supabaseUser: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: any;
  }): Promise<UserRecord> {
    const cleanEmail = supabaseUser.email ? supabaseUser.email.trim().toLowerCase() : null;
    const cleanPhone = supabaseUser.phone ? supabaseUser.phone.trim() : null;
    const meta = supabaseUser.user_metadata || {};
    const name = meta.displayName || meta.full_name || meta.name || (cleanEmail ? cleanEmail.split('@')[0] : 'User');

    // 1. Check by ID (UUID from Supabase)
    let user = await this.findUserById(supabaseUser.id);

    // 2. Fall back to email
    if (!user && cleanEmail) {
      user = await this.findUserByIdentifier(cleanEmail);
    }

    // 3. Fall back to phone
    if (!user && cleanPhone) {
      user = await this.findUserByIdentifier(cleanPhone);
    }

    if (!user) {
      user = await this.createUser({
        id: supabaseUser.id,
        email: cleanEmail,
        phone: cleanPhone,
        emailVerified: Boolean(cleanEmail),
        phoneVerified: Boolean(cleanPhone),
        displayName: name,
        role: Role.USER,
        status: AccountStatus.ACTIVE,
        walletBalance: 0.00
      });
    } else {
      const updates: Partial<UserRecord> = {
        lastLoginAt: new Date().toISOString(),
        emailVerified: cleanEmail ? true : user.emailVerified
      };
      if (!user.displayName && name) {
        updates.displayName = name;
      }
      user = await this.updateUser(user.id, updates);
    }

    return user;
  }

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const dataToUpdate: any = { ...updates };
        delete dataToUpdate.id;
        delete dataToUpdate.createdAt;
        delete dataToUpdate.updatedAt;
        if (dataToUpdate.lastLoginAt && typeof dataToUpdate.lastLoginAt === 'string') {
          dataToUpdate.lastLoginAt = new Date(dataToUpdate.lastLoginAt);
        }
        if (dataToUpdate.resetTokenExpiresAt && typeof dataToUpdate.resetTokenExpiresAt === 'string') {
          dataToUpdate.resetTokenExpiresAt = new Date(dataToUpdate.resetTokenExpiresAt);
        }
        const u = await this.prisma.user.update({
          where: { id },
          data: dataToUpdate
        });
        const mapped = this.mapPrismaUser(u);
        const idx = this.data.users.findIndex(x => x.id === id);
        if (idx !== -1) this.data.users[idx] = mapped;
        return mapped;
      } catch (err: any) {
        console.error('[DB] updateUser Prisma error:', err?.message || err);
        throw err;
      }
    }

    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('USER_NOT_FOUND');
    const updated = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.users[idx] = updated;
    this.saveToFile();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.user.delete({ where: { id } });
        const idx = this.data.users.findIndex(u => u.id === id);
        if (idx !== -1) this.data.users.splice(idx, 1);
        this.data.sessions = this.data.sessions.filter(s => s.userId !== id);
        this.data.birthProfiles = this.data.birthProfiles.filter(p => p.userId !== id);
        this.data.savedReports = this.data.savedReports.filter(r => r.userId !== id);
        return true;
      } catch (err: any) {
        console.error('[DB] deleteUser Prisma error:', err?.message || err);
        return false;
      }
    }

    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    // Cascade cleanup
    this.data.sessions = this.data.sessions.filter(s => s.userId !== id);
    this.data.birthProfiles = this.data.birthProfiles.filter(p => p.userId !== id);
    this.data.savedReports = this.data.savedReports.filter(r => r.userId !== id);
    this.saveToFile();
    return true;
  }

  async listUsers(options?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: UserRecord[]; total: number; page: number; limit: number }> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const where: any = {};
        if (options?.role && options.role !== 'ALL') where.role = options.role;
        if (options?.status && options.status !== 'ALL') where.status = options.status;
        if (options?.search) {
          where.OR = [
            { displayName: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
            { phone: { contains: options.search } }
          ];
        }
        const total = await this.prisma.user.count({ where });
        const page = Math.max(1, options?.page || 1);
        const limit = Math.max(1, options?.limit || 20);
        const skip = (page - 1) * limit;
        const rows = await this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
        return { users: rows.map((r: any) => this.mapPrismaUser(r)), total, page, limit };
      } catch (err: any) {
        console.error('[DB] listUsers Prisma error:', err?.message || err);
      }
    }

    let result = [...this.data.users];
    if (options?.role && options.role !== 'ALL') {
      result = result.filter(u => u.role === options.role);
    }
    if (options?.status && options.status !== 'ALL') {
      result = result.filter(u => u.status === options.status);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(u => 
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        u.id.includes(q)
      );
    }
    const total = result.length;
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 20);
    const start = (page - 1) * limit;
    const users = result.slice(start, start + limit);
    return { users, total, page, limit };
  }

  // ==================== SESSIONS & TOKEN ====================

  async createSession(sessionData: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<UserSessionRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const s = await this.prisma.userSession.create({
          data: {
            userId: sessionData.userId,
            tokenHash: sessionData.tokenHash,
            expiresAt: sessionData.expiresAt,
            ipAddress: sessionData.ipAddress || null,
            userAgent: sessionData.userAgent || null
          }
        });
        const mapped = this.mapPrismaSession(s);
        this.data.sessions.push(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB] createSession Prisma error:', err?.message || err);
        throw err;
      }
    }

    const session: UserSessionRecord = {
      id: 'sess_' + crypto.randomBytes(8).toString('hex'),
      userId: sessionData.userId,
      tokenHash: sessionData.tokenHash,
      expiresAt: sessionData.expiresAt.toISOString(),
      ipAddress: sessionData.ipAddress || null,
      userAgent: sessionData.userAgent || null,
      createdAt: new Date().toISOString()
    };
    this.data.sessions.push(session);
    this.saveToFile();
    return session;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<UserSessionRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const s = await this.prisma.userSession.findUnique({
          where: { tokenHash }
        });
        if (!s) return null;
        if (new Date(s.expiresAt).getTime() < Date.now()) {
          await this.deleteSession(tokenHash);
          return null;
        }
        return this.mapPrismaSession(s);
      } catch (err: any) {
        console.error('[DB] findSessionByTokenHash Prisma error:', err?.message || err);
      }
    }

    const s = this.data.sessions.find(x => x.tokenHash === tokenHash);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      this.deleteSession(tokenHash);
      return null;
    }
    return s;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.userSession.deleteMany({ where: { tokenHash } });
      } catch (err: any) {
        console.error('[DB] deleteSession Prisma error:', err?.message || err);
      }
    }

    this.data.sessions = this.data.sessions.filter(s => s.tokenHash !== tokenHash);
    this.saveToFile();
  }

  async deleteUserSessions(userId: string): Promise<void> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.userSession.deleteMany({ where: { userId } });
      } catch (err: any) {
        console.error('[DB] deleteUserSessions Prisma error:', err?.message || err);
      }
    }

    this.data.sessions = this.data.sessions.filter(s => s.userId !== userId);
    this.saveToFile();
  }

  // ==================== AUDIT EVENTS ====================

  async recordAuditEvent(event: {
    userId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    metadata?: any;
    ipAddress?: string | null;
  }): Promise<AuditEventRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const a = await this.prisma.auditEvent.create({
          data: {
            userId: event.userId || null,
            action: event.action,
            targetType: event.targetType || null,
            targetId: event.targetId || null,
            metadata: event.metadata || null,
            ipAddress: event.ipAddress || null
          }
        });
        const mapped: AuditEventRecord = {
          id: a.id,
          userId: a.userId,
          action: a.action,
          targetType: a.targetType,
          targetId: a.targetId,
          metadata: a.metadata,
          ipAddress: a.ipAddress,
          createdAt: a.createdAt.toISOString()
        };
        this.data.auditEvents.unshift(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB] recordAuditEvent Prisma error:', err?.message || err);
      }
    }

    const record: AuditEventRecord = {
      id: 'aud_' + crypto.randomBytes(8).toString('hex'),
      userId: event.userId || null,
      action: event.action,
      targetType: event.targetType || null,
      targetId: event.targetId || null,
      metadata: event.metadata || null,
      ipAddress: event.ipAddress || null,
      createdAt: new Date().toISOString()
    };
    this.data.auditEvents.unshift(record);
    // Keep max 1000 events in store
    if (this.data.auditEvents.length > 1000) {
      this.data.auditEvents = this.data.auditEvents.slice(0, 1000);
    }
    this.saveToFile();
    return record;
  }

  async listAuditEvents(options?: {
    userId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: AuditEventRecord[]; total: number }> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const where: any = {};
        if (options?.userId) where.userId = options.userId;
        if (options?.action) where.action = options.action;
        const total = await this.prisma.auditEvent.count({ where });
        const page = Math.max(1, options?.page || 1);
        const limit = Math.max(1, options?.limit || 50);
        const skip = (page - 1) * limit;
        const rows = await this.prisma.auditEvent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
        return {
          events: rows.map((a: any) => ({
            id: a.id,
            userId: a.userId,
            action: a.action,
            targetType: a.targetType,
            targetId: a.targetId,
            metadata: a.metadata,
            ipAddress: a.ipAddress,
            createdAt: a.createdAt.toISOString()
          })),
          total
        };
      } catch (err: any) {
        console.error('[DB] listAuditEvents Prisma error:', err?.message || err);
      }
    }

    let result = [...this.data.auditEvents];
    if (options?.userId) {
      result = result.filter(e => e.userId === options.userId);
    }
    if (options?.action) {
      result = result.filter(e => e.action === options.action);
    }
    const total = result.length;
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, options?.limit || 50);
    const start = (page - 1) * limit;
    return { events: result.slice(start, start + limit), total };
  }

  // ==================== BIRTH PROFILES ====================

  async createProfile(data: {
    userId: string;
    profileName: string;
    relationship?: string;
    dateOfBirth: string;
    timeOfBirth: string;
    birthplaceName: string;
    latitude: number;
    longitude: number;
    resolvedTimezone?: string;
  }): Promise<BirthProfileRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const trimmedName = data.profileName.trim();
        const existing = await this.prisma.birthProfile.findFirst({
          where: {
            userId: data.userId,
            profileName: trimmedName,
            timeOfBirth: data.timeOfBirth
          }
        });
        if (existing) {
          return this.mapPrismaProfile(existing);
        }

        const created = await this.prisma.birthProfile.create({
          data: {
            userId: data.userId,
            profileName: trimmedName,
            relationship: data.relationship || 'Self',
            dateOfBirth: new Date(data.dateOfBirth),
            timeOfBirth: data.timeOfBirth,
            birthTimeKnown: true,
            birthplaceName: data.birthplaceName.trim(),
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            resolvedTimezone: data.resolvedTimezone || 'Asia/Kolkata'
          }
        });
        const mapped = this.mapPrismaProfile(created);
        this.data.birthProfiles.unshift(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB] createProfile Prisma error:', err?.message || err);
        throw err;
      }
    }

    const trimmedName = data.profileName.trim();
    // Atomic uniqueness and idempotency check (prevents concurrency race conditions)
    const existing = this.data.birthProfiles.find(p =>
      p.userId === data.userId &&
      p.dateOfBirth === data.dateOfBirth &&
      p.timeOfBirth === data.timeOfBirth &&
      p.profileName.toLowerCase() === trimmedName.toLowerCase() &&
      Math.abs(Number(p.latitude) - Number(data.latitude)) < 0.001 &&
      Math.abs(Number(p.longitude) - Number(data.longitude)) < 0.001
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const profile: BirthProfileRecord = {
      id: 'prof_' + crypto.randomBytes(8).toString('hex'),
      userId: data.userId,
      profileName: trimmedName,
      relationship: data.relationship || 'Self',
      dateOfBirth: data.dateOfBirth,
      timeOfBirth: data.timeOfBirth,
      birthTimeKnown: true,
      birthplaceName: data.birthplaceName.trim(),
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      resolvedTimezone: data.resolvedTimezone || 'Asia/Kolkata',
      createdAt: now,
      updatedAt: now
    };
    this.data.birthProfiles.unshift(profile);
    this.saveToFile();
    return profile;
  }

  async getProfilesByUserId(userId: string): Promise<BirthProfileRecord[]> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const list = await this.prisma.birthProfile.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        return list.map((p: any) => this.mapPrismaProfile(p));
      } catch (err: any) {
        console.error('[DB] getProfilesByUserId Prisma error:', err?.message || err);
      }
    }
    return this.data.birthProfiles.filter(p => p.userId === userId);
  }

  async getProfileById(id: string): Promise<BirthProfileRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const p = await this.prisma.birthProfile.findUnique({ where: { id } });
        return p ? this.mapPrismaProfile(p) : null;
      } catch (err: any) {
        console.error('[DB] getProfileById Prisma error:', err?.message || err);
      }
    }
    return this.data.birthProfiles.find(p => p.id === id) || null;
  }

  async updateProfile(id: string, updates: Partial<BirthProfileRecord>): Promise<BirthProfileRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const dataToUpdate: any = { ...updates };
        delete dataToUpdate.id;
        delete dataToUpdate.userId;
        delete dataToUpdate.createdAt;
        delete dataToUpdate.updatedAt;
        if (dataToUpdate.dateOfBirth && typeof dataToUpdate.dateOfBirth === 'string') {
          dataToUpdate.dateOfBirth = new Date(dataToUpdate.dateOfBirth);
        }
        const updated = await this.prisma.birthProfile.update({
          where: { id },
          data: dataToUpdate
        });
        const mapped = this.mapPrismaProfile(updated);
        const idx = this.data.birthProfiles.findIndex(p => p.id === id);
        if (idx !== -1) this.data.birthProfiles[idx] = mapped;
        return mapped;
      } catch (err: any) {
        console.error('[DB] updateProfile Prisma error:', err?.message || err);
        throw err;
      }
    }

    const idx = this.data.birthProfiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('PROFILE_NOT_FOUND');
    const updated = {
      ...this.data.birthProfiles[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.birthProfiles[idx] = updated;
    this.saveToFile();
    return updated;
  }

  async deleteProfile(id: string): Promise<boolean> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.birthProfile.delete({ where: { id } });
        const idx = this.data.birthProfiles.findIndex(p => p.id === id);
        if (idx !== -1) this.data.birthProfiles.splice(idx, 1);
        return true;
      } catch (err: any) {
        console.error('[DB] deleteProfile Prisma error:', err?.message || err);
        return false;
      }
    }

    const idx = this.data.birthProfiles.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.birthProfiles.splice(idx, 1);
    this.saveToFile();
    return true;
  }

  // ==================== SAVED REPORTS ====================

  async createSavedReport(data: {
    userId: string;
    title: string;
    reportType: string;
    payload: any;
  }): Promise<SavedReportRecord> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const created = await this.prisma.savedReport.create({
          data: {
            userId: data.userId,
            title: data.title,
            reportType: data.reportType,
            payload: data.payload
          }
        });
        const mapped = this.mapPrismaReport(created);
        this.data.savedReports.unshift(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB] createSavedReport Prisma error:', err?.message || err);
        throw err;
      }
    }

    const report: SavedReportRecord = {
      id: 'rep_' + crypto.randomBytes(8).toString('hex'),
      userId: data.userId,
      title: data.title,
      reportType: data.reportType,
      payload: data.payload,
      createdAt: new Date().toISOString()
    };
    this.data.savedReports.unshift(report);
    this.saveToFile();
    return report;
  }

  async getSavedReportsByUserId(userId: string): Promise<SavedReportRecord[]> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const list = await this.prisma.savedReport.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        return list.map((r: any) => this.mapPrismaReport(r));
      } catch (err: any) {
        console.error('[DB] getSavedReportsByUserId Prisma error:', err?.message || err);
      }
    }
    return this.data.savedReports.filter(r => r.userId === userId);
  }

  async getSavedReportById(id: string): Promise<SavedReportRecord | null> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const r = await this.prisma.savedReport.findUnique({ where: { id } });
        return r ? this.mapPrismaReport(r) : null;
      } catch (err: any) {
        console.error('[DB] getSavedReportById Prisma error:', err?.message || err);
      }
    }
    return this.data.savedReports.find(r => r.id === id) || null;
  }

  async deleteSavedReport(id: string): Promise<boolean> {
    this.assertDurableStorage();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.savedReport.delete({ where: { id } });
        const idx = this.data.savedReports.findIndex(r => r.id === id);
        if (idx !== -1) this.data.savedReports.splice(idx, 1);
        return true;
      } catch (err: any) {
        console.error('[DB] deleteSavedReport Prisma error:', err?.message || err);
        return false;
      }
    }

    const idx = this.data.savedReports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.data.savedReports.splice(idx, 1);
    this.saveToFile();
    return true;
  }

  // ==================== WALLET & LEDGER ====================

  findPaymentOrderByRazorpayId(razorpayOrderId: string): PaymentOrderRecord | null {
    return this.data.paymentOrders.find(o => o.razorpayOrderId === razorpayOrderId) || null;
  }

  getUserPaymentOrders(userId: string): PaymentOrderRecord[] {
    return this.data.paymentOrders
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  isPaymentIdUsed(paymentId: string, excludeOrderId?: string): boolean {
    const usedInOrders = this.data.paymentOrders.some(
      o => o.razorpayPaymentId === paymentId && o.razorpayOrderId !== excludeOrderId
    );
    if (usedInOrders) return true;

    const usedInLedger = this.data.walletLedgers.some(
      l => l.referenceId === paymentId || l.idempotencyKey === `RECHARGE_${paymentId}`
    );
    return usedInLedger;
  }

  async rechargeWallet(userId: string, amount: number, paymentId: string, orderId: string): Promise<UserRecord> {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const order = this.data.paymentOrders.find(o => o.razorpayOrderId === orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }
    if (order.userId !== userId) {
      throw new Error('ORDER_USER_MISMATCH');
    }
    if (Math.round(order.amount * 100) !== Math.round(amount * 100)) {
      throw new Error('AMOUNT_MISMATCH');
    }

    // Idempotency check: has this payment already been credited?
    const existingLedger = this.data.walletLedgers.find(
      l => l.idempotencyKey === `RECHARGE_${paymentId}` || l.referenceId === paymentId
    );
    if (existingLedger) {
      // Payment already settled idempotently, return current user state without double crediting
      return user;
    }

    if (order.status === OrderStatus.PAID && order.razorpayPaymentId === paymentId) {
      return user;
    }

    if (order.status === OrderStatus.PAID && order.razorpayPaymentId !== paymentId) {
      throw new Error('ORDER_ALREADY_PAID_DIFFERENT_PAYMENT');
    }

    // Unique payment identifier check
    if (this.isPaymentIdUsed(paymentId, orderId)) {
      throw new Error('PAYMENT_ID_ALREADY_USED');
    }

    // If PostgreSQL Prisma is active, execute ACID transaction
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgUpdatedUser = await this.prisma.$transaction(async (tx: any) => {
          const pgOrder = await tx.paymentOrder.findUnique({
            where: { razorpayOrderId: orderId }
          });
          if (!pgOrder) throw new Error('ORDER_NOT_FOUND');
          if (pgOrder.userId !== userId) throw new Error('ORDER_USER_MISMATCH');
          if (Math.round(Number(pgOrder.amount) * 100) !== Math.round(amount * 100)) throw new Error('AMOUNT_MISMATCH');

          await tx.paymentOrder.update({
            where: { razorpayOrderId: orderId },
            data: {
              status: OrderStatus.PAID,
              razorpayPaymentId: paymentId
            }
          });

          await tx.walletLedger.create({
            data: {
              userId,
              amount,
              entryType: EntryType.WALLET_RECHARGE,
              idempotencyKey: `RECHARGE_${paymentId}`,
              referenceId: paymentId,
              description: `Wallet recharge of ₹${order.amount.toFixed(2)} via Razorpay (${paymentId})`
            }
          });

          const updated = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { increment: amount } }
          });

          return this.mapPrismaUser(updated);
        });

        order.status = OrderStatus.PAID;
        order.razorpayPaymentId = paymentId;
        user.walletBalance = pgUpdatedUser.walletBalance;
        return pgUpdatedUser;
      } catch (err: any) {
        if (err.message?.includes('Unique constraint failed') && err.message?.includes('idempotencyKey')) {
          return user;
        }
        throw err;
      }
    }

    // Atomic mutation of state
    order.status = OrderStatus.PAID;
    order.razorpayPaymentId = paymentId;
    order.updatedAt = new Date().toISOString();

    const newBal = Math.round((user.walletBalance + order.amount) * 100) / 100;
    user.walletBalance = newBal;
    user.updatedAt = new Date().toISOString();

    this.data.walletLedgers.unshift({
      id: 'led_' + crypto.randomBytes(8).toString('hex'),
      userId,
      astrologerId: null,
      amount: order.amount,
      entryType: EntryType.WALLET_RECHARGE,
      idempotencyKey: `RECHARGE_${paymentId}`,
      referenceId: paymentId,
      description: `Wallet recharge of ₹${order.amount.toFixed(2)} via Razorpay (${paymentId})`,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return user;
  }

  async settleConsultation(userId: string, astrologerId: string, sessionId: string, totalDeduction: number) {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const astro = this.data.astrologers.find(a => a.id === astrologerId);
    if (!astro) throw new Error('ASTROLOGER_NOT_FOUND');

    if (typeof totalDeduction !== 'number' || !Number.isFinite(totalDeduction) || totalDeduction <= 0) {
      throw new Error('INVALID_DEDUCTION');
    }

    // Enforce unique settlement idempotency key
    const existingDebit = this.data.walletLedgers.find(
      l => l.idempotencyKey === `DEBIT_${sessionId}` || l.referenceId === sessionId
    );
    if (existingDebit) {
      const settledAmount = Math.abs(existingDebit.amount);
      const settledAstroShare = Math.round(settledAmount * 0.60 * 100) / 100;
      const settledPlatformShare = Math.round((settledAmount - settledAstroShare) * 100) / 100;
      return {
        status: 'ALREADY_SETTLED',
        sessionId,
        totalDeduction: settledAmount,
        astroShare: settledAstroShare,
        platformShare: settledPlatformShare,
        newBalance: user.walletBalance,
        alreadySettled: true
      };
    }

    if (user.walletBalance < totalDeduction) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // If PostgreSQL Prisma is active, execute ACID transaction
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgSettlement = await this.prisma.$transaction(async (tx: any) => {
          const pgUser = await tx.user.findUnique({ where: { id: userId } });
          if (!pgUser) throw new Error('USER_NOT_FOUND');
          if (Number(pgUser.walletBalance) < totalDeduction) throw new Error('INSUFFICIENT_FUNDS');

          const pgAstro = await tx.astrologer.findUnique({ where: { id: astrologerId } });
          if (!pgAstro) throw new Error('ASTROLOGER_NOT_FOUND');

          const astroShare = Math.round(totalDeduction * 0.60 * 100) / 100;
          const platformShare = Math.round((totalDeduction - astroShare) * 100) / 100;

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { decrement: totalDeduction } }
          });

          await tx.astrologer.update({
            where: { id: astrologerId },
            data: {
              pendingPayout: { increment: astroShare },
              ordersCount: { increment: 1 }
            }
          });

          await tx.walletLedger.create({
            data: {
              userId,
              astrologerId,
              amount: -totalDeduction,
              entryType: EntryType.CONSULTATION_DEBIT,
              idempotencyKey: `DEBIT_${sessionId}`,
              referenceId: sessionId,
              description: `Consultation session with ${pgAstro.name}`
            }
          });

          await tx.walletLedger.create({
            data: {
              userId: null,
              astrologerId,
              amount: astroShare,
              entryType: EntryType.ASTROLOGER_CREDIT,
              idempotencyKey: `CREDIT_ASTRO_${sessionId}`,
              referenceId: sessionId,
              description: `Astrologer earnings share for session ${sessionId}`
            }
          });

          return {
            status: 'SETTLED',
            sessionId,
            totalDeduction,
            astroShare,
            platformShare,
            newBalance: Number(updatedUser.walletBalance)
          };
        });

        user.walletBalance = pgSettlement.newBalance;
        astro.pendingPayout = Math.round((astro.pendingPayout + pgSettlement.astroShare) * 100) / 100;
        astro.ordersCount += 1;
        return pgSettlement;
      } catch (err: any) {
        if (err.message?.includes('Unique constraint failed') && err.message?.includes('idempotencyKey')) {
          return {
            status: 'ALREADY_SETTLED',
            sessionId,
            totalDeduction,
            astroShare: Math.round(totalDeduction * 0.60 * 100) / 100,
            platformShare: Math.round(totalDeduction * 0.40 * 100) / 100,
            newBalance: user.walletBalance,
            alreadySettled: true
          };
        }
        throw err;
      }
    }

    const astroShare = Math.round(totalDeduction * 0.60 * 100) / 100;
    const platformShare = Math.round((totalDeduction - astroShare) * 100) / 100;

    user.walletBalance = Math.round((user.walletBalance - totalDeduction) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    astro.pendingPayout = Math.round((astro.pendingPayout + astroShare) * 100) / 100;
    astro.ordersCount += 1;
    astro.updatedAt = new Date().toISOString();

    this.data.walletLedgers.unshift({
      id: 'led_' + crypto.randomBytes(8).toString('hex'),
      userId,
      astrologerId,
      amount: -totalDeduction,
      entryType: EntryType.CONSULTATION_DEBIT,
      idempotencyKey: `DEBIT_${sessionId}`,
      referenceId: sessionId,
      description: `Consultation session with ${astro.name}`,
      createdAt: new Date().toISOString()
    });

    this.data.walletLedgers.unshift({
      id: 'led_' + crypto.randomBytes(8).toString('hex'),
      userId: null,
      astrologerId,
      amount: astroShare,
      entryType: EntryType.ASTROLOGER_CREDIT,
      idempotencyKey: `CREDIT_ASTRO_${sessionId}`,
      referenceId: sessionId,
      description: `Astrologer earnings share for session ${sessionId}`,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      status: 'SETTLED',
      sessionId,
      totalDeduction,
      astroShare,
      platformShare,
      newBalance: user.walletBalance
    };
  }

  async getWalletStatement(userId: string): Promise<WalletLedgerRecord[]> {
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgLedgers = await this.prisma.walletLedger.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });
        return pgLedgers.map((l: any) => ({
          id: l.id,
          userId: l.userId,
          astrologerId: l.astrologerId,
          amount: Number(l.amount),
          entryType: l.entryType,
          idempotencyKey: l.idempotencyKey,
          referenceId: l.referenceId,
          description: l.description,
          createdAt: l.createdAt.toISOString()
        }));
      } catch (err: any) {
        console.error('[DB] Failed to fetch wallet statement from Postgres:', err?.message || err);
      }
    }
    return this.data.walletLedgers.filter(l => l.userId === userId);
  }

  async createPaymentOrder(data: {
    userId: string;
    amount: number;
    currency?: string;
    razorpayOrderId: string;
  }): Promise<PaymentOrderRecord> {
    this.assertDurableStorage();
    const existing = this.data.paymentOrders.find(o => o.razorpayOrderId === data.razorpayOrderId);
    if (existing) return existing;

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgOrder = await this.prisma.paymentOrder.upsert({
          where: { razorpayOrderId: data.razorpayOrderId },
          create: {
            userId: data.userId,
            amount: data.amount,
            currency: data.currency || 'INR',
            razorpayOrderId: data.razorpayOrderId,
            status: OrderStatus.CREATED
          },
          update: {}
        });
        const mapped = this.mapPrismaPaymentOrder(pgOrder);
        this.data.paymentOrders.unshift(mapped);
        return mapped;
      } catch (err: any) {
        console.error('[DB] Failed to create payment order in Postgres:', err?.message || err);
      }
    }

    const order: PaymentOrderRecord = {
      id: 'ord_' + crypto.randomBytes(8).toString('hex'),
      userId: data.userId,
      amount: data.amount,
      currency: data.currency || 'INR',
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: null,
      status: OrderStatus.CREATED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.paymentOrders.unshift(order);
    this.saveToFile();
    return order;
  }

  async unlockReport(userId: string, reportType: string, referenceId?: string, clientKey?: string): Promise<{
    success: boolean;
    alreadyUnlocked?: boolean;
    newBalance: number;
    deduction: number;
    transactionId: string;
  }> {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const UNLOCK_FEE = 49.00;
    const ref = referenceId || 'default';
    const idemKey = clientKey || `UNLOCK_${userId}_${reportType}_${ref}`;

    // Idempotency check: has this report already been unlocked?
    const existing = this.data.walletLedgers.find(
      l => l.idempotencyKey === idemKey || (l.referenceId === idemKey && l.entryType === EntryType.STORE_PURCHASE)
    );
    if (existing) {
      return {
        success: true,
        alreadyUnlocked: true,
        newBalance: user.walletBalance,
        deduction: 0,
        transactionId: existing.id
      };
    }

    if (user.walletBalance < UNLOCK_FEE) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgResult = await this.prisma.$transaction(async (tx: any) => {
          const pgUser = await tx.user.findUnique({ where: { id: userId } });
          if (!pgUser) throw new Error('USER_NOT_FOUND');
          if (Number(pgUser.walletBalance) < UNLOCK_FEE) throw new Error('INSUFFICIENT_FUNDS');

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { decrement: UNLOCK_FEE } }
          });

          const ledger = await tx.walletLedger.create({
            data: {
              userId,
              amount: -UNLOCK_FEE,
              entryType: EntryType.STORE_PURCHASE,
              idempotencyKey: idemKey,
              referenceId: ref,
              description: `Unlock Premium Report: ${reportType}`
            }
          });

          return {
            success: true,
            newBalance: Number(updatedUser.walletBalance),
            deduction: UNLOCK_FEE,
            transactionId: ledger.id
          };
        });

        user.walletBalance = pgResult.newBalance;
        return pgResult;
      } catch (err: any) {
        if (err.message?.includes('Unique constraint failed') && err.message?.includes('idempotencyKey')) {
          return {
            success: true,
            alreadyUnlocked: true,
            newBalance: user.walletBalance,
            deduction: 0,
            transactionId: idemKey
          };
        }
        throw err;
      }
    }

    user.walletBalance = Math.round((user.walletBalance - UNLOCK_FEE) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const ledgerId = 'led_' + crypto.randomBytes(8).toString('hex');
    this.data.walletLedgers.unshift({
      id: ledgerId,
      userId,
      astrologerId: null,
      amount: -UNLOCK_FEE,
      entryType: EntryType.STORE_PURCHASE,
      idempotencyKey: idemKey,
      referenceId: ref,
      description: `Unlock Premium Report: ${reportType}`,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      success: true,
      newBalance: user.walletBalance,
      deduction: UNLOCK_FEE,
      transactionId: ledgerId
    };
  }

  async bookPuja(userId: string, pujaName: string, amount: number, referenceId?: string, clientKey?: string) {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const cleanPujaName = (pujaName || '').trim();
    if (!cleanPujaName) {
      throw new Error('PUJA_NAME_REQUIRED');
    }

    const ref = referenceId || `puja_${Date.now()}`;
    const idemKey = clientKey || `PUJA_${userId}_${cleanPujaName.replace(/\s+/g, '_')}_${ref}`;

    // Enforce idempotency
    const existing = this.data.walletLedgers.find(l => l.idempotencyKey === idemKey);
    if (existing) {
      return {
        success: true,
        alreadyBooked: true,
        newBalance: user.walletBalance,
        deduction: 0,
        transactionId: existing.id,
        pujaName: cleanPujaName
      };
    }

    if (user.walletBalance < amount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgResult = await this.prisma.$transaction(async (tx: any) => {
          const pgUser = await tx.user.findUnique({ where: { id: userId } });
          if (!pgUser) throw new Error('USER_NOT_FOUND');
          if (Number(pgUser.walletBalance) < amount) throw new Error('INSUFFICIENT_FUNDS');

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { decrement: amount } }
          });

          const ledger = await tx.walletLedger.create({
            data: {
              userId,
              amount: -amount,
              entryType: EntryType.STORE_PURCHASE,
              idempotencyKey: idemKey,
              referenceId: ref,
              description: `Vedic Puja Booking: ${cleanPujaName}`
            }
          });

          return {
            success: true,
            newBalance: Number(updatedUser.walletBalance),
            deduction: amount,
            transactionId: ledger.id,
            pujaName: cleanPujaName
          };
        });

        user.walletBalance = pgResult.newBalance;
        return pgResult;
      } catch (err: any) {
        if (err.message?.includes('Unique constraint failed') && err.message?.includes('idempotencyKey')) {
          return {
            success: true,
            alreadyBooked: true,
            newBalance: user.walletBalance,
            deduction: 0,
            transactionId: idemKey,
            pujaName: cleanPujaName
          };
        }
        throw err;
      }
    }

    user.walletBalance = Math.round((user.walletBalance - amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const ledgerId = 'led_' + crypto.randomBytes(8).toString('hex');
    this.data.walletLedgers.unshift({
      id: ledgerId,
      userId,
      astrologerId: null,
      amount: -amount,
      entryType: EntryType.STORE_PURCHASE,
      idempotencyKey: idemKey,
      referenceId: ref,
      description: `Vedic Puja Booking: ${cleanPujaName}`,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      success: true,
      newBalance: user.walletBalance,
      deduction: amount,
      transactionId: ledgerId,
      pujaName: cleanPujaName
    };
  }

  async purchaseReport(userId: string, reportTitle: string, amount: number, profileId?: string, clientKey?: string) {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const cleanTitle = (reportTitle || 'Personalized Astrological Report').trim();
    const ref = profileId || `rep_${Date.now()}`;
    const idemKey = clientKey || `REPORT_${userId}_${cleanTitle.replace(/\s+/g, '_')}_${ref}`;

    // Enforce idempotency
    const existing = this.data.walletLedgers.find(l => l.idempotencyKey === idemKey);
    if (existing) {
      return {
        success: true,
        alreadyPurchased: true,
        newBalance: user.walletBalance,
        deduction: 0,
        transactionId: existing.id,
        reportTitle: cleanTitle
      };
    }

    if (user.walletBalance < amount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    if (this.isPostgresAvailable && this.prisma) {
      try {
        const pgResult = await this.prisma.$transaction(async (tx: any) => {
          const pgUser = await tx.user.findUnique({ where: { id: userId } });
          if (!pgUser) throw new Error('USER_NOT_FOUND');
          if (Number(pgUser.walletBalance) < amount) throw new Error('INSUFFICIENT_FUNDS');

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { decrement: amount } }
          });

          const ledger = await tx.walletLedger.create({
            data: {
              userId,
              amount: -amount,
              entryType: EntryType.STORE_PURCHASE,
              idempotencyKey: idemKey,
              referenceId: ref,
              description: `Report Purchase: ${cleanTitle}`
            }
          });

          return {
            success: true,
            newBalance: Number(updatedUser.walletBalance),
            deduction: amount,
            transactionId: ledger.id,
            reportTitle: cleanTitle
          };
        });

        user.walletBalance = pgResult.newBalance;
        return pgResult;
      } catch (err: any) {
        if (err.message?.includes('Unique constraint failed') && err.message?.includes('idempotencyKey')) {
          return {
            success: true,
            alreadyPurchased: true,
            newBalance: user.walletBalance,
            deduction: 0,
            transactionId: idemKey,
            reportTitle: cleanTitle
          };
        }
        throw err;
      }
    }

    user.walletBalance = Math.round((user.walletBalance - amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const ledgerId = 'led_' + crypto.randomBytes(8).toString('hex');
    this.data.walletLedgers.unshift({
      id: ledgerId,
      userId,
      astrologerId: null,
      amount: -amount,
      entryType: EntryType.STORE_PURCHASE,
      idempotencyKey: idemKey,
      referenceId: ref,
      description: `Report Purchase: ${cleanTitle}`,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      success: true,
      newBalance: user.walletBalance,
      deduction: amount,
      transactionId: ledgerId,
      reportTitle: cleanTitle
    };
  }

  // ============================================================================
  // DEMO MODE ISOLATED FINANCIAL OPERATIONS (SIMULATION ONLY - NO REAL MONEY)
  // ============================================================================

  async addDemoCredits(userId: string, amount: number) {
    if (!isDemoModeActive()) {
      throw new Error('DEMO_MODE_DISABLED');
    }
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      throw new Error('INVALID_DEMO_AMOUNT');
    }

    // Isolate demo wallet balance: real walletBalance is completely untouched!
    user.demoWalletBalance = Math.round(((user.demoWalletBalance || 0) + amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const ledgerId = 'demo_led_' + crypto.randomBytes(8).toString('hex');
    const idemKey = `DEMO_CREDIT_${userId}_${amount}_${Date.now()}`;
    this.data.walletLedgers.unshift({
      id: ledgerId,
      userId,
      astrologerId: null,
      amount,
      entryType: EntryType.DEMO_CREDIT,
      idempotencyKey: idemKey,
      referenceId: `demo_cred_${Date.now()}`,
      description: `[DEMO SIMULATION] Added ₹${amount.toFixed(2)} Test Credits (No Cash Value)`,
      isDemo: true,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      success: true,
      newDemoBalance: user.demoWalletBalance,
      addedAmount: amount,
      transactionId: ledgerId,
      isDemo: true
    };
  }

  async purchaseReportWithDemo(userId: string, reportTitle: string, amount: number, profileId?: string, clientKey?: string) {
    if (!isDemoModeActive()) {
      throw new Error('DEMO_MODE_DISABLED');
    }
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const cleanTitle = (reportTitle || 'Personalized Astrological Report').trim();
    const ref = profileId || `demo_rep_${Date.now()}`;
    const idemKey = clientKey || `DEMO_REPORT_${userId}_${cleanTitle.replace(/\s+/g, '_')}_${ref}`;

    // Enforce idempotency
    const existing = this.data.walletLedgers.find(l => l.idempotencyKey === idemKey);
    if (existing) {
      return {
        success: true,
        alreadyPurchased: true,
        newDemoBalance: user.demoWalletBalance || 0,
        deduction: 0,
        transactionId: existing.id,
        reportTitle: cleanTitle,
        isDemo: true
      };
    }

    const curDemoBal = user.demoWalletBalance || 0;
    if (curDemoBal < amount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    // Deduct demo balance only; real walletBalance remains completely untouched!
    user.demoWalletBalance = Math.round((curDemoBal - amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const ledgerId = 'demo_led_' + crypto.randomBytes(8).toString('hex');
    this.data.walletLedgers.unshift({
      id: ledgerId,
      userId,
      astrologerId: null,
      amount: -amount,
      entryType: EntryType.DEMO_REPORT_PURCHASE,
      idempotencyKey: idemKey,
      referenceId: ref,
      description: `[DEMO SIMULATION] Report Purchase: ${cleanTitle}`,
      isDemo: true,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      success: true,
      newDemoBalance: user.demoWalletBalance,
      deduction: amount,
      transactionId: ledgerId,
      reportTitle: cleanTitle,
      isDemo: true
    };
  }

  async resetDemoWallet(userId: string) {
    if (!isDemoModeActive()) {
      throw new Error('DEMO_MODE_DISABLED');
    }
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    user.demoWalletBalance = 0.00;
    user.updatedAt = new Date().toISOString();

    const ledgerId = 'demo_led_' + crypto.randomBytes(8).toString('hex');
    this.data.walletLedgers.unshift({
      id: ledgerId,
      userId,
      astrologerId: null,
      amount: 0,
      entryType: EntryType.DEMO_REVERSAL,
      idempotencyKey: `DEMO_RESET_${userId}_${Date.now()}`,
      referenceId: `reset_${Date.now()}`,
      description: `[DEMO SIMULATION] Reset Demo Wallet Balance to ₹0.00`,
      isDemo: true,
      createdAt: new Date().toISOString()
    });

    this.saveToFile();
    return {
      success: true,
      newDemoBalance: 0.00,
      isDemo: true
    };
  }

  async setSimulatedTier(userId: string, tier: 'FREE' | 'PLUS' | 'PREMIUM') {
    if (!isDemoModeActive()) {
      throw new Error('DEMO_MODE_DISABLED');
    }
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    user.simulatedSubscriptionTier = tier;
    user.updatedAt = new Date().toISOString();
    this.saveToFile();
    return {
      success: true,
      userId: user.id,
      simulatedTier: tier,
      isDemo: true
    };
  }

  async updateSubscription(
    userId: string,
    tier: 'FREE' | 'PLUS' | 'PREMIUM',
    billingPeriod: 'MONTHLY' | 'ANNUAL' | null = null,
    durationDays: number = 30
  ): Promise<UserRecord> {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const expiresAt = tier === 'FREE'
      ? null
      : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { updatedAt: new Date() }
        });
      } catch (err: any) {
        console.error('[DB] updateSubscription Prisma error:', err.message);
      }
    }

    user.subscriptionTier = tier;
    user.subscriptionBillingPeriod = billingPeriod;
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionStatus = tier === 'FREE' ? 'NONE' : 'ACTIVE';
    user.updatedAt = new Date().toISOString();

    this.saveToFile();
    return user;
  }

  async cancelSubscription(userId: string): Promise<UserRecord> {
    this.assertDurableStorage();
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    user.subscriptionStatus = 'CANCELLED';
    user.updatedAt = new Date().toISOString();
    this.saveToFile();
    return user;
  }

  // ==================== ASTROLOGERS ====================

  async findAstrologerById(id: string): Promise<AstrologerRecord | null> {
    return this.data.astrologers.find(a => a.id === id) || null;
  }

  async listAstrologers(): Promise<AstrologerRecord[]> {
    return this.data.astrologers;
  }

  // ==================== SYSTEM METRICS (FOR ADMIN) ====================

  async getPlatformMetrics() {
    const totalUsers = this.data.users.length;
    const activeUsers = this.data.users.filter(u => u.status === AccountStatus.ACTIVE).length;
    const suspendedUsers = this.data.users.filter(u => u.status === AccountStatus.SUSPENDED).length;
    const totalWalletDeposits = this.data.walletLedgers
      .filter(l => l.entryType === EntryType.WALLET_RECHARGE)
      .reduce((sum, l) => sum + l.amount, 0);
    const totalConsultationSpent = this.data.walletLedgers
      .filter(l => l.entryType === EntryType.CONSULTATION_DEBIT)
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
    const totalProfiles = this.data.birthProfiles.length;
    const totalSessions = this.data.sessions.length;

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalWalletDeposits: Math.round(totalWalletDeposits * 100) / 100,
      totalConsultationSpent: Math.round(totalConsultationSpent * 100) / 100,
      totalProfiles,
      activeSessions: totalSessions,
      astrologerCount: this.data.astrologers.length
    };
  }
}

export const db = new ResilientDatabase();
