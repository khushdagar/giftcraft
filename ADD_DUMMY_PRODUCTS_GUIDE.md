# How to Add Dummy Products to GiftCraft Dashboard

**Goal:** Add 2-3 products to each category with dummy prices and Unsplash images to test the admin dashboard

---

## Option 1: Using the API Script (Recommended) ✅

### Prerequisites
- Dev server running: `npm run dev` (port 3000)
- Categories already exist in the database
- You're logged in as `super_admin`

### Step 1: Run the Seeding Script

```bash
cd apps/web
npx tsx scripts/add-dummy-products-via-api.ts
```

**What it does:**
- ✅ Reads all categories from the database
- ✅ Creates 2-3 dummy products per category
- ✅ Uses Unsplash images (free, no auth required)
- ✅ Adds complete 6-tier pricing structure
- ✅ Assigns products to categories

**Output:**
```
🌱 GiftCraft Dummy Product Seeder

📂 Fetching categories...
✅ Found 3 categories
   - Corporate: cat-123
   - Apparel: cat-456
   - Accessories: cat-789

🏷️  Category: "Corporate"
════════════════════════════════════════════════════════════

➕ Adding product: "Premium Corporate Mug - White"
   ✅ Created: prod-001
   - SKU: MUG-001-WHITE
   - Price: ₹299 (Tier 1: 25-49 units)
   - Image: https://images.unsplash.com/photo-1514432324607...

[... more products ...]

📊 SEEDING COMPLETE
════════════════════════════════════════════════════════════
✅ Products added: 8
❌ Products failed: 0
```

### Step 2: Verify in Dashboard

1. Open browser: **http://localhost:3000/admin/products**
2. You should see all newly created products
3. Click on any product to verify:
   - ✅ Images from Unsplash loaded correctly
   - ✅ All 6 price tiers present
   - ✅ Category assignment correct
   - ✅ Variant colors, SKU, description all present

---

## Option 2: Manual Addition via Dashboard UI

If you prefer to test the form manually:

### Step 1: Create First Product

1. Go to: **http://localhost:3000/admin/products/new**
2. Fill in the form:

**Basic Info Tab:**
- **Name:** Premium Corporate Mug - White
- **Slug:** premium-corporate-mug-white (auto-generated)
- **SKU:** MUG-001-WHITE
- **Brand:** GiftCraft
- **Short Description:** Perfect for corporate gifting
- **Long Description:** High-quality ceramic mug with your company logo. Durable and dishwasher safe.
- **Material:** Ceramic
- **Dimensions:** 11oz
- **Lead Time:** 7 days
- **Status:** Active
- **Featured:** Toggle ON
- **Eco Certified:** Toggle OFF

**Pricing Tab:**
- **Tier 1:** Min 25, Max 49 → Cost ₹120, Sell ₹299
- **Tier 2:** Min 50, Max 99 → Cost ₹110, Sell ₹275
- **Tier 3:** Min 100, Max 249 → Cost ₹100, Sell ₹249
- **Tier 4:** Min 250, Max 499 → Cost ₹90, Sell ₹225
- **Tier 5:** Min 500, Max 999 → Cost ₹80, Sell ₹199
- **Tier 6:** Min 1000, Max ∞ → Cost ₹70, Sell ₹179

**Images Tab:**
- Upload image from Unsplash:
  ```
  https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=500&h=500&fit=crop
  ```
  (Copy the URL and paste into browser, then right-click "Save Image As" to upload)

**Categories Tab:**
- Select: "Corporate" (or whatever category you created)

**Click: "Create Product"**

### Step 2: Verify in List

After creation:
1. You'll be redirected to `/admin/products`
2. You should see the new product in the list
3. ✅ Product name appears
4. ✅ Featured badge shows
5. ✅ Category shows
6. ✅ Price tier shows

### Step 3: Click to Edit & Verify Details

1. Click the product in the list or click "Edit"
2. Verify all fields are saved correctly:
   - ✅ Name, slug, SKU
   - ✅ All 6 price tiers intact
   - ✅ Image loaded from CDN URL
   - ✅ Category assignment
   - ✅ Status = Active

### Step 4: Repeat for Other Products

Use the sample products below to add 2-3 products to each of your categories.

---

## Sample Dummy Products

### Category: Corporate

