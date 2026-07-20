import { OrderStatus } from '@prisma/client';
import { prisma } from './prisma';
import { getSlaMinutes } from './sla';

// Canonical order lifecycle. `statusProgression` (used to decide whether a
// tracking update moves the order forward) is derived from this single list, so
// there are no hand-numbered maps to keep in sync.
const STATUS_FLOW: OrderStatus[] = [
  'draft',
  'quote_sent',
  'confirmed',
  'mockup_pending',
  'mockup_approved',
  'payment_pending',
  'production',
  'quality_check',
  'packed',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
];
const statusProgression = Object.fromEntries(
  STATUS_FLOW.map((status, index) => [status, index])
) as Record<OrderStatus, number>;

const SHIPROCKET_API_URL =
  process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || '';
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || '';

// Shiprocket tokens are valid 24h; cache for 23.5h to stay under the limit.
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_EXPIRY_MS = 23.5 * 60 * 60 * 1000;

/**
 * Get a valid Shiprocket bearer token, logging in with email+password when the
 * cached token is missing or expired.
 */
async function getShiprocketToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    console.warn('⚠️  SHIPROCKET_EMAIL/PASSWORD not set - tracking fetch skipped');
    return null;
  }
  try {
    const res = await fetch(`${SHIPROCKET_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      }),
    });
    if (!res.ok) {
      console.error('Shiprocket auth failed:', res.status, res.statusText);
      return null;
    }
    const data: any = await res.json();
    if (!data?.token) return null;
    cachedToken = { value: data.token, expiresAt: Date.now() + TOKEN_EXPIRY_MS };
    return cachedToken.value;
  } catch (error) {
    console.error('Shiprocket auth failed:', error);
    return null;
  }
}

/**
 * Fetch tracking data from Shiprocket for a given AWB code
 */
export async function fetchShiprocketTracking(awbCode: string) {
  const token = await getShiprocketToken();
  if (!token) {
    return null;
  }

  try {
    const res = await fetch(
      `${SHIPROCKET_API_URL}/courier/track/awb/${awbCode}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      console.error(`Shiprocket tracking HTTP ${res.status} for ${awbCode}`);
      return null;
    }

    const data: any = await res.json();
    if (data.success && data.data?.tracking_data) {
      return data.data.tracking_data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching Shiprocket tracking for ${awbCode}:`, error);
    return null;
  }
}

/**
 * Map Shiprocket status to internal OrderStatus
 */
export function mapShiprocketStatusToOrderStatus(
  shiprocketStatus: string
): OrderStatus | null {
  const statusMap: Record<string, OrderStatus> = {
    'pending': 'confirmed',
    'picked': 'packed',
    'in_transit': 'in_transit',
    'out_for_delivery': 'in_transit',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'returned': 'cancelled',
    'lost': 'cancelled',
    'exception': 'in_transit',
  };

  return statusMap[shiprocketStatus.toLowerCase()] || null;
}

/**
 * Get a human-readable status label for display
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': 'Pending Pickup',
    'picked': 'Picked Up',
    'in_transit': 'In Transit',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'returned': 'Returned',
    'lost': 'Lost',
    'exception': 'Exception',
  };

  return labels[status.toLowerCase()] || status;
}

/**
 * Update ShipmentTracking with latest Shiprocket data
 */
export async function updateShipmentTracking(
  orderId: string,
  awbCode: string,
  trackingData: any
) {
  if (!trackingData) return null;

  const status = trackingData.shipment_status || 'pending';
  const currentLocation = trackingData.current_location || '';
  const estimatedDelivery = trackingData.edd ? new Date(trackingData.edd) : null;

  return await prisma.shipmentTracking.upsert({
    where: { awbCode },
    create: {
      orderId,
      awbCode,
      status,
      currentLocation,
      estimatedDelivery,
      trackingUrl: `https://shiprocket.co/tracking/${awbCode}`,
    },
    update: {
      status,
      currentLocation,
      estimatedDelivery,
    },
  });
}

/**
 * Check if order status should transition based on tracking
 */
export async function checkOrderStatusTransition(
  order: any,
  trackingData: any
): Promise<{ shouldTransition: boolean; newStatus: OrderStatus | null }> {
  if (!trackingData) {
    return { shouldTransition: false, newStatus: null };
  }

  const shiprocketStatus = trackingData.shipment_status || 'pending';
  const newStatus = mapShiprocketStatusToOrderStatus(shiprocketStatus);

  if (!newStatus) {
    return { shouldTransition: false, newStatus: null };
  }

  // Only transition if status is different and represents progression
  // (statusProgression is derived from STATUS_FLOW at module load).
  const currentOrder = await prisma.order.findUnique({
    where: { id: order.id },
    select: { status: true },
  });

  if (!currentOrder) return { shouldTransition: false, newStatus: null };

  const currentProgression = statusProgression[currentOrder.status as OrderStatus] || -1;
  const newProgression = statusProgression[newStatus] || -1;

  // Only transition if we're moving forward or to a final state
  const shouldTransition =
    newProgression > currentProgression ||
    (newStatus === 'delivered' && currentOrder.status !== 'delivered') ||
    (newStatus === 'cancelled' && currentOrder.status !== 'cancelled');

  return { shouldTransition, newStatus: shouldTransition ? newStatus : null };
}

/**
 * Create an OrderTimeline entry for tracking milestone
 */
export async function createTrackingTimeline(
  orderId: string,
  newStatus: OrderStatus,
  trackingData: any
) {
  const note = `Shipment status: ${getStatusLabel(
    trackingData.shipment_status || 'pending'
  )}. Location: ${trackingData.current_location || 'Unknown'}`;

  return await prisma.orderTimeline.create({
    data: {
      orderId,
      status: newStatus,
      note,
    },
  });
}

/**
 * Sync a single order's tracking information
 * Returns true if order status was updated
 */
export async function syncOrderTracking(order: any): Promise<boolean> {
  if (!order.awbCode) {
    return false;
  }

  try {
    // Fetch latest tracking data
    const trackingData = await fetchShiprocketTracking(order.awbCode);

    if (!trackingData) {
      console.warn(`No tracking data found for AWB ${order.awbCode}`);
      return false;
    }

    // Update ShipmentTracking table
    await updateShipmentTracking(order.id, order.awbCode, trackingData);

    // Check if order status should transition
    const { shouldTransition, newStatus } = await checkOrderStatusTransition(
      order,
      trackingData
    );

    if (shouldTransition && newStatus) {
      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });

      // Create SLA log exit
      const activeSla = await prisma.orderSlaLog.findFirst({
        where: {
          orderId: order.id,
          exitedAt: null,
        },
      });

      if (activeSla) {
        await prisma.orderSlaLog.update({
          where: { id: activeSla.id },
          data: { exitedAt: new Date() },
        });
      }

      // Create new SLA log if needed (for new status). SLA targets are read
      // from the dynamic, admin-configurable config (DB-backed, cached).
      if (newStatus !== 'delivered' && newStatus !== 'cancelled') {
        const slaMinutes = await getSlaMinutes();

        await prisma.orderSlaLog.create({
          data: {
            orderId: order.id,
            stage: newStatus,
            slaMinutes: slaMinutes[newStatus] || 0,
          },
        });
      }

      // Create timeline entry
      await createTrackingTimeline(order.id, newStatus, trackingData);

      console.log(
        `✅ Order ${order.orderNumber} transitioned to ${newStatus} via tracking sync`
      );

      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error syncing tracking for order ${order.id}:`, error);
    return false;
  }
}
