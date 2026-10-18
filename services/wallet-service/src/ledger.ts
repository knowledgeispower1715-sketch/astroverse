import { PrismaClient, EntryType, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function processWalletRecharge(
  userId: string,
  orderId: string,
  paymentId: string,
  amount: number
) {
  return await prisma.$transaction(async (tx) => {
    await tx.paymentOrder.update({
      where: { razorpayOrderId: orderId },
      data: { status: OrderStatus.PAID, razorpayPaymentId: paymentId }
    });

    await tx.walletLedger.create({
      data: {
        userId,
        amount,
        entryType: EntryType.WALLET_RECHARGE,
        idempotencyKey: `RECHARGE_${paymentId}`,
        referenceId: paymentId
      }
    });

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount } }
    });

    return updatedUser;
  });
}

export async function settleConsultationSession(
  userId: string,
  astrologerId: string,
  sessionId: string,
  totalDeduction: number
) {
  const astrologerShare = totalDeduction * 0.60;
  const platformShare = totalDeduction * 0.40;

  return await prisma.$transaction(async (tx) => {
    await tx.walletLedger.create({
      data: {
        userId,
        amount: -totalDeduction,
        entryType: EntryType.CONSULTATION_DEBIT,
        idempotencyKey: `DEBIT_${sessionId}`,
        referenceId: sessionId
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: totalDeduction } }
    });

    await tx.walletLedger.create({
      data: {
        astrologerId,
        amount: astrologerShare,
        entryType: EntryType.ASTROLOGER_CREDIT,
        idempotencyKey: `CREDIT_ASTRO_${sessionId}`,
        referenceId: sessionId
      }
    });

    await tx.astrologer.update({
      where: { id: astrologerId },
      data: { pendingPayout: { increment: astrologerShare } }
    });

    return { status: "SETTLED", astrologerShare, platformShare };
  });
}
