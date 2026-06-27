# GiftCraft Occasions & Collections Guide

## 📋 Overview

GiftCraft has two complementary systems for organizing products:

1. **Occasions** - Predefined occasions (Diwali, Weddings, Birthdays, etc.)
2. **Collections** - Curated product bundles with custom themes

---

## 🎁 How OCCASIONS Work

### Database Schema

```
OccasionConfig {
  id: String (unique ID)
  name: String (e.g., "Diwali")
  slug: String (unique URL slug, e.g., "diwali")
  icon: String (emoji, e.g., "🪔")
  gradient: String (Tailwind color, e.g., "from-orange-400 to-yellow-400")
  description: String (e.g., "Light up your relationships")
  sortOrder: Int (controls display order)
  isActive: Boolean (visible to customers)
  products: ProductOccasion[] (junction table)
}

ProductOccasion {
  productId: String (links to Product)
  occasionId: String (links to OccasionConfig)
}
```

### What Occasions Do

- **Homepage Hero**: Display occasion cards in the "Gifting for Every Moment" section
- **Catalog Filters**: Allow customers to filter products by occasion
- **Product Pages**: Show which occasions a product is suitable for
- **Builder Entry**: MOQ requirements can vary by occasion (Corporate: 25, Party: 10)

### Current Occasions in Database

| Occasion | Icon | Slug | Usage |
|----------|------|------|-------|
| Diwali | 🪔 | diwali | Festival gifting |
| Employee Recognition | 💼 | employee-recognition | Workplace rewards |
| Weddings | 💒 | weddings | Wedding favors |
| Birthdays | 🎂 | birthdays | Birthday gifts |
| Anniversaries | 💝 | anniversaries | Milestone celebrations |

---

## 🎯 How to Add Products to Occasions

### Method 1: Direct Database Query (Recommended)

```sql
-- Add a product to an occasion
INSERT INTO "ProductOccasion" ("productId", "occasionId")
VALUES ('product_id_here', 'occasion_id_here');

-- Example: Add "Premium Roller Pen Set" to Diwali
INSERT INTO "ProductOccasion" ("productId", "occasionId")
VALUES ('prod_xyz123', (SELECT id FROM "OccasionConfig" WHERE slug = 'diwali'));
```

### Method 2: Using Prisma CLI

In your backend/script:

```typescript
// Get the occasion
const occasion = await prisma.occasionConfig.findUnique({
  where: { slug: 'diwali' },
});

// Add product to occasion
await prisma.productOccasion.create({
  data: {
    productId: 'product_id_here',
    occasionId: occasion!.id,
  },
});

// Add multiple products
await prisma.productOccasion.createMany({
  data: [
    { productId: 'prod1', occasionId: occasion!.id },
    { productId: 'prod2', occasionId: occasion!.id },
    { productId: 'prod3', occasionId: occasion!.id },
  ],
});
```

### Method 3: Create Admin UI (TODO)

Currently, there's **NO admin UI** for managing occasion-product relationships. You could build:

```typescript
// Suggested admin page structure:
// /admin/occasions
// /admin/occasions/[id]/edit
// /admin/occasions/[id]/products

// Would allow:
// ✓ Create/Edit occasions
// ✓ Upload icons and hero images
// ✓ Search and add products to occasions
// ✓ Reorder products within occasion
// ✓ Set occasion-specific MOQs
```

---

## 📦 How COLLECTIONS Work

### Database Schema

```
Collection {
  id: String (unique ID)
  name: String (e.g., "Corporate Essentials")
  slug: String (unique URL slug)
  description: String
  heroImage: String (collection banner image)
  sortOrder: Int
  isActive: Boolean
  products: CollectionProduct[] (junction table)
}

CollectionProduct {
  collectionId: String
  productId: String
  sortOrder: Int (order within collection)
}
```

### What Collections Do

- **Browse Page**: Dedicated `/collections` page listing all collections
- **Collection Detail**: `/collections/[slug]` shows all products in that collection
- **Homepage**: Can feature collections as marketing content
- **Customer Browsing**: Browse themed product bundles

---

## 🛠️ How to Create Collections & Add Products

### Step 1: Create a Collection (Admin UI)

1. Go to **Admin → Collections**
2. Click **"+ New Collection"**
3. Fill in:
   - **Name**: e.g., "Eco-Friendly Gifts"
   - **Slug**: Auto-generated, can edit (e.g., "eco-friendly-gifts")
   - **Description**: Marketing copy
   - **Hero Image URL**: Banner image
   - **Sort Order**: Lower = appears first
   - **Active**: Toggle to show/hide

4. Click **"Create Collection"**

### Step 2: Add Products to Collection (Database)

⚠️ **Current Limitation**: Admin UI doesn't have product picker yet.

#### Method 1: Direct SQL

