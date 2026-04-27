#!/bin/bash
# Add Apex Duffle product via API

set -e

echo "🚀 Adding Apex Duffle product..."
echo

# Create temp directory for images
TEMP_DIR=".temp-images"
mkdir -p "$TEMP_DIR"

# Image URLs
IMG1="https://cdn.swagupadmin.com/aloha/media/0edabc02-d93b-4cf4-8f61-f19675a7d15a.webp"
IMG2="https://cdn.swagupadmin.com/aloha/media/da967c86-f903-4286-ae91-096eb3534e70.png"

echo "📥 Downloading images..."
curl -s "$IMG1" -o "$TEMP_DIR/apex-1.webp" && echo "✓ Image 1 downloaded"
curl -s "$IMG2" -o "$TEMP_DIR/apex-2.png" && echo "✓ Image 2 downloaded"
echo

# Product data JSON (using HSN ID - we'll use the common one for bags)
# Note: You may need to update the hsnId if 4205 maps to different ID in your DB
read -r -d '' PRODUCT_JSON << 'EOF' || true
{
  "name": "Apex Duffle",
  "slug": "apex-duffle",
  "brand": "Arts Shala",
  "sku": "APEX-DUFFLE-01",
  "descriptionShort": "A sleek duffel bag built for versatility, ideal for travel or gym use.",
  "descriptionLong": "A sleek duffel bag built for versatility, ideal for travel or gym use. Made with recycled PU, this duffel includes a removable padded crossbody strap, trolley sleeve, and organized interior compartments. Its spacious design accommodates daily essentials, while thoughtful features like multiple pockets and sturdy handles ensure comfort and convenience on the go.",
  "material": "Recycled PU (Polyurethane)",
  "weightG": 580,
  "leadTimeDays": 10,
  "printingTechnique": "embroidery",
  "printingPosition": "Front Center, Back",
  "status": "active",
  "isFeatured": true,
  "isEcoCertified": true,
  "hsnId": "4205",
  "priceTiers": [
    {"tier": 1, "minQty": 25, "maxQty": 49, "costPrice": 150, "sellPrice": 192.00},
    {"tier": 2, "minQty": 50, "maxQty": 99, "costPrice": 142, "sellPrice": 182.36},
    {"tier": 3, "minQty": 100, "maxQty": 149, "costPrice": 138, "sellPrice": 175.72},
    {"tier": 4, "minQty": 150, "maxQty": 249, "costPrice": 137, "sellPrice": 174.80},
    {"tier": 5, "minQty": 250, "maxQty": 499, "costPrice": 133, "sellPrice": 170.28},
    {"tier": 6, "minQty": 500, "maxQty": 999, "costPrice": 124, "sellPrice": 158.42},
    {"tier": 7, "minQty": 1000, "maxQty": 4999, "costPrice": 123.5, "sellPrice": 158.17},
    {"tier": 8, "minQty": 5000, "maxQty": null, "costPrice": 123, "sellPrice": 157.97}
  ]
}
EOF

echo "📦 Sending product creation request..."
echo "Note: Make sure you're authenticated and the API is running on http://localhost:4000"
echo

# Send API request with images
curl -X POST http://localhost:4000/api/admin/products \
  -F "data=$PRODUCT_JSON" \
  -F "images=@$TEMP_DIR/apex-1.webp" \
  -F "images=@$TEMP_DIR/apex-2.png" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -v

echo
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"
echo "✅ Done!"
