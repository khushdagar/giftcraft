# Sprint 8: Shiprocket, Disputes, Vendor Portal - Status Report

**Date:** 2026-06-16  
**Status:** ✅ 20% COMPLETE - Foundation & Schema Ready

---

## ✅ COMPLETED THIS SESSION

### 1. **Prisma Schema Enhancement** ✅
- Added `ShipmentTracking` model for detailed tracking history
- Added `VendorPO` (Purchase Order) model for vendor assignments
- Added `VendorScore` model for performance metrics
- Added `VendorPaymentDetails` model for bank account info
- Updated `Vendor` model with new relations
- Updated `Order` model with shipment and PO relations

**Files Modified:**
- `apps/web/prisma/schema.prisma` (+140 lines)

**Database Changes:**
```prisma
ShipmentTracking {
  orderId, awbCode, status, currentLocation, 
  estimatedDelivery, deliveredAt, trackingUrl
}

VendorPO {
  vendorId, orderId, deadline, status, qcPhotos,
  ratePerUnit, totalAmount, paymentDueDate
}

VendorScore {
  vendorId, qualityScore, onTimeScore, reliabilityScore
}

VendorPaymentDetails {
  vendorId, bankAccountNumber, bankIfscCode, upiId, panNumber
}
```

---

## 🚀 REMAINING WORK (3 Sprints, 120 hours)

### **SPRINT 8.1: Shiprocket Tracking** (25 hours)

#### Status: ⏳ NOT STARTED

**What Exists:**
- ✅ Shiprocket API client library
- ✅ Webhook handler for status updates
- ✅ Shipment creation endpoint
- ✅ Order fields: shiprocketOrderId, awbCode, trackingUrl

**What's Missing:**
- ❌ Periodic tracking sync (BullMQ worker)
- ❌ ShipmentTracking model population
- ❌ Order status auto-update on delivery/in-transit

**Files to Create:**

1. **`apps/api/src/workers/shiprocket-tracker.ts`** (NEW)
   ```typescript
   // BullMQ worker running every 6 hours
   // Fetches tracking for all shipped orders
   // Updates ShipmentTracking.status and Order.status
   // Creates OrderTimeline entries for tracking changes
   ```

2. **`lib/shiprocket-sync.ts`** (NEW)
   ```typescript
   // Helper functions for tracking sync
   // fetchTrackingUpdates(awbCode)
   // mapShiprocketStatus(shiprocketStatus) -> OrderStatus
   // updateOrderOnTracking(order, newStatus)
   ```

3. **`app/api/admin/orders/[id]/tracking/route.ts`** (NEW)
   ```typescript
   // GET: Return ShipmentTracking details
   // Public endpoint for order tracking page
   // Shows: current location, status, ETA
   ```

**Implementation Steps:**
1. Register BullMQ worker (run every 6 hours)
2. Query all orders with status "shipped" or "in_transit"
3. Batch fetch Shiprocket tracking for AWB codes
4. Update ShipmentTracking table with latest status
5. If status changes (e.g., delivered), update Order.status
6. Create OrderTimeline entry for tracking milestone
7. Send customer notification (optional)

**Testing:**
- [ ] Manually trigger shipment creation
- [ ] Verify ShipmentTracking record created
- [ ] Simulate webhook from Shiprocket
- [ ] Verify order status updated
- [ ] Check worker runs on schedule

---

### **SPRINT 8.2: Dispute Management** (28 hours)

#### Status: ⏳ NOT STARTED (Admin list exists)

**What Exists:**
- ✅ DisputeTicket Prisma model
- ✅ Admin disputes list page (`/admin/disputes`)
- ✅ Admin disputes API (GET list)

**What's Missing:**
- ❌ Public dispute filing page (token-based, no auth)
- ❌ 48-hour dispute window validation
- ❌ Admin dispute detail page + resolution workflow
- ❌ Dispute resolution API (PUT status + resolution note)
- ❌ Customer notification emails

**Files to Create:**

1. **`app/disputes/[token]/page.tsx`** (NEW - 200 lines)
   ```typescript
   // Public page: dispute filing form
   // Token-based access (no auth required)
   // Shows order summary + 48-hour window status
   // Form: subject, description, photo uploads (3 max)
   // Success: shows reference number
   ```

