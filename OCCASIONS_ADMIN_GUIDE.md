# 🎁 Occasions Admin Dashboard - User Guide

## Overview

GiftCraft now has a complete admin dashboard for managing occasions! You can create, edit, delete occasions, and easily link products to them.

---

## 📍 Navigation

**Admin Menu → Occasions**

All occasion management happens in one place:
- `/admin/occasions` - List all occasions
- `/admin/occasions/new` - Create new occasion
- `/admin/occasions/[id]/edit` - Edit occasion & manage products

---

## 🚀 Getting Started

### 1. View All Occasions

Go to **Admin → Occasions** to see:
- ✅ All occasions with their icons
- ✅ Product count for each occasion
- ✅ Active/Inactive status
- ✅ Edit buttons

### 2. Create a New Occasion

Click **"+ New Occasion"** button and fill in:

#### Basic Information
- **Occasion Name** (required)
  - Examples: Diwali, Weddings, Birthdays, Employee Recognition
  - Enter any name you want

- **Slug** (auto-generated)
  - URL-friendly identifier
  - Auto-generated from name, but you can edit
  - Example: "diwali" from "Diwali"
  - Used in URLs like `/occasions/diwali`

- **Description** (optional)
  - Marketing copy shown to customers
  - Example: "Light up your relationships with Diwali gifts"

#### Icon & Styling

- **Choose Icon** (emoji)
  - Pick from 15 popular emojis
  - Examples: 🎁 🪔 💒 🎂 💝 💼 🎉
  - Selected icon is highlighted

- **Choose Color Gradient**
  - Pick from 10 beautiful Tailwind gradients
  - Examples:
    - 🟠 Orange to Yellow (Diwali vibes)
    - 🔵 Blue to Cyan (Corporate)
    - 💚 Green to Emerald (Eco-friendly)
    - 💜 Purple to Pink (Premium)

#### Settings

- **Sort Order**
  - Lower numbers = appear first on homepage
  - Example: Diwali (0), Weddings (1), Birthdays (2)

- **Active Status**
  - ✅ Checked = visible to customers
  - ⚪ Unchecked = hidden from homepage

### 3. Click "Create Occasion"

✅ Occasion created!
📍 You'll be taken back to the occasions list

---

## ✏️ Edit an Occasion

1. Go to **Admin → Occasions**
2. Click **"Edit"** button on any occasion
3. Update any fields:
   - Name
   - Slug
   - Icon (emoji picker)
   - Gradient (color picker)
   - Description
   - Sort order
   - Active status
4. Click **"Update Occasion"**

---

## 🔗 Link Products to Occasions

### Step 1: Open Occasion Editor

1. Go to **Admin → Occasions**
2. Click **"Edit"** on an occasion (e.g., "Diwali")

### Step 2: Search Products

In the **"Linked Products"** section:

1. Type in the search box:
   - Product name (e.g., "backpack", "notebook")
   - Brand name (e.g., "Arts Shala", "Citizen")
   - Both are searched in real-time

2. **Search Results** appear instantly
   - Shows product image, name, brand
   - Only shows products NOT already linked

### Step 3: Add Product

1. Find the product you want
2. Click the **Green "+"** button on the right
3. Product is added and removed from search results
4. Success message appears ✅

### Step 4: See Linked Products

Products are shown in the **"Products in this occasion"** section:

- Shows all linked products
- Hover over product → **"X"** button appears
- Product image + name + brand

---

## ❌ Remove Products from Occasions

1. Find the product in the **"Products in this occasion"** section
2. Hover over the product card
3. Click the **Red "X"** button
4. Product is removed from occasion
5. It reappears in search results

---

## 🗑️ Delete an Occasion

1. Go to **Admin → Occasions**
2. Click **"Edit"** on an occasion
3. Scroll to bottom
4. Click **"Delete Occasion"** button
5. Confirm deletion

**What happens:**
- ✅ Occasion is deleted
- ✅ Product-occasion links are removed
- ⚠️ Products themselves are NOT deleted
- ⚠️ Cannot be undone!

---

## 💡 Example: Create "Diwali" Occasion

### Step 1: Create Occasion

1. Go to **Admin → Occasions**
2. Click **"+ New Occasion"**
3. Fill in:
   - **Name**: Diwali
   - **Slug**: diwali (auto-generated)
   - **Description**: "Light up your relationships with Diwali gifts"
   - **Icon**: 🪔 (selected from picker)
   - **Gradient**: Orange to Yellow
   - **Sort Order**: 0 (appears first)
   - **Active**: ✅ Checked
4. Click **"Create Occasion"**

### Step 2: Add Products

