import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { razorpay, verifyRazorpaySignature } from './razorpay';
import { processWalletRecharge, settleConsultationSession } from './ledger';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// 1. Create Razorpay Payment Order
app.post('/api/wallet/create-order', async (req: Request, res: Response) => {
  const { userId, amount } = req.body;

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });

    await prisma.paymentOrder.create({
      data: {
        userId,
        amount,
        razorpayOrderId: razorpayOrder.id
      }
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Verify Payment & Credit Wallet
app.post('/api/wallet/verify-payment', async (req: Request, res: Response) => {
  const { userId, orderId, paymentId, signature, amount } = req.body;

  const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
  if (!isValid) {
    return res.status(400).json({ error: 'INVALID_SIGNATURE' });
  }

  try {
    const user = await processWalletRecharge(userId, orderId, paymentId, amount);
    res.json({ status: 'SUCCESS', newBalance: user.walletBalance });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Consultation Session Settlement
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

// 4. Get User Balance & Statement
app.get('/api/wallet/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
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
});

app.listen(5000, () => {
  console.log('Wallet & Payment Service listening on port 5000');
});