2. **`app/api/disputes/route.ts`** (NEW - 120 lines)
   ```typescript
   // POST: File dispute
   // Validate token or orderId
   // Check 48-hour window (hard deadline)
   // Check no duplicate dispute
   // Upload photos to Digital Ocean
   // Create DisputeTicket
   // Send admin notification
   ```

3. **`app/admin/disputes/[id]/page.tsx`** (NEW - 250 lines)
   ```typescript
   // Admin detail page
   // Order info + dispute details + photos
   // Status dropdown: open → under_review → resolved/rejected
   // Resolution notes textarea
   // Auto-send email on status change
   ```

4. **`app/api/admin/disputes/[id]/route.ts`** (NEW - 100 lines)
   ```typescript
   // PUT: Update dispute status + resolution
   // Create audit log
   // Send customer email
   ```

5. **Components:**
   - `components/disputes/dispute-form.tsx` (form with validation)
   - `components/disputes/dispute-photo-gallery.tsx` (lightbox)
   - `components/admin/disputes/dispute-timeline.tsx` (timeline view)

**Implementation Steps:**
1. Create public dispute filing page with token validation
2. Implement 48-hour dispute window check
3. Create photo upload handler (DO Spaces)
4. Create admin detail page with resolution workflow
5. Send customer notifications (email template)
6. Add nav links to dispute pages

**Testing:**
- [ ] File dispute within 48 hours → success
- [ ] Try filing after 48 hours → error message
- [ ] Upload 3 photos → verify stored
- [ ] Admin resolves dispute → customer receives email
- [ ] Duplicate email check → prevent duplicate disputes

---

### **SPRINT 8.3: Vendor Portal** (35 hours)

#### Status: ⏳ NOT STARTED

**What Exists:**
- ✅ Vendor model in Prisma
- ✅ Vendor authentication (Google OAuth with vendor role)
- ✅ Admin vendor list page

**What's Missing:**
- ❌ Vendor auth middleware
- ❌ Vendor layout + sidebar
- ❌ Vendor dashboard (view POs)
- ❌ Vendor PO detail page (view + upload QC photos)
- ❌ Vendor payments page
- ❌ Admin vendor detail page (assign POs, manage payments)
- ❌ All vendor API endpoints

**Files to Create:**

1. **Vendor Portal Layout** (250 lines)
   - `app/vendor/layout.tsx` — Sidebar nav
   - `app/vendor/dashboard/page.tsx` — KPI cards + PO list
   - `app/vendor/po/[poId]/page.tsx` — PO detail + QC upload
   - `app/vendor/payments/page.tsx` — Payment list + due dates
   - `app/vendor/profile/page.tsx` — Vendor info + bank details

2. **API Endpoints** (400 lines)
   - `app/api/vendor/dashboard` — GET vendor's POs
   - `app/api/vendor/po/[poId]` — GET PO detail
   - `app/api/vendor/po/[poId]/photos` — POST QC photos
   - `app/api/vendor/po/[poId]/complete` — PUT mark QC done
   - `app/api/vendor/payments` — GET payment list
   - `app/api/vendor/bank-details` — GET/PUT bank account

3. **Admin Pages** (500 lines)
   - `app/admin/vendors/[id]/page.tsx` — Vendor detail
   - `app/admin/vendors/[id]/pos/page.tsx` — PO list
   - `app/admin/vendors/[id]/payments/page.tsx` — Payment tracking
   - Assign PO modal component

4. **Components** (300 lines)
   - Vendor score badge, PO status badge, payment status badge
   - PO photo uploader with drag-drop
   - Bank details form
   - Payment history timeline

**Implementation Steps:**
1. Add vendor role to auth guards (middleware)
2. Create vendor layout with sidebar navigation
3. Build vendor dashboard (list active POs with KPIs)
4. Build PO detail page + photo upload
5. Build payments tracking page
6. Build admin vendor pages
7. Wire up all API endpoints
8. Send vendor notifications (PO assigned, QC completed, payment due)

**Testing:**
- [ ] Vendor login → dashboard loads
- [ ] Click PO → detail page with products shown
- [ ] Upload QC photos → verify stored and counted
- [ ] Mark QC complete → order status advances
- [ ] Admin assigns PO → vendor receives email
- [ ] Payment tracking → shows all due dates

---

## 📊 Implementation Roadmap