1. Click **"Edit"** on "Diwali" occasion
2. Search for products:
   - Search: "notebook" → Add A5 Hardbound Notebook
   - Search: "pen" → Add Premium Roller Pen Set
   - Search: "mug" → Add Apex Duffle mug
   - Search: "t-shirt" → Add branded T-shirt
3. You now have 4 products in Diwali occasion

### Step 3: View on Homepage

- Homepage shows Diwali card with:
  - 🪔 Icon
  - Orange-Yellow gradient
  - "Light up your relationships..." description
  - "Explore 4 items →" link

- When customers click → Shows only Diwali products in catalog

---

## 🎯 Best Practices

### Naming
- ✅ Use clear, memorable names
- ✅ Use proper nouns (Diwali, Birthdays, Employee Recognition)
- ❌ Avoid abbreviations (not "EMP REC")
- ❌ Avoid special characters (slugs handle them)

### Slugs
- ✅ Keep lowercase and hyphenated
- ✅ Examples: "diwali", "employee-recognition", "new-year"
- ✅ Auto-generated, but customize if needed

### Icons
- ✅ Pick icons that represent the occasion
- ✅ Diwali → 🪔 (lamp)
- ✅ Weddings → 💒 (chapel)
- ✅ Birthdays → 🎂 (cake)
- ❌ Don't use unrelated emojis

### Gradients
- ✅ Choose warm colors for festive occasions (Diwali)
- ✅ Choose cool colors for professional occasions (Corporate)
- ✅ Choose green for eco-friendly occasions

### Sort Order
- ✅ 0 = Homepage hero position (featured)
- ✅ 1, 2, 3... = Less prominent positions
- ✅ Use negative numbers if needed (-1, -2, ...)

### Products
- ✅ Add 5-50 products per occasion (good variety)
- ✅ Mix product categories (gifts, apparel, accessories)
- ✅ Include different price points
- ❌ Don't link same product twice (system prevents this)

---

## 🐛 Troubleshooting

### Search not working?
- Make sure you're typing in the search box
- Check spelling (search is case-insensitive)
- Try searching by brand instead

### Product already linked?
- You'll see error "Product already linked to this occasion"
- Product won't appear in search results if already linked
- You can still remove and re-add if needed

### Can't delete occasion?
- Make sure you're authenticated as super_admin
- Linked products won't prevent deletion (they're unlinked automatically)
- Deletion is permanent and can't be undone

### Changes not showing?
- Click "Update Occasion" to save changes
- Refresh page if needed
- Changes take effect immediately

---

## 📊 What Occasions Do

### Homepage
- Appears in "Gifting for Every Moment" section
- Shows occasion card with icon, gradient, description
- Customers click to browse products for that occasion

### Catalog Filter
- Customers can filter products by occasion
- Shows count of products per occasion
- Multi-select (can choose multiple occasions)

### Product Pages
- Shows which occasions a product belongs to
- Helps customers find relevant products

### Builder Entry
- Some occasions may have special MOQ rules
- (Example: Corporate = 25 units, Party = 10 units)

---

## 🔄 API Integration

Occasions are automatically synced via:

**GET /api/occasions**
- Returns all active occasions
- Used by homepage, catalog, mobile apps

**GET /api/products?occasion=diwali**
- Returns products for specific occasion
- Used by catalog filtering

---

## 📝 Checklist: Setting Up Occasions

- [ ] Create "Diwali" occasion
- [ ] Create "Weddings" occasion
- [ ] Create "Birthdays" occasion
- [ ] Create "Employee Recognition" occasion
- [ ] Add 10-20 products to each occasion
- [ ] Test filtering on homepage
- [ ] Test filtering in catalog
- [ ] Check that icons display correctly
- [ ] Check that gradients look good

---

## 🚀 Next Steps

Once occasions are set up:
1. ✅ Customers can browse by occasion on homepage
2. ✅ Catalog has occasion filters
3. ✅ Product recommendations based on occasion
4. ✅ Marketing can highlight seasonal occasions

---

## 📞 Need Help?

### Common Tasks

| Task | Steps |
|------|-------|
| Create occasion | Admin → Occasions → + New → Fill form → Create |
| Add product | Admin → Occasions → Edit → Search → + button |
| Remove product | Admin → Occasions → Edit → Hover product → X |
| Edit occasion | Admin → Occasions → Edit → Update |
| Delete occasion | Admin → Occasions → Edit → Delete (bottom) |
| Change icon | Admin → Occasions → Edit → Pick emoji → Update |
| Change color | Admin → Occasions → Edit → Pick gradient → Update |

---

## 💪 You're All Set!

The occasions admin dashboard is fully functional. You can now:
- ✅ Manage all occasions in one place
- ✅ Add/remove products easily with search
- ✅ Customize icons and colors
- ✅ Control visibility and ordering
- ✅ See real-time updates on homepage

**Enjoy managing occasions!** 🎉
