# WORKFLOW_DETAILED.md — User Journey Maps

## Client Journey (Priya, HR Manager, TechVista, Bangalore, 150 employees, Diwali gifts)

### 1. Discovery: Google search -> giftcraft.in -> homepage (hero banner, trust logos, occasion cards)
### 2. Catalog: Clicks "Diwali Gifts" -> /catalog?occasion=diwali -> adds filters (price, brand) -> URL updates -> shares filtered URL with boss via WhatsApp
### 3. Product Detail: Clicks product -> sees images, printing badge ("Laser Engraved" read-only), 6-tier pricing table, packaging options, delivery estimator, logo upload area
### 4. Gift Builder Entry: Clicks "Add to Gift Builder" -> quantity modal asks "How many packs?" -> enters 150, Corporate -> MOQ 25 satisfied
### 5. Step 1 (Products): Adds 3 products. Each animates into merged box view (Framer Motion spring). Box size auto-updates. Drag to reorder.
### 6. Step 2 (Logo): Uploads company logo. Sees per-product printing badges (read-only: "Laser Engraved", "Screen Printed", "UV Printed"). Note: "Cost included in price." Types branding notes: "Gold colour on flask please." Selects Premium Box + Sleeve + Thank-You Card + Ribbon.
### 7. Step 3 (Shipping): Qty 150, Tier 4 highlighted. Selects Individual Delivery (amber surcharge note). Uploads CSV with 150 addresses. 147 valid, 3 errors. Proceeds with 147.
### 8. Step 4 (Review): Full pricing breakdown. KEY: NO branding line. Razorpay fee SEPARATE line. GST per HSN (18% IGST for flask HSN 7323, 12% IGST for notebook HSN 4820). IGST because Delhi->Bangalore.
### 9. Quote: Downloads PDF (all details, no branding line, Razorpay fee visible). Copies shareable link. Sends to CFO.
### 10. Checkout: CFO approves. Enters GSTIN, pays via Razorpay UPI. Order confirmed. Email + WhatsApp received.
### 11. Tracking: Monitors /orders/GC-0042/track through stages. Gets WhatsApp at ship + delivery.

## Vendor Journey (Rajesh, Borosil)

### 1. Onboarding: "Sell With Us" form -> admin reviews samples + docs -> vendor activated
### 2. Price Confirmation: Every 90 days auto-email listing products + current costs. Confirm or update.
### 3. Order: Receives Vendor PO PDF (product, qty, printing technique, logo file, delivery deadline, cost). Production Spec Sheet attached.
### 4. QC: Uploads 3+ photos (overview, branding close-up, packaging). Admin approves or rejects.
### 5. Payment: Net-30. Invoice logged, payment tracked with UTR reference.

## Admin Journey (Ankit, Arts Shala Ops)

### 1. Dashboard: Shopify-style admin. Revenue card, orders card, pending actions (SLA breaches, design approvals overdue, stale quotes).
### 2. New Order: Opens detail. Reviews products, logo file, branding notes (amber box: "gold colour"). Downloads logo.
### 3. Design: Creates mockups in Photoshop/Canva (Stage 1) or Design Studio (Stage 4). Uploads to order. Sends approval link. Client approves or requests revision.
### 4. Vendor PO: System auto-generates separate POs per vendor. Emails with spec sheets + logo files.
### 5. Production: Monitors timeline. Receives vendor QC photos. Approves quality.
### 6. Assembly: Team packs 150 gift boxes (flask + notebook + pen + box + sleeve + ribbon + card).
### 7. Shipping: Enters AWB/carrier (Stage 1 manual, Stage 2 Shiprocket). Marks shipped. WhatsApp to customer.
### 8. Completion: Delivery confirmed. 48h dispute window. Order archived.
### 9. Bulk Upload: Downloads CSV template -> fills 30 products -> uploads -> validates -> imports.
### 10. Analytics: Weekly review of revenue, top products, margins, quote funnel.

## Key Decision Trees

### Customer wants different printing technique:
Product has standard technique assigned -> customer types note in builder -> admin sees amber note on order -> checks feasibility with vendor -> if possible at same cost: change and proceed. If higher cost: contact customer with revised quote.

### GST routing (CGST+SGST vs IGST):
Delivery pincode first 2 digits -> state code. If state = DL (Delhi): CGST + SGST (half rate each). If any other state: IGST (full rate).

### Individual vs bulk delivery pricing:
Single delivery: bulk shipping rate (lower). Individual: per-address rate (2-3x higher). Amber note shown to customer explaining surcharge.