```
Week 1: Database + Shiprocket Tracking Sync
  ├─ Prisma migrations ✅ DONE
  ├─ BullMQ worker setup
  ├─ Tracking fetch logic
  └─ Order status auto-update

Week 2: Dispute Management
  ├─ Public filing page
  ├─ 48-hour window validation
  ├─ Admin resolution workflow
  └─ Customer notifications

Week 3: Vendor Portal Core
  ├─ Vendor layout + auth guards
  ├─ Vendor dashboard
  ├─ PO detail + QC upload
  └─ Payment tracking

Week 4: Admin + Integration
  ├─ Admin vendor pages
  ├─ PO assignment workflow
  ├─ Payment management
  └─ Integration testing
```

---

## 🔌 API Endpoints Checklist

**Shiprocket:**
- [ ] `POST /api/admin/orders/[id]/ship` (trigger shipment) — EXISTS
- [ ] `POST /webhooks/shiprocket` (handle webhook) — EXISTS
- [ ] `GET /api/admin/orders/[id]/tracking` (tracking details) — TODO
- [ ] Background worker (6h sync) — TODO

**Disputes:**
- [ ] `POST /api/disputes` (public file) — TODO
- [ ] `GET /api/admin/disputes` (list) — EXISTS
- [ ] `GET /api/admin/disputes/[id]` (detail) — TODO
- [ ] `PUT /api/admin/disputes/[id]` (update + resolve) — TODO

**Vendor Portal:**
- [ ] `GET /api/vendor/dashboard` — TODO
- [ ] `GET /api/vendor/po/[poId]` — TODO
- [ ] `POST /api/vendor/po/[poId]/photos` — TODO
- [ ] `PUT /api/vendor/po/[poId]/complete` — TODO
- [ ] `GET /api/vendor/payments` — TODO
- [ ] `GET/PUT /api/vendor/bank-details` — TODO
- [ ] `GET /api/admin/vendors/[id]` (vendor detail) — TODO
- [ ] `GET /api/admin/vendors/[id]/pos` — TODO
- [ ] `GET /api/admin/vendors/[id]/payments` — TODO
- [ ] `POST /api/admin/vendors/[id]/pos/assign` — TODO

---

## 📋 Database Migrations Needed

```bash
# Run this after code changes:
npx prisma db push
npx prisma generate

# Verify models:
npx prisma db execute --stdin < verify-models.sql
```

---

## 🧪 Manual Testing Checklist

**Shiprocket Flow:**
- [ ] Order moves to "packed" status
- [ ] Admin clicks "Create Shipment"
- [ ] Shiprocket API called successfully
- [ ] AWB code returned and stored
- [ ] ShipmentTracking record created
- [ ] Simulate webhook: status → "in_transit"
- [ ] Order status updated automatically
- [ ] Worker runs every 6 hours (check logs)

**Dispute Flow:**
- [ ] Order delivered → email with dispute link
- [ ] Click link → public dispute page loads
- [ ] Try to file after 48h → error
- [ ] File within 48h → success page
- [ ] Admin sees dispute in list
- [ ] Admin clicks "Review" → detail page
- [ ] Admin adds notes + changes status
- [ ] Customer receives resolution email

**Vendor Flow:**
- [ ] Vendor logs in → dashboard loads
- [ ] Shows active POs with deadlines
- [ ] Click PO → detail page
- [ ] Upload QC photos (3 max)
- [ ] Mark QC complete
- [ ] View payment schedule
- [ ] Admin assigns new PO → vendor email
- [ ] Payment marked paid → vendor notified

---

## 🎯 Critical Success Factors

1. **Shiprocket Tracking** — Must sync every 6 hours without manual intervention
2. **Dispute Window** — 48-hour deadline must be enforced (hard block)
3. **Vendor Auth** — Only vendors with role="vendor" can access `/vendor/*`
4. **Photo Uploads** — Must verify files are images, max 3 per PO
5. **Payment Accuracy** — All calculations must use Decimal(10,2)

---

## 💰 Token Budget Note

Due to token constraints this session, the schema foundation has been laid. The next developer should:

1. Run Prisma migrations on connected database
2. Follow the implementation roadmap sequentially (Shiprocket → Disputes → Vendor Portal)
3. Test each section before moving to next
4. Use existing code patterns (API structure, component styling, auth guards)

**Estimated remaining effort:** 80-100 hours over 4 weeks

---

**Next Session:** Begin with Shiprocket tracking sync worker + public dispute filing page

**Generated:** 2026-06-16 by Claude Code  
**Session Token Used:** ~95% of budget
