import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import fs from 'fs';
import axios from 'axios';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const billingLua = fs.readFileSync('./billing.lua', 'utf8');

const io = new Server(createServer().listen(4000), { cors: { origin: '*' } });

interface ActiveConsultation {
  sessionId: string;
  userId: string;
  astrologerId: string;
  ratePerMinute: number;
  minutesConsumed: number;
  timerInterval?: NodeJS.Timeout;
}

const activeSessions = new Map<string, ActiveConsultation>();

async function finalizeSession(session: ActiveConsultation) {
  if (session.timerInterval) {
    clearInterval(session.timerInterval);
  }
  activeSessions.delete(session.sessionId);

  const totalDeducted = session.minutesConsumed * session.ratePerMinute;

  if (totalDeducted > 0) {
    try {
      await axios.post('http://localhost:5000/api/wallet/settle-consultation', {
        userId: session.userId,
        astrologerId: session.astrologerId,
        sessionId: session.sessionId,
        totalDeduction: totalDeducted
      });
    } catch (err: any) {
      console.error(`[SETTLEMENT_SYNC_ERROR] Session ${session.sessionId}:`, err.message);
    }
  }
}

io.on('connection', (socket: Socket) => {
  socket.on('start_consultation', ({ sessionId, userId, astrologerId, ratePerMinute }) => {
    socket.join(sessionId);

    const session: ActiveConsultation = {
      sessionId,
      userId,
      astrologerId,
      ratePerMinute,
      minutesConsumed: 0
    };

    session.timerInterval = setInterval(async () => {
      const result = await redis.eval(
        billingLua,
        1,
        `user:${userId}:wallet`,
        ratePerMinute.toString(),
        astrologerId
      ) as [number, number];

      const [status, remainingBalance] = result;

      if (status === -1) {
        io.to(sessionId).emit('force_hangup', { reason: 'INSUFFICIENT_FUNDS', remainingBalance });
        await finalizeSession(session);
      } else {
        session.minutesConsumed += 1;
        io.to(sessionId).emit('minute_deducted', {
          remainingBalance,
          deducted: ratePerMinute,
          minutesConsumed: session.minutesConsumed
        });
      }
    }, 60000);

    activeSessions.set(sessionId, session);
    socket.emit('session_active', { sessionId });
  });

  socket.on('end_consultation', async ({ sessionId }) => {
    const session = activeSessions.get(sessionId);
    if (session) {
      await finalizeSession(session);
    }
    io.to(sessionId).emit('call_ended');
  });
});

console.log('Consultation Gateway running on port 4000');
