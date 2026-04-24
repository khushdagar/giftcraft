# 🧪 Test Payment Feature - Complete Implementation

## Summary

Added a **test/fake payment mode** for development that allows you to create orders instantly without Razorpay, with automatic **10% discount** applied.

---

## What Was Added

### 1. New Test Payment Button Component
**File:** `apps/web/components/checkout/test-payment-button.tsx`

Features:
- Instant order creation with fake Razorpay IDs
- No payment modal or gateway
- Shows 10% discount badge
- Redirects to success page with `isTest=true` flag

### 2. Updated Razorpay Button
**File:** `apps/web/components/checkout/razorpay-button.tsx` (modified)

Changes:
- Added `NEXT_PUBLIC_TEST_PAYMENT_MODE` environment check
- Conditionally renders TestPaymentButton or RazorpayButton
- Automatically applies 10% discount in test mode

### 3. Environment Variable
**File:** `.env.local` (modified)

Added:
```env
NEXT_PUBLIC_TEST_PAYMENT_MODE=true
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxx"
```

---

## How It Works

### Test Mode Enabled (`NEXT_PUBLIC_TEST_PAYMENT_MODE=true`)

```
User Flow:
1. Checkout page loads
2. Instead of Razorpay button → Shows 🧪 TEST button
3. Click TEST button
4. Creates fake order with:
   - Fake Razorpay Order ID: test_<timestamp>
   - Fake Payment ID: pay_test_<timestamp>
   - Price: 90% of original (10% OFF)
5. Database record created
6. Success page shown
```

### Test Mode Disabled (`NEXT_PUBLIC_TEST_PAYMENT_MODE=false`)

```
User Flow:
1. Checkout page loads
2. Shows real Razorpay payment button
3. Click button
4. Razorpay modal opens
5. Real payment processing
6. Webhook handles confirmation
```

---

## Architecture

```
┌─ Checkout Page
│
├─ CheckoutForm (filled by user)
│  └─ Billing information
│  └─ Delivery details
│  └─ Path selection (mockup vs price lock)
│
└─ Payment Component (conditional)
   ├─ IF NEXT_PUBLIC_TEST_PAYMENT_MODE === 'true'
   │  └─ TestPaymentButton
   │     └─ Click → Creates fake order
   │     └─ Applies 10% discount
   │
   └─ ELSE
      └─ RazorpayButton
         └─ Opens Razorpay modal
         └─ Real payment processing
```

---

## Files Changed

| File | Status | Change |
|------|--------|--------|
| `apps/web/components/checkout/test-payment-button.tsx` | Created | New test payment component |
| `apps/web/components/checkout/razorpay-button.tsx` | Modified | Added env check, conditional render |
| `.env.local` | Modified | Added `NEXT_PUBLIC_TEST_PAYMENT_MODE=true` |
| `apps/web/app/api/orders/route.ts` | No change | Already accepts any Razorpay IDs |

---

## Test Order Properties

When created with test mode:

```javascript
{
  orderNumber: "GC-2026-0001",
  status: "confirmed",
  placedById: "<userId>",
  razorpayOrderId: "test_1713897123456",
  razorpayPaymentId: "pay_test_1713897123456",
  grandTotal: originalPrice * 0.9, // 10% OFF
  billingJson: { /* company, email, phone */ },
  items: [ /* products, quantities */ ],
  createdAt: "2026-04-23T11:45:23Z"
}
```

---

## Quick Usage

### Enable Test Mode
```env
# .env.local
NEXT_PUBLIC_TEST_PAYMENT_MODE=true
```

### Restart Server
```bash
npm run dev
```

### Create Test Order
1. Navigate to checkout
2. Click 🧪 **TEST** button (yellow dashed border)
3. Instant order creation ✅

### Verify in Database
```sql
SELECT * FROM "Order" 
WHERE razorpayOrderId LIKE 'test_%'
ORDER BY createdAt DESC;
```

---

## Testing Scenarios

### ✅ Can Test With This Feature

- **Checkout flow** - All billing/delivery forms
- **Order creation** - Database records
- **Admin dashboard** - Order viewing/updating
- **Customer dashboard** - Order history
- **Email notifications** - Order confirmation emails
- **WhatsApp** - WhatsApp notifications
- **PDF generation** - Quote and invoice PDFs
- **Pricing calculation** - All price breakdowns
- **Fulfillment flow** - Order status updates

### ❌ Cannot Test With This Feature

- **Razorpay payment** - Use real Razorpay test account
- **Payment webhooks** - Requires actual Razorpay
- **Payment failures** - Test Razorpay decline flows
- **Refunds** - Actual refund processing

---

## Documentation

Complete guides created:

1. **TESTING_PAYMENT_MODE.md** - Full reference guide
2. **TEST_ORDER_QUICK_START.md** - Quick start guide
3. **FEATURE_TEST_PAYMENT.md** - This file (implementation details)

---

## Development Tips

### Disable for Production
```env
# Production .env
NEXT_PUBLIC_TEST_PAYMENT_MODE=false
```

### Find Test Orders in Database
```sql
-- All test orders
SELECT orderNumber, status, createdAt 
FROM "Order" 
WHERE razorpayOrderId LIKE 'test_%';

-- Count test orders
SELECT COUNT(*) as test_orders 
FROM "Order" 
WHERE razorpayOrderId LIKE 'test_%';

-- Delete test orders (if needed)
DELETE FROM "OrderTimeline" 
WHERE "orderId" IN (
  SELECT id FROM "Order" 
  WHERE razorpayOrderId LIKE 'test_%'
);

DELETE FROM "Order" 
WHERE razorpayOrderId LIKE 'test_%';
```

### Debugging

If test button doesn't appear:
```javascript
// Check in browser console
console.log(process.env.NEXT_PUBLIC_TEST_PAYMENT_MODE);
// Should output: 'true'
```

---

## Status

| Item | Status |
|------|--------|
| Component Created | ✅ Complete |
| Integration Done | ✅ Complete |
| Environment Setup | ✅ Complete |
| Dev Server Running | ✅ Running |
| Testing Docs | ✅ Complete |
| Feature Ready | ✅ Ready |

---

## Next Steps

1. ✅ **Test the feature** → Go to http://localhost:3000
2. ✅ **Create test orders** → Build pack and checkout
3. ✅ **Verify in database** → Run SQL queries
4. ✅ **Check admin dashboard** → View orders in admin
5. ✅ **Test notifications** → Check email/WhatsApp
6. ✅ **Switch to production** → Set `NEXT_PUBLIC_TEST_PAYMENT_MODE=false`

---

**Implementation Date:** April 23, 2026  
**Status:** ✅ Production Ready (for development)  
**Version:** 1.0