#### Product 1: Premium Corporate Mug
```json
{
  "name": "Premium Corporate Mug - White",
  "slug": "premium-corporate-mug-white",
  "sku": "MUG-001-WHITE",
  "brand": "GiftCraft",
  "descriptionShort": "Perfect for corporate gifting",
  "descriptionLong": "High-quality ceramic mug with your company logo. Durable and dishwasher safe.",
  "material": "Ceramic",
  "dimensions": "11oz",
  "lengthCm": 8,
  "widthCm": 8,
  "heightCm": 10,
  "weightG": 350,
  "leadTimeDays": 7,
  "printingTechnique": "screen_print",
  "printingPosition": "Front",
  "isFeatured": true,
  "isEcoCertified": false,
  "image": "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 120, "sellPrice": 299 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 110, "sellPrice": 275 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 100, "sellPrice": 249 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 90, "sellPrice": 225 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 80, "sellPrice": 199 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 70, "sellPrice": 179 }
  ]
}
```

#### Product 2: Custom Printed T-Shirt
```json
{
  "name": "Custom Printed T-Shirt",
  "slug": "custom-printed-tshirt",
  "sku": "TSH-001-CUSTOM",
  "brand": "GiftCraft",
  "descriptionShort": "100% cotton comfort wear",
  "descriptionLong": "Premium 100% cotton t-shirt with full customization. Perfect for team uniforms or branded merchandise.",
  "material": "Cotton",
  "dimensions": "M-XL sizes available",
  "lengthCm": 70,
  "widthCm": 50,
  "heightCm": 5,
  "weightG": 200,
  "leadTimeDays": 14,
  "printingTechnique": "screen_print",
  "printingPosition": "Front & Back",
  "isFeatured": true,
  "isEcoCertified": true,
  "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 180, "sellPrice": 399 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 160, "sellPrice": 349 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 140, "sellPrice": 299 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 120, "sellPrice": 249 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 100, "sellPrice": 199 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 80, "sellPrice": 149 }
  ]
}
```

#### Product 3: Stainless Steel Water Bottle
```json
{
  "name": "Stainless Steel Water Bottle",
  "slug": "stainless-steel-water-bottle",
  "sku": "BOT-001-STEEL",
  "brand": "GiftCraft",
  "descriptionShort": "Keep drinks hot or cold for hours",
  "descriptionLong": "Double-wall insulated stainless steel bottle. Keeps beverages at ideal temperature for any occasion.",
  "material": "Stainless Steel",
  "dimensions": "500ml",
  "lengthCm": 7,
  "widthCm": 7,
  "heightCm": 22,
  "weightG": 450,
  "leadTimeDays": 10,
  "printingTechnique": "laser_engraving",
  "printingPosition": "Side",
  "isFeatured": false,
  "isEcoCertified": true,
  "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 250, "sellPrice": 599 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 230, "sellPrice": 549 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 210, "sellPrice": 499 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 190, "sellPrice": 449 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 170, "sellPrice": 399 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 150, "sellPrice": 349 }
  ]
}
```

### Category: Apparel

#### Product 1: Premium Polo Shirt
```json
{
  "name": "Premium Polo Shirt",
  "slug": "premium-polo-shirt",
  "sku": "POL-001-PREMIUM",
  "material": "Polyester-Cotton Blend",
  "dimensions": "S-XXL sizes",
  "image": "https://images.unsplash.com/photo-1576995578007-7b18b2a20a2e?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 220, "sellPrice": 499 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 200, "sellPrice": 449 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 180, "sellPrice": 399 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 160, "sellPrice": 349 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 140, "sellPrice": 299 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 120, "sellPrice": 249 }
  ]
}
```

#### Product 2: Baseball Cap
```json
{
  "name": "Baseball Cap with Embroidery",
  "slug": "baseball-cap-embroidery",
  "sku": "CAP-001-EMB",
  "material": "Cotton Twill",
  "dimensions": "One size fits all",
  "image": "https://images.unsplash.com/photo-1543163521-9145f931371e?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 140, "sellPrice": 299 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 130, "sellPrice": 275 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 120, "sellPrice": 249 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 110, "sellPrice": 225 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 100, "sellPrice": 199 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 90, "sellPrice": 175 }
  ]
}
```

### Category: Accessories

#### Product 1: Premium Pen Set
```json
{
  "name": "Premium Branded Pen Set",
  "slug": "premium-branded-pen-set",
  "sku": "PEN-001-SET",
  "material": "Metal & Plastic",
  "dimensions": "Set of 3 pens",
  "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 300, "sellPrice": 699 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 280, "sellPrice": 649 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 260, "sellPrice": 599 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 240, "sellPrice": 549 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 220, "sellPrice": 499 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 200, "sellPrice": 449 }
  ]
}
```

