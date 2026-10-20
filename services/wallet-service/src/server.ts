import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { razorpay, verifyRazorpaySignature } from './razorpay';
import { processWalletRecharge, settleConsultationSession } from './ledger';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Mock in-memory OTP store for local development & demonstration
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// ==================== 1. AUTHENTICATION & SESSIONS ====================

// Request OTP (Phone or Email)
app.post('/api/auth/request-otp', async (req: Request, res: Response) => {
  const { identifier, type } = req.body; // type: "phone" | "email"
  if (!identifier) return res.status(400).json({ error: 'IDENTIFIER_REQUIRED' });

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  otpStore.set(identifier, { otp, expiresAt });

  console.log(`[AUTH_OTP_DISPATCH] Sent OTP for ${type} ${identifier}: ${otp}`);

  res.json({
    status: 'OTP_SENT',
    message: `Verification code sent to ${identifier}.`,
    cooldownSeconds: 60,
    // In dev/demo environment without live Twilio/SendGrid credentials, expose preview hint
    devPreviewOtp: otp
  });
});

// Verify OTP & Create/Restore Session
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  const { identifier, otp, displayName } = req.body;
  if (!identifier || !otp) return res.status(400).json({ error: 'FIELDS_REQUIRED' });

  const record = otpStore.get(identifier);
  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    return res.status(401).json({ error: 'INVALID_OR_EXPIRED_OTP' });
  }

  otpStore.delete(identifier);

  try {
    const isEmail = identifier.includes('@');
    let user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { phone: identifier }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: isEmail ? null : identifier,
          email: isEmail ? identifier : null,
          displayName: displayName || (isEmail ? identifier.split('@')[0] : `User_${identifier.slice(-4)}`),
          walletBalance: 150.00 // Promotional introductory credit
        }
      });
    }

    res.json({
      status: 'AUTHENTICATED',
      sessionToken: `token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        displayName: user.displayName,
        phone: user.phone,
        email: user.email,
        walletBalance: user.walletBalance
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 2. BIRTH PROFILES (SELF, SPOUSE, CHILD, FRIEND) ====================

app.post('/api/profiles', async (req: Request, res: Response) => {
  const { userId, profileName, relationship, dateOfBirth, timeOfBirth, birthplaceName, latitude, longitude } = req.body;
  if (!userId || !profileName || !dateOfBirth) return res.status(400).json({ error: 'REQUIRED_FIELDS_MISSING' });

  try {
    const profile = await prisma.birthProfile.create({
      data: {
        userId,
        profileName,
        relationship: relationship || 'Self',
        dateOfBirth: new Date(dateOfBirth),
        timeOfBirth: timeOfBirth || '12:00',
        birthplaceName: birthplaceName || 'New Delhi, India',
        latitude: latitude || 28.6139,
        longitude: longitude || 77.2090
      }
    });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profiles/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const profiles = await prisma.birthProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/profiles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.birthProfile.delete({ where: { id } });
    res.json({ status: 'DELETED' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 3. WALLET & PAYMENT GATEWAY ====================

app.post('/api/wallet/create-order', async (req: Request, res: Response) => {
  const { userId, amount } = req.body;

  try {
    let orderId = `mock_order_${Date.now()}`;
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      });
      orderId = razorpayOrder.id;
    } catch {
      console.log("[RAZORPAY_FALLBACK] Mock order created for development.");
    }

    await prisma.paymentOrder.create({
      data: {
        userId,
        amount,
        razorpayOrderId: orderId
      }
    });

    res.json({ orderId, amount, currency: 'INR' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallet/verify-payment', async (req: Request, res: Response) => {
  const { userId, orderId, paymentId, signature, amount } = req.body;

  try {
    const user = await processWalletRecharge(userId, orderId, paymentId || `pay_${Date.now()}`, Number(amount));
    res.json({ status: 'SUCCESS', newBalance: user.walletBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallet/settle-consultation', async (req: Request, res: Response) => {
  const { userId, astrologerId, sessionId, totalDeduction } = req.body;
  if (!userId || !astrologerId || !sessionId || totalDeduction == null) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }

  try {
    const settlement = await settleConsultationSession(
      userId,
      astrologerId,
      sessionId,
      Number(totalDeduction)
    );
    res.json(settlement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
    res.json({ balance: user.walletBalance, statement: user.ledgerEntries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 4. PUJA BOOKINGS & SERVICES ====================

app.post('/api/puja/book', async (req: Request, res: Response) => {
  const { userId, pujaName, amount, sankalpName, gotra, bookingDate } = req.body;
  if (!userId || !pujaName || !amount) return res.status(400).json({ error: 'MISSING_FIELDS' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || Number(user.walletBalance) < Number(amount)) {
      return res.status(400).json({ error: 'INSUFFICIENT_FUNDS' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: Number(amount) } }
      });

      await tx.walletLedger.create({
        data: {
          userId,
          amount: -Number(amount),
          entryType: 'PUJA_BOOKING',
          idempotencyKey: `PUJA_${userId}_${Date.now()}`,
          description: `Booking for ${pujaName}`
        }
      });

      return await tx.pujaBooking.create({
        data: {
          userId,
          pujaName,
          amount: Number(amount),
          sankalpName: sankalpName || user.displayName || 'Devotee',
          gotra: gotra || 'Kashyap',
          bookingDate: new Date(bookingDate || Date.now())
        }
      });
    });

    res.json({ status: 'CONFIRMED', booking });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log('Wallet, Auth & Services Gateway listening on port 5000');
});
