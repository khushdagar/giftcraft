# 🧪 Test Payment Mode - Development Guide

## Overview

The **Test Payment Mode** allows you to test the complete checkout and order flow during development **without requiring real Razorpay payments** or a valid payment gateway setup.

When enabled, a test payment button replaces the Razorpay button, allowing you to create fake orders instantly for testing.

---

## How to Enable Test Mode

### Step 1: Add Environment Variable

Add this to your `.env.local` file in the project root:

```env
NEXT_PUBLIC_TEST_PAYMENT_MODE=true
```

### Step 2: Restart Dev Server

```bash
npm run dev
```

---

## How It Works

### When Test Mode is **ENABLED** (`true`):

1. **Checkout page** shows a **🧪 TEST** button instead of Razorpay
2. Click the button to instantly create a fake order
3. **10% discount** is automatically applied to the test amount
4. Fake Razorpay IDs are generated: `test_<timestamp>`, `pay_test_<timestamp>`
5. Order is created in the database with status `confirmed`
6. You're redirected to the success page with `isTest=true` flag

### When Test Mode is **DISABLED** (`false` or not set):

1. **Checkout page** shows the real Razorpay payment gateway
2. Normal payment flow with actual Razorpay processing
3. Requires valid `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

---

## Testing Workflow

### Complete End-to-End Test

```
1. Homepage → "Build a Gift" button
2. Step 1: Choose Products → Select 2-3 products
3. Step 2: Customize Pack → Select packaging, add-ons
4. Step 3: Delivery → Enter address, select date
5. Step 4: Review & Quote → Click "Next: Review & Quote"
6. Checkout Page → Fill billing form
7. Select "Lock Prices with 10% Advance" → Choose payment method
8. Click 🧪 TEST button → Instant order creation ✅
9. Success page → View order details
10. Dashboard → See the order in your order history
```

---

## Test Order Details

When you create a test order:

| Field | Value | Notes |
|-------|-------|-------|
| Order Status | `confirmed` | Same as real orders |
| Razorpay Order ID | `test_<timestamp>` | Fake ID for testing |
| Razorpay Payment ID | `pay_test_<timestamp>` | Fake payment proof |
| Price | 90% of original | 10% discount applied |
| Database Entry | ✅ Created | Full order record saved |
| Timeline | ✅ Created | Order confirmed entry in timeline |

---

## Environment Variable Reference

```env
# DEVELOPMENT (Test Mode)
NEXT_PUBLIC_TEST_PAYMENT_MODE=true

# PRODUCTION (Real Payments)
NEXT_PUBLIC_TEST_PAYMENT_MODE=false  # or omit entirely

# Required for real Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

---

## Files Modified for Test Mode

1. **Created:** `apps/web/components/checkout/test-payment-button.tsx`
   - New test payment button component
   - Creates fake orders with test IDs
   - Shows 10% discount badge

2. **Modified:** `apps/web/components/checkout/razorpay-button.tsx`
   - Added `NEXT_PUBLIC_TEST_PAYMENT_MODE` check
   - Conditionally renders TestPaymentButton or RazorpayButton
   - Applies 10% discount in test mode

3. **No changes:** `apps/web/app/api/orders/route.ts`
   - Already accepts any razorpayOrderId/razorpayPaymentId
   - Works seamlessly with test IDs

---

## Testing Checklist

Use this checklist when testing with test mode enabled:

### Checkout Flow
- [ ] Checkout page loads without Razorpay script errors
- [ ] Test button displays with 🧪 emoji and yellow dashed border
- [ ] Form validation works (required fields highlighted)
- [ ] Both "Free Mockup" and "Price Lock" paths work

### Order Creation
- [ ] Click test button → Order created instantly
- [ ] Redirected to success page with order ID
- [ ] Order appears in database: `SELECT * FROM "Order" WHERE razorpayOrderId LIKE 'test_%'`
- [ ] OrderTimeline entry created with "confirmed" status

### Success Page
- [ ] Success page displays order details
- [ ] Order ID and number visible
- [ ] Grand total and breakdown correct
- [ ] "isTest=true" flag visible in URL (optional)

### Admin Dashboard
- [ ] New test order appears in `/admin/orders` list
- [ ] Order status is "confirmed"
- [ ] Order summary shows all products and customizations
- [ ] Can click order to view full details

### User Dashboard
- [ ] Test order appears in `/dashboard` order history
- [ ] Order timeline shows "confirmed" status
- [ ] Can view order details from dashboard

---

## Troubleshooting

### Test button not appearing?
**Check:** Is `NEXT_PUBLIC_TEST_PAYMENT_MODE=true` in `.env.local`?
**Fix:** Restart dev server after changing env vars (`npm run dev`)

### "10% OFF" not showing?
**Check:** Is the test button visible?
**Note:** The 10% is applied to the order amount, not displayed as a separate line item

### Orders not being created?
**Check:** 
1. Are you authenticated (signed in with Google)?
2. Is the form fully filled out (company name, email, phone, address)?
3. Check browser console for errors
4. Check server logs for API errors

---

## Disabling Test Mode

To switch back to real Razorpay:

```env
NEXT_PUBLIC_TEST_PAYMENT_MODE=false
```

or simply remove/comment out the line.

---

## When to Use Test Mode

✅ **Use Test Mode When:**
- Setting up development environment
- Testing checkout flow without real payments
- Testing order creation and database records
- Verifying email/WhatsApp notifications
- Building admin dashboard features
- Running integration tests locally

❌ **Don't Use Test Mode When:**
- Testing real payment processing
- Testing Razorpay webhook handling
- Going to production
- Testing with real customer data

---

## Next Steps

After testing with fake orders:
1. Disable test mode: `NEXT_PUBLIC_TEST_PAYMENT_MODE=false`
2. Set up real Razorpay credentials
3. Test with actual Razorpay test account
4. Verify webhooks are working
5. Deploy to production

---

**Status:** ✅ Ready for Testing  
**Last Updated:** April 23, 2026  
**Test Feature Version:** 1.0