#### Product 2: Gift Box
```json
{
  "name": "Corporate Gift Box Deluxe",
  "slug": "corporate-gift-box-deluxe",
  "sku": "BOX-001-DELUXE",
  "material": "Cardboard & Velvet",
  "dimensions": "Large (25x20x10cm)",
  "image": "https://images.unsplash.com/photo-1513885535140-d64b0184cbf3?w=500&h=500&fit=crop",
  "priceTiers": [
    { "tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 80, "sellPrice": 199 },
    { "tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 70, "sellPrice": 175 },
    { "tier": 3, "minQty": 100, "maxQty": 249, "costPrice": 60, "sellPrice": 149 },
    { "tier": 4, "minQty": 250, "maxQty": 499, "costPrice": 50, "sellPrice": 125 },
    { "tier": 5, "minQty": 500, "maxQty": 999, "costPrice": 40, "sellPrice": 99 },
    { "tier": 6, "minQty": 1000, "maxQty": null, "costPrice": 30, "sellPrice": 79 }
  ]
}
```

---

## Verification Checklist ✅

After adding products, verify the following in the dashboard:

### Product List Page (`/admin/products`)
- [ ] All products appear in the list
- [ ] Product names are correct
- [ ] Category assignments show correctly
- [ ] Base tier price shows (₹299, ₹399, etc.)
- [ ] Featured badge visible where applicable
- [ ] Search functionality works
- [ ] Filter by status works

### Product Detail Page (`/admin/products/[id]`)
- [ ] ✅ Name, slug, SKU are correct
- [ ] ✅ Description (short & long) displays
- [ ] ✅ Material, dimensions, weight fields populated
- [ ] ✅ Image loads from Unsplash CDN (check console for no 404 errors)
- [ ] ✅ All 6 price tiers present and correct
- [ ] ✅ Category assignment shown
- [ ] ✅ Printing technique visible
- [ ] ✅ Featured and Eco-certified toggles show correct state

### Image Upload Verification
- [ ] Images load in the image tab (from Unsplash CDN)
- [ ] Image is marked as "Primary"
- [ ] Image thumbnail displays correctly
- [ ] CDN URL format: `https://giftcraft-dev.sfo3.cdn.digitaloceanspaces.com/...`

### Price Tier Verification
- [ ] All 6 tiers present
- [ ] Tier 1: 25-49 units
- [ ] Tier 2: 50-99 units
- [ ] Tier 3: 100-249 units
- [ ] Tier 4: 250-499 units
- [ ] Tier 5: 500-999 units
- [ ] Tier 6: 1000+ units
- [ ] No gaps or overlaps in quantity ranges
- [ ] Prices increase as quantity decreases (expected B2B pricing)

### Database Check
- [ ] Product appears in database
- [ ] Price tiers linked correctly
- [ ] Images stored in database with correct URLs
- [ ] Categories linked properly

---

## Troubleshooting

### Products Not Appearing
1. Check browser console for errors (F12 → Console tab)
2. Verify you're logged in as `super_admin`
3. Check dev server logs for 401/403 errors
4. Try refreshing the page (Ctrl+R)

### Images Not Loading
1. Check that Unsplash URLs are not blocked (proxy/firewall)
2. Verify CDN is accessible: `https://giftcraft-dev.sfo3.cdn.digitaloceanspaces.com`
3. Check browser console for 404 errors on image URLs

### Price Tiers Not Saving
1. Ensure all 6 tiers are filled (tier 1-6)
2. Check that quantity ranges don't overlap
3. Verify prices are positive numbers (no ₹ symbol in input)
4. Check browser console for validation errors

### Missing Categories
1. Go to `/admin/categories/new` to create categories first
2. Common categories: Corporate, Apparel, Accessories, Gifts, Drinkware

---

## Expected Results

After adding all sample products:

✅ **8-9 total products** added  
✅ **3 categories** populated with 2-3 products each  
✅ **48-54 price tiers** (6 per product)  
✅ **All images** loading from Unsplash  
✅ **Dashboard shows** all data correctly  
✅ **No console errors**  

---

## Next Steps

Once products are added and verified:

1. **Test Product Builder:** Go to `/products` → Select a product → See prices update
2. **Test Quotes:** Build a gift pack → Request quote → See all prices calculated
3. **Test Admin Edit:** Edit a product → Change price → Verify PriceAuditLog
4. **Test Product Variants:** Add variants in edit page
5. **Test Bulk Operations:** Use CSV import for more products

---

**Need Help?** Check the audit reports:
- `ADMIN_DASHBOARD_AUDIT_2026_06_16.md` — Dashboard verification
- `COMPLETE_PLATFORM_STATUS_2026_06_16.md` — Overall platform status
