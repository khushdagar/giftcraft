// Shiprocket API integration with module-level token cache
// Token caching strategy: 23.5h expiry (stays under 24h API limit)

/**
 * Map a Shiprocket shipment status (e.g. "OUT FOR DELIVERY", "DELIVERED") to a
 * GIVOO OrderStatus. Returns null for unknown/unmapped statuses.
 * Shared by the webhook route and the manual "refresh tracking" action.
 */
export function mapShiprocketStatus(raw: string): string | null {
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const statusMap: Record<string, string> = {
    PICKUP_SCHEDULED: 'packed',
    PICKUP_GENERATED: 'packed',
    READY_TO_DISPATCH: 'packed',
    PICKED_UP: 'shipped',
    SHIPPED: 'shipped',
    IN_TRANSIT: 'in_transit',
    OUT_FOR_DELIVERY: 'in_transit',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    CANCELED: 'cancelled',
    RTO_INITIATED: 'cancelled',
    RTO_DELIVERED: 'refunded',
    RETURN_INITIATED: 'cancelled',
    RETURN_DELIVERED: 'refunded',
    LOST: 'cancelled',
    LOST_IN_TRANSIT: 'cancelled',
    DAMAGED: 'cancelled',
    DAMAGED_IN_TRANSIT: 'cancelled',
  };
  return statusMap[key] ?? null;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const TOKEN_EXPIRY_MS = 23.5 * 60 * 60 * 1000; // 23.5 hours

/**
 * Get valid Shiprocket token, using cache if available and not expired.
 * Token is valid for 24h; we cache for 23.5h to stay safely under the limit.
 */
export async function getShiprocketToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  // Fetch new token
  const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shiprocket auth failed: ${response.statusText}`);
  }

  const data = await response.json() as { token: string };

  // Cache the token
  cachedToken = {
    value: data.token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };

  return data.token;
}

interface ShipmentPayload {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_address_name: string;
  billing_address_phone: string;
  billing_address_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postcode: string;
  shipping_is_billing: boolean;
  order_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  payment_method: string;
  sub_total: number;
  length?: number;
  breadth?: number;
  height?: number;
  weight: number;
}

interface ShipmentResponse {
  success: boolean;
  data?: {
    shipment_id: number;
    order_id: string;
  };
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Create a shipment in Shiprocket.
 */
export async function createShipment(payload: ShipmentPayload): Promise<number> {
  const token = await getShiprocketToken();

  const response = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ShipmentResponse;

  if (!response.ok || !data.success) {
    throw new Error(`Shiprocket shipment creation failed: ${data.message || response.statusText}`);
  }

  return data.data?.shipment_id || 0;
}

interface AWBResponse {
  success: boolean;
  data?: {
    awb_code: string;
    courier_name: string;
  };
  message?: string;
}

/**
 * Assign AWB to a shipment.
 */
export async function getAWB(shipmentId: number): Promise<{ awbCode: string; courierName: string }> {
  const token = await getShiprocketToken();

  const response = await fetch(`${SHIPROCKET_BASE_URL}/courier/assign/awb`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  const data = (await response.json()) as AWBResponse;

  if (!response.ok || !data.success) {
    throw new Error(`Shiprocket AWB assignment failed: ${data.message || response.statusText}`);
  }

  return {
    awbCode: data.data?.awb_code || '',
    courierName: data.data?.courier_name || '',
  };
}

interface TrackingResponse {
  success: boolean;
  data?: {
    tracking_data?: Array<{
      status: string;
      location: string;
      timestamp: string;
    }>;
  };
  message?: string;
}

interface TrackingInfo {
  status: string;
  location: string;
  timestamp: string;
}

/**
 * Track a shipment using AWB code.
 */
export async function trackShipment(awbCode: string): Promise<TrackingInfo[]> {
  const token = await getShiprocketToken();

  const response = await fetch(`${SHIPROCKET_BASE_URL}/courier/track/awb/${awbCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as TrackingResponse;

  if (!response.ok || !data.success) {
    throw new Error(`Shiprocket tracking failed: ${data.message || response.statusText}`);
  }

  return data.data?.tracking_data || [];
}

interface ServiceabilityResponse {
  data?: {
    available_courier_companies?: Array<{
      courier_name: string;
      rate: number;
      freight_charge?: number;
      estimated_delivery_days?: string;
      etd?: string;
    }>;
  };
}

export interface ShiprocketRate {
  rate: number;
  courierName: string;
  etdDays: number | null;
}

const PICKUP_POSTCODE = process.env.SHIPROCKET_PICKUP_PINCODE || '110007';

export type ShiprocketServiceability =
  // At least one courier serves the pincode.
  | { status: 'serviceable' }
  // Shiprocket answered but no courier delivers to this pincode.
  | { status: 'unserviceable' }
  // Shiprocket couldn't be reached (no credentials, auth/API failure, network).
  | { status: 'unavailable' };

/**
 * Real-time serviceability check: does ANY courier deliver from our pickup
 * location to the given pincode? This is the source of truth for the
 * "delivery available" badge. The exact weight barely affects serviceability,
 * so a nominal 0.5 kg parcel is used purely to satisfy Shiprocket's API.
 *
 * Distinguishes a genuine "unserviceable" answer from "couldn't reach
 * Shiprocket", so callers can fall back to zone config only in the latter case.
 */
export async function getShiprocketServiceability(params: {
  deliveryPostcode: string;
  pickupPostcode?: string;
}): Promise<ShiprocketServiceability> {
  try {
    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) return { status: 'unavailable' };
    const token = await getShiprocketToken();

    const query = new URLSearchParams({
      pickup_postcode: params.pickupPostcode || PICKUP_POSTCODE,
      delivery_postcode: params.deliveryPostcode,
      weight: '0.5',
      cod: '0',
    });

    const response = await fetch(
      `${SHIPROCKET_BASE_URL}/courier/serviceability/?${query.toString()}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return { status: 'unavailable' };

    const data = (await response.json()) as ServiceabilityResponse;
    const couriers = data.data?.available_courier_companies ?? [];
    return couriers.length > 0 ? { status: 'serviceable' } : { status: 'unserviceable' };
  } catch (error) {
    console.error('Shiprocket serviceability lookup failed:', error);
    return { status: 'unavailable' };
  }
}

/**
 * Real-time shipping rate from Shiprocket's courier serviceability API.
 * Returns the cheapest available courier for the parcel, or null if the route
 * is unserviceable or the call fails (caller falls back to zone pricing).
 */
export async function getShiprocketRate(params: {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  cod?: boolean;
}): Promise<ShiprocketRate | null> {
  try {
    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) return null;
    const token = await getShiprocketToken();

    const query = new URLSearchParams({
      pickup_postcode: params.pickupPostcode,
      delivery_postcode: params.deliveryPostcode,
      weight: String(Math.max(params.weightKg, 0.5)), // Shiprocket needs a non-zero weight
      cod: params.cod ? '1' : '0',
    });

    const response = await fetch(
      `${SHIPROCKET_BASE_URL}/courier/serviceability/?${query.toString()}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as ServiceabilityResponse;
    const couriers = data.data?.available_courier_companies ?? [];
    if (couriers.length === 0) return null;

    // Cheapest courier wins.
    const cheapest = couriers.reduce((a, b) => (Number(b.rate) < Number(a.rate) ? b : a));
    const etd = cheapest.estimated_delivery_days
      ? parseInt(cheapest.estimated_delivery_days, 10)
      : NaN;

    return {
      rate: Number(cheapest.rate),
      courierName: cheapest.courier_name,
      etdDays: Number.isNaN(etd) ? null : etd,
    };
  } catch (error) {
    console.error('Shiprocket rate lookup failed:', error);
    return null;
  }
}
