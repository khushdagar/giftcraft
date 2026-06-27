import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { getShiprocketTrackerQueue } from '../queue';
import { syncOrderTracking } from '../lib/shiprocket-sync';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const prisma = new PrismaClient();

// Create Redis connection for worker (optional in dev)
let redis: Redis | null = null;
let shiprocketTrackerWorker: Worker | null = null;

try {
  redis = new Redis(REDIS_URL, {
    retryStrategy: () => null, // Fail fast
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  redis.connect().catch(() => {
    console.warn('⚠️  Shiprocket Tracker Worker: Redis connection failed - worker will not start');
    redis = null;
  });
} catch (err) {
  console.warn('⚠️  Shiprocket Tracker Worker: Failed to initialize Redis connection');
  redis = null;
}

/**
 * Shiprocket Tracker Worker
 * Runs every hour to sync tracking data for shipped orders
 * - Fetches all orders with status 'shipped' or 'in_transit'
 * - Calls Shiprocket API for tracking updates
 * - Updates ShipmentTracking table
 * - Transitions order status based on tracking data
 * - Creates timeline entries for tracking milestones
 */
if (redis) {
  shiprocketTrackerWorker = new Worker(
    'shiprocket-tracker',
    async (job: Job) => {
      console.log(`🚚 Shiprocket Tracker: Running at ${new Date().toISOString()}`);

      try {
        // Fetch all orders that need tracking sync
        const ordersToSync = await prisma.order.findMany({
          where: {
            status: {
              in: ['shipped', 'in_transit'],
            },
            awbCode: {
              not: null,
            },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            awbCode: true,
          },
        });

        console.log(
          `📦 Found ${ordersToSync.length} orders to sync tracking for`
        );

        let updatedCount = 0;
        const errors: string[] = [];

        // Sync each order
        for (const order of ordersToSync) {
          try {
            const wasUpdated = await syncOrderTracking(order as any);
            if (wasUpdated) {
              updatedCount++;
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            errors.push(`${order.orderNumber}: ${msg}`);
          }
        }

        console.log(
          `✅ Shiprocket Tracker: Synced ${ordersToSync.length} orders, ${updatedCount} status updates`
        );

        if (errors.length > 0) {
          console.warn(`⚠️  ${errors.length} errors during sync:`, errors);
        }

        return {
          success: true,
          ordersProcessed: ordersToSync.length,
          ordersUpdated: updatedCount,
          errors: errors,
        };
      } catch (error) {
        console.error('❌ Shiprocket Tracker worker error:', error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 1, // Run one job at a time
    }
  );

  shiprocketTrackerWorker.on('failed', (job, err) => {
    console.error(`❌ Shiprocket Tracker job failed:`, err);
  });

  shiprocketTrackerWorker.on('completed', (job, result) => {
    console.log(`✅ Shiprocket Tracker job completed:`, result);
  });
}

/**
 * Initialize the Shiprocket tracker worker and set up recurring job
 */
export async function initShiprocketTracker() {
  try {
    const queue = getShiprocketTrackerQueue();

    if (!queue) {
      console.warn('⚠️  Shiprocket Tracker: Redis unavailable, skipping worker initialization');
      return false;
    }

    // Schedule recurring job: every hour
    await queue.add(
      'sync-shipments',
      {},
      {
        repeat: {
          pattern: '0 * * * *', // Every hour (top of the hour)
        },
        jobId: 'shiprocket-tracker-recurring', // Prevent duplicates
      }
    );

    console.log('🔧 Shiprocket Tracker: Recurring job scheduled (every hour)');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Shiprocket Tracker:', error);
    return false;
  }
}

export { shiprocketTrackerWorker };
