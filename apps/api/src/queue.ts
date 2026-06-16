import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisConnection: Redis | null = null;
let redisConnectionAttempted = false;
let redisAvailable = false;

// Create Redis connection (with fallback for dev)
function getRedisConnection(): Redis | null {
  if (redisConnectionAttempted) {
    return redisAvailable ? redisConnection : null;
  }

  redisConnectionAttempted = true;

  try {
    const connection = new Redis(REDIS_URL, {
      retryStrategy: () => null, // Don't retry, fail fast in dev
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 5000,
      lazyConnect: true, // Don't connect immediately
    });

    connection.on('error', (err) => {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Redis connection error (production):', err);
        process.exit(1);
      } else {
        console.warn('⚠️  Redis unavailable (development mode):', err.message);
      }
      redisAvailable = false;
    });

    connection.on('connect', () => {
      console.log('✅ Redis connected for BullMQ');
      redisAvailable = true;
    });

    // Try to connect (async, won't crash app if it fails)
    connection.connect().catch((err: any) => {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Failed to connect to Redis (production):', err?.message || err);
        process.exit(1);
      }
      // In dev mode, just log and continue without Redis
      redisAvailable = false;
    }).finally(() => {
      // Always continue - don't let this block app startup
      if (!redisAvailable) {
        console.warn('⚠️  Redis unavailable - features using job queue will be disabled');
      }
    });

    redisConnection = connection;
    return redisConnection;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Redis initialization error (production):', err);
      process.exit(1);
    } else {
      console.warn('⚠️  Redis initialization failed (development mode):', err instanceof Error ? err.message : err);
    }
    redisAvailable = false;
    return null;
  }
}

// Create SLA checker queue
export function getSlaCheckerQueue(): Queue | null {
  const redis = getRedisConnection();
  if (!redis) return null;

  const queue = new Queue('sla-checker', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // Suppress error emissions in development when Redis is unavailable
  if (process.env.NODE_ENV !== 'production') {
    queue.on('error', () => {
      // Silently ignore connection errors in development
    });
  }

  return queue;
}

export { redisConnection };
