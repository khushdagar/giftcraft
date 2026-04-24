# 🧪 Quick Start: Test Order Feature

## What's New?

You can now **create fake orders instantly** during development without needing real Razorpay payments!

---

## ✅ Setup (Already Done!)

Test mode is **already enabled** in your `.env.local`:

```env
NEXT_PUBLIC_TEST_PAYMENT_MODE=true
```

Dev server is running on **http://localhost:3000**

---

## 🚀 Test the Feature Now

### Complete Flow (5 minutes):

1. **Open** http://localhost:3000 in browser
2. **Sign in** with Google (create test account if needed)
3. **Click** "Build a Gift" button
4. **Step 1:** Select 2-3 products and set quantity
5. **Step 2:** Customize (packaging, add-ons, logo notes)
6. **Step 3:** Enter delivery address and date
7. **Step 4:** Review and proceed to quote
8. **Checkout:** Fill billing details
9. **Select:** "Lock Prices with 10% Advance"
10. **Click:** 🧪 **TEST** button (yellow dashed border)
11. ✨ **Instant order created!** Redirected to success page

---

## What Happens When You Click 🧪 TEST

| Action | Result |
|--------|--------|
| Click test button | Order created instantly |
| Database | New order record with fake Razorpay IDs |
| Fake IDs | `test_<timestamp>`, `pay_test_<timestamp>` |
| Price | 10% OFF applied automatically |
| Status | `confirmed` (ready for processing) |
| Redirect | Success page with order details |

---

## 📋 Testing Checklist

Run through this checklist to verify everything works:

### Builder Flow
- [ ] Can select products
- [ ] Can choose packaging (select dropdown + cards)
- [ ] Can add add-ons
- [ ] Can upload logo
- [ ] Can enter delivery address
- [ ] Can select delivery date

### Checkout Page
- [ ] Checkout page loads
- [ ] Billing form visible
- [ ] Both "Free Mockup" and "Price Lock" options show
- [ ] **🧪 TEST button visible** (yellow dashed border)

### Test Order Creation
- [ ] Click TEST button
- [ ] "Creating Test Order..." loading state shows
- [ ] No payment modal appears (skips Razorpay)
- [ ] Redirected to success page
- [ ] Order ID and number visible on success page

### Database Verification
```sql
-- Check test orders were created
SELECT id, orderNumber, status, razorpayOrderId 
FROM "Order" 
WHERE razorpayOrderId LIKE 'test_%' 
ORDER BY createdAt DESC;
```

Expected output:
```
id          | orderNumber | status    | razorpayOrderId
xxxx-xxxx   | GC-2026-0001| confirmed | test_1713897123456
```

### Dashboard Check
- [ ] Go to http://localhost:3000/dashboard
- [ ] Test order appears in order history
- [ ] Click order to view details
- [ ] All customizations and pricing visible

---

## 🔧 Key Features

### 1️⃣ Instant Order Creation
- No Razorpay modal
- No payment waiting
- Click → Order created

### 2️⃣ 10% Discount Applied
- Test orders get automatic 10% OFF
- Shows in price calculation
- Useful for verifying discounts work

### 3️⃣ Fake Razorpay IDs
- `test_<timestamp>` for order ID
- `pay_test_<timestamp>` for payment ID
- Clearly marked as test data

### 4️⃣ Full Database Integration
- Complete order record created
- OrderTimeline entry added
- Order items linked
- Ready for admin dashboard testing

---

## 📊 Data Created When You Test

Each test order creates:

```
✓ Order (id, orderNumber, status, pricing, etc.)
✓ Order Items (products, quantities, prices)
✓ OrderTimeline (confirmed status entry)
✓ Fake Razorpay IDs (for logging/testing)
✓ Billing Information (company, email, phone)
✓ Shipping Details (address, delivery date)
```

---

## 🔄 Switch Between Test & Real

### To Use Test Mode:
```env
NEXT_PUBLIC_TEST_PAYMENT_MODE=true
```
Restart: `npm run dev`

### To Use Real Razorpay:
```env
NEXT_PUBLIC_TEST_PAYMENT_MODE=false
```
Restart: `npm run dev`

---

## 🚨 Important Notes

### ✅ Test Mode is Safe for:
- Testing checkout flow
- Testing order creation
- Testing admin dashboard
- Testing email/WhatsApp notifications
- Running integration tests
- Learning the platform

### ❌ Test Mode Should NOT Be Used For:
- Production deployments
- Real customer orders
- Testing actual payment processing
- Testing Razorpay webhooks

---

## 📝 Example Test Order Details

When you click 🧪 TEST with these inputs:

**Builder Selections:**
- Products: Mug (₹150 × 100), Cap (₹120 × 100)
- Packaging: Box A (₹100)
- Add-ons: Thank You Card (Free)
- Delivery: Single Location

**Checkout Inputs:**
- Company: "Acme Corp"
- Email: your-email@gmail.com
- Phone: 9876543210
- Address: 123 MG Road, Bangalore, KA 560001
- GSTIN: (optional for test)

**Result Order:**
```
Order Number: GC-2026-0001
Status: confirmed
Products: Mug (100) + Cap (100)
Base Total: ₹27,000
With 10% Test Discount: ₹24,300
Razorpay Payment ID: pay_test_1713897123456
Created At: 2026-04-23 11:45:23
```

---

## 💡 Pro Tips

1. **Test email notifications** by checking your email after order creation
2. **Test WhatsApp** by entering a valid phone in billing form
3. **Test dashboard** - check if order appears in your order list
4. **Test admin** - sign in as admin to see order in admin dashboard
5. **Test PDFs** - quote and invoice generation

---

## 🎯 What To Test Next

After creating a test order:

1. **Admin Dashboard** (`/admin/orders`)
   - Is test order visible?
   - Can you click to view details?
   - Can you update status?

2. **Customer Dashboard** (`/dashboard`)
   - Is test order in your order history?
   - Can you view order details?
   - Is timeline showing "confirmed"?

3. **Notifications**
   - Check email for order confirmation
   - Check WhatsApp (if configured)

4. **PDF Generation**
   - Download quote PDF
   - Download invoice PDF

---

## ❓ FAQ

**Q: Why is my TEST button not showing?**
A: Check `.env.local` has `NEXT_PUBLIC_TEST_PAYMENT_MODE=true` and restart server.

**Q: Can I use test orders in production?**
A: No! Test orders have fake Razorpay IDs. Disable test mode in production.

**Q: Will test orders appear in real reports?**
A: Yes, they're full orders. Filter by `razorpayOrderId LIKE 'test_%'` to find them.

**Q: Can I delete test orders?**
A: Yes, but it's better to keep them for testing. Or reset the database.

**Q: Does 10% OFF get applied to real orders?**
A: No! 10% OFF is only applied when test mode is enabled.

---

## 🎉 You're Ready!

The test payment feature is **live and ready to use**.

**Next:** Go to http://localhost:3000 and try creating your first test order!

---

**Status:** ✅ Ready for Testing  
**Enabled:** Yes (in .env.local)  
**Dev Server:** Running on http://localhost:3000  
**Last Updated:** April 23, 2026
