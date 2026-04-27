// Shiprocket API integration with module-level token cache
// Token caching strategy: 23.5h expiry (stays under 24h API limit)

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
  pickup_location_id: number;
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
