import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getSlaCheckerQueue } from '../queue';
import { prisma } from '../lib/prisma';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis connection for worker (optional in dev)
let redis: Redis | null = null;
let slaCheckerWorker: Worker | null = null;

try {
  redis = new Redis(REDIS_URL, {
    retryStrategy: () => null, // Fail fast
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  redis.connect().catch(() => {
    console.warn('⚠️  SLA Checker Worker: Redis connection failed - worker will not start');
    redis = null;
  });
} catch (err) {
  console.warn('⚠️  SLA Checker Worker: Failed to initialize Redis connection');
  redis = null;
}

/**
 * SLA Checker Worker
 * Runs every 15 minutes to check for breached SLAs
 * - Fetches all active (non-exited) SLA logs
 * - Calculates if each one is breached (elapsed > slaMinutes)
 * - Updates isBreached flag in database
 * - Logs alerts for breached SLAs
 */
if (redis) {
  slaCheckerWorker = new Worker(
    'sla-checker',
    async (job: Job) => {
      console.log(`🔍 SLA Checker: Running at ${new Date().toISOString()}`);

      try {
        // Fetch all active SLA logs (not yet exited)
        const activeSlas = await prisma.orderSlaLog.findMany({
          where: {
            exitedAt: null,
          },
          select: {
            id: true,
            orderId: true,
            slaMinutes: true,
            enteredAt: true,
            isBreached: true,
            order: {
              select: {
                orderNumber: true,
                status: true,
              },
            },
          },
        });

        console.log(`📋 Found ${activeSlas.length} active SLA logs`);

        let breachedCount = 0;
        const breachedOrders: string[] = [];

        // Check each SLA
        for (const sla of activeSlas) {
          const now = new Date();
          const elapsedMinutes = Math.floor(
            (now.getTime() - sla.enteredAt.getTime()) / (1000 * 60)
          );
          const isCurrentlyBreached = elapsedMinutes > sla.slaMinutes;

          // Update if status changed
          if (isCurrentlyBreached && !sla.isBreached) {
            await prisma.orderSlaLog.update({
              where: { id: sla.id },
              data: { isBreached: true },
            });
            breachedCount++;
            breachedOrders.push(sla.order.orderNumber);
            console.warn(
              `⚠️  SLA BREACHED: Order ${sla.order.orderNumber} (${sla.order.status}) — ${elapsedMinutes}/${sla.slaMinutes} minutes`
            );
          } else if (isCurrentlyBreached && sla.isBreached) {
            // Already breached, continue monitoring
            console.warn(
              `🔴 SLA CRITICAL: Order ${sla.order.orderNumber} — still breached (+${elapsedMinutes - sla.slaMinutes} min overdue)`
            );
          }
        }

        // Summary log
        if (breachedCount > 0) {
          console.error(`🚨 SLA CHECK COMPLETE: ${breachedCount} orders breached`);
          console.error(`   Orders: ${breachedOrders.join(', ')}`);
        } else {
          console.log(`✅ SLA CHECK COMPLETE: No new breaches`);
        }

        return {
          success: true,
          checkedCount: activeSlas.length,
          breachedCount,
          breachedOrders,
        };
      } catch (error) {
        console.error('❌ SLA Checker error:', error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1,
    }
  );
} else {
  console.warn('⚠️  SLA Checker Worker not initialized (Redis unavailable)');
}

// Log worker events (only if worker was initialized)
if (slaCheckerWorker) {
  slaCheckerWorker.on('completed', (job) => {
    console.log(`✅ SLA Checker job ${job.id} completed`);
  });

  slaCheckerWorker.on('failed', (job, err) => {
    console.error(`❌ SLA Checker job ${job?.id} failed:`, err);
  });

  // Suppress error logs in development
  if (process.env.NODE_ENV !== 'production') {
    slaCheckerWorker.on('error', () => {
      // Silently ignore connection errors in development
    });
  }
}

// Schedule recurring job on worker startup
export async function initSlaChecker() {
  try {
    const queue = getSlaCheckerQueue();
    if (!queue) {
      console.warn(
        '⚠️  Redis unavailable — SLA checker jobs will not be scheduled'
      );
      return;
    }

    // Add repeatable job: every 15 minutes
    const job = await queue.add(
      'check-sla',
      {},
      {
        repeat: {
          pattern: '*/15 * * * *', // Every 15 minutes
        },
      }
    );

    console.log('📅 SLA Checker scheduled: Every 15 minutes');
    console.log(`   Next run: ${new Date(Date.now() + 15 * 60 * 1000).toISOString()}`);
  } catch (error) {
    console.error('Failed to schedule SLA checker:', error);
  }
}