```sql
-- Add products to a collection
INSERT INTO "CollectionProduct" ("collectionId", "productId", "sortOrder")
VALUES 
  ('collection_id', 'product1_id', 0),
  ('collection_id', 'product2_id', 1),
  ('collection_id', 'product3_id', 2);

-- Example: Add 5 products to "Eco-Friendly Gifts" collection
INSERT INTO "CollectionProduct" ("collectionId", "productId", "sortOrder")
SELECT 
  (SELECT id FROM "Collection" WHERE slug = 'eco-friendly-gifts'),
  p.id,
  ROW_NUMBER() OVER (ORDER BY p.name) - 1
FROM "Product" p
WHERE p."isEcoCertified" = true
LIMIT 5;
```

#### Method 2: Prisma Script

```typescript
// Get or create collection
const collection = await prisma.collection.upsert({
  where: { slug: 'eco-friendly-gifts' },
  update: {},
  create: {
    name: 'Eco-Friendly Gifts',
    slug: 'eco-friendly-gifts',
    description: 'Sustainable products for conscious gifters',
    heroImage: 'https://...',
    isActive: true,
    sortOrder: 0,
  },
});

// Find products to add (e.g., all eco-certified)
const products = await prisma.product.findMany({
  where: { isEcoCertified: true },
  take: 10,
});

// Add to collection
await prisma.collectionProduct.createMany({
  data: products.map((p, idx) => ({
    collectionId: collection.id,
    productId: p.id,
    sortOrder: idx,
  })),
});
```

### Step 3: Edit Collection & Reorder Products

1. Go to **Admin → Collections**
2. Click **"Edit"** on any collection
3. Update name, description, image, status
4. Click **"Save Changes"**

⚠️ **Note**: Product reordering must be done via database:

```sql
UPDATE "CollectionProduct" 
SET "sortOrder" = 1 
WHERE "collectionId" = 'col_xyz' AND "productId" = 'prod_abc';
```

---

## 🎨 Occasions + Collections Strategy

### Recommended Setup

```
OCCASIONS (for filtering by use-case)
├── Diwali
├── Weddings
├── Employee Recognition
└── Birthdays

COLLECTIONS (for curated bundles)
├── "Diwali Premium Hampers" (curated Diwali products)
├── "Budget-Friendly Corporate" (curated corporate gifts under ₹500)
├── "Eco-Friendly Gifts" (all eco-certified products)
└── "New Arrivals" (latest products)
```

### Customer Journey

```
Homepage
├── Browse by Occasion (quick filter)
│   └── Click "Diwali" → Show all products tagged with Diwali occasion
│
├── Browse Collections (curated themes)
│   └── Click "Diwali Premium Hampers" → Show specific handpicked products
│
└── Catalog
    └── Filter by Occasion AND Category AND Price
```

---

## 📊 API Endpoints

### Get All Occasions
```
GET /api/occasions
Response: [
  {
    icon: "🪔",
    name: "Diwali",
    desc: "Light up your relationships",
    bg: "from-orange-400 to-yellow-400",
    slug: "diwali"
  }
]
```

### Get Collection Details
```
GET /api/collections/[slug]
Response: {
  id: "col_xyz",
  name: "Diwali Premium Hampers",
  slug: "diwali-premium-hampers",
  description: "...",
  heroImage: "...",
  products: [...]
}
```

### Get All Collections
```
GET /api/collections
Response: [
  {
    id: "col_1",
    name: "Diwali Premium Hampers",
    slug: "diwali-premium-hampers",
    productCount: 12
  }
]
```

---

## 🚀 Next Steps to Build Full Admin UI

### Priority 1: Occasions Admin Page
```typescript
// /admin/occasions
// /admin/occasions/new
// /admin/occasions/[id]/edit
// /admin/occasions/[id]/products

Features:
✓ Create/Edit/Delete occasions
✓ Manage occasion-product relationships
✓ Bulk add products to occasions
✓ Reorder products within occasion
```

### Priority 2: Collections Product Manager
```typescript
// /admin/collections/[id]/products

Features:
✓ Search and add products
✓ Drag-to-reorder products
✓ Preview collection
✓ Bulk import products
```

### Priority 3: Occasions Display
```typescript
// Homepage improvements:
✓ Show product count per occasion
✓ Link to occasion detail page
✓ Occasion landing page: /occasions/[slug]
```

---

## 💡 Pro Tips

### Avoid Data Duplication
- Use **Occasions** for product categorization (inherent properties)
- Use **Collections** for marketing curation (handpicked themes)

### Example
- ❌ Don't create "Budget Gifts" as an occasion
- ✅ Instead, create "Budget-Friendly Corporate" collection + filter by price

### Performance
- Occasions: Static data, cache for 1 hour
- Collections: Less frequently changing, cache for 30 minutes
- ProductOccasion: Junction table, no caching needed

### SEO
- Each collection gets its own `/collections/[slug]` page (good for SEO)
- Can add meta tags, Open Graph images per collection
- Collections can rank in search for niche keywords

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Data model definitions |
| `app/api/occasions/route.ts` | Fetch occasions |
| `app/api/collections/route.ts` | Fetch collections |
| `app/admin/collections/page.tsx` | Manage collections |
| `app/(customer)/collections/page.tsx` | Browse collections |
| `app/(customer)/collections/[slug]/page.tsx` | Collection detail |

