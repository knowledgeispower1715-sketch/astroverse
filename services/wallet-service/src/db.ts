import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient, Role, AccountStatus, EntryType, OrderStatus, SessionStatus } from '@prisma/client';

export interface UserRecord {
  id: string;
  phone: string | null;
  email: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  displayName: string | null;
  role: Role;
  status: AccountStatus;
  preferredLanguage: string;
  preferredTimezone: string;
  walletBalance: number;
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

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'astroverse_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache + file persistence with ACID-like atomic writes
class ResilientDatabase {
  private data: DatabaseSchema;
  private isPostgresAvailable: boolean = false;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.data = this.loadFromFile();
    this.seedDefaults();
  }

  private loadFromFile(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.warn('[DB] Could not parse DB file, reinitializing fresh schema:', err);
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
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to persist database state:', err);
    }
  }

  private seedDefaults(): void {
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
    }
    this.saveToFile();
  }

  // ==================== USERS & AUTH ====================

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.data.users.find(u => u.id === id) || null;
  }

  async findUserByIdentifier(identifier: string): Promise<UserRecord | null> {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(u => 
      (u.email && u.email.toLowerCase() === clean) || 
      (u.phone && (u.phone === identifier || u.phone.replace(/[\s\-\+]/g, '') === identifier.replace(/[\s\-\+]/g, '')))
    ) || null;
  }

  async findUserByPhone(phone: string): Promise<UserRecord | null> {
    const digits = phone.replace(/[\s\-\(\)\+]/g, '');
    return this.data.users.find(u => u.phone && u.phone.replace(/[\s\-\(\)\+]/g, '') === digits) || null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const clean = email.trim().toLowerCase();
    return this.data.users.find(u => u.email && u.email.toLowerCase() === clean) || null;
  }

  async createUser(userData: {
    phone?: string | null;
    email?: string | null;
    phoneVerified?: boolean;
    emailVerified?: boolean;
    displayName?: string | null;
    role?: Role;
    status?: AccountStatus;
    preferredLanguage?: string;
    preferredTimezone?: string;
    walletBalance?: number;
  }): Promise<UserRecord> {
    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      phone: userData.phone || null,
      email: userData.email ? userData.email.trim().toLowerCase() : null,
      phoneVerified: userData.phoneVerified || false,
      emailVerified: userData.emailVerified || false,
      displayName: userData.displayName || (userData.email ? userData.email.split('@')[0] : `User_${userData.phone?.slice(-4) || 'Astro'}`),
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

  async updateUser(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
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
    const s = this.data.sessions.find(x => x.tokenHash === tokenHash);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      this.deleteSession(tokenHash);
      return null;
    }
    return s;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.data.sessions = this.data.sessions.filter(s => s.tokenHash !== tokenHash);
    this.saveToFile();
  }

  async deleteUserSessions(userId: string): Promise<void> {
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
    const now = new Date().toISOString();
    const profile: BirthProfileRecord = {
      id: 'prof_' + crypto.randomBytes(8).toString('hex'),
      userId: data.userId,
      profileName: data.profileName,
      relationship: data.relationship || 'Self',
      dateOfBirth: data.dateOfBirth,
      timeOfBirth: data.timeOfBirth,
      birthTimeKnown: true,
      birthplaceName: data.birthplaceName,
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
    return this.data.birthProfiles.filter(p => p.userId === userId);
  }

  async updateProfile(id: string, updates: Partial<BirthProfileRecord>): Promise<BirthProfileRecord> {
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
    return this.data.savedReports.filter(r => r.userId === userId);
  }

  async deleteSavedReport(id: string): Promise<boolean> {
    const idx = this.data.savedReports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.data.savedReports.splice(idx, 1);
    this.saveToFile();
    return true;
  }

  // ==================== WALLET & LEDGER ====================

  async rechargeWallet(userId: string, amount: number, paymentId: string, orderId: string): Promise<UserRecord> {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const newBal = Math.round((user.walletBalance + amount) * 100) / 100;
    user.walletBalance = newBal;
    user.updatedAt = new Date().toISOString();

    this.data.walletLedgers.unshift({
      id: 'led_' + crypto.randomBytes(8).toString('hex'),
      userId,
      astrologerId: null,
      amount,
      entryType: EntryType.WALLET_RECHARGE,
      idempotencyKey: `RECHARGE_${paymentId}`,
      referenceId: paymentId,
      description: `Wallet recharge of ₹${amount.toFixed(2)} via Razorpay (${paymentId})`,
      createdAt: new Date().toISOString()
    });

    const orderIdx = this.data.paymentOrders.findIndex(o => o.razorpayOrderId === orderId);
    if (orderIdx !== -1) {
      this.data.paymentOrders[orderIdx].status = OrderStatus.PAID;
      this.data.paymentOrders[orderIdx].razorpayPaymentId = paymentId;
      this.data.paymentOrders[orderIdx].updatedAt = new Date().toISOString();
    }

    this.saveToFile();
    return user;
  }

  async settleConsultation(userId: string, astrologerId: string, sessionId: string, totalDeduction: number) {
    const user = await this.findUserById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.walletBalance < totalDeduction) throw new Error('INSUFFICIENT_FUNDS');

    const astro = this.data.astrologers.find(a => a.id === astrologerId);
    const astroShare = Math.round(totalDeduction * 0.60 * 100) / 100;
    const platformShare = Math.round((totalDeduction - astroShare) * 100) / 100;

    user.walletBalance = Math.round((user.walletBalance - totalDeduction) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    if (astro) {
      astro.pendingPayout = Math.round((astro.pendingPayout + astroShare) * 100) / 100;
      astro.ordersCount += 1;
      astro.updatedAt = new Date().toISOString();
    }

    this.data.walletLedgers.unshift({
      id: 'led_' + crypto.randomBytes(8).toString('hex'),
      userId,
      astrologerId,
      amount: -totalDeduction,
      entryType: EntryType.CONSULTATION_DEBIT,
      idempotencyKey: `DEBIT_${sessionId}`,
      referenceId: sessionId,
      description: `Consultation session with ${astro ? astro.name : astrologerId}`,
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
    return { status: 'SETTLED', totalDeduction, astroShare, platformShare, newBalance: user.walletBalance };
  }

  async getWalletStatement(userId: string): Promise<WalletLedgerRecord[]> {
    return this.data.walletLedgers.filter(l => l.userId === userId);
  }

  async createPaymentOrder(data: { userId: string; amount: number; razorpayOrderId: string }): Promise<PaymentOrderRecord> {
    const order: PaymentOrderRecord = {
      id: 'ord_' + crypto.randomBytes(8).toString('hex'),
      userId: data.userId,
      amount: data.amount,
      currency: 'INR',
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

  // ==================== ASTROLOGERS ====================

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
