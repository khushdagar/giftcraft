import crypto from 'crypto';

/**
 * Server-side Razorpay helpers.
 *
 * We talk to Razorpay's REST API directly (no SDK dependency) and verify
 * payment signatures with Node's crypto. Keys are read from the environment:
 *   - RAZORPAY_KEY_ID      (test: rzp_test_… / live: rzp_live_…)
 *   - RAZORPAY_KEY_SECRET  (the matching secret — NEVER exposed to the browser)
 *
 * The public key id is also exposed to the client as NEXT_PUBLIC_RAZORPAY_KEY_ID
 * so the checkout popup can open. Whether the integration runs in test or live
 * mode is purely a function of which keys are in .env — the code is identical.
 */

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

/** True when configured with live keys — used to gate/flag real-money mode. */
export function isLiveMode(): boolean {
  return RAZORPAY_KEY_ID.startsWith('rzp_live_');
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
}

/**
 * Create a Razorpay Order. `amountPaise` must be a positive integer (paise).
 */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  }
  const amount = Math.round(params.amountPaise);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount.');
  }

  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Razorpay order creation failed (${res.status}): ${text}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/**
 * Verify a Razorpay payment signature. Returns true only when the signature
 * matches HMAC_SHA256(order_id|payment_id, key_secret).
 */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  if (!RAZORPAY_KEY_SECRET || !params.razorpayOrderId || !params.razorpayPaymentId || !params.signature) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(params.signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export { RAZORPAY_KEY_ID };
