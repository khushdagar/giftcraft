# Image Operations Guide

Complete guide for product image upload, update, and delete operations.

## Architecture Overview

### Image Upload Flow

```
User selects images in ProductForm
    ↓
FormData created with file(s)
    ↓
POST /api/admin/products/[id]/images
    ↓
API validates files (size, type)
    ↓
uploadToDigitalOcean() - AWS Sig V4 auth
    ↓
Digital Ocean Spaces storage
    ↓
prisma.productImage.create() - DB persistence
    ↓
Toast notification with results
    ↓
Images displayed in gallery
```

## API Endpoints

### 1. Upload Images

**Endpoint:** `POST /api/admin/products/[id]/images`

**Request:**
```typescript
const formData = new FormData();
formData.append('images', file1);  // File object
formData.append('images', file2);  // Multiple files allowed

const response = await fetch(`/api/admin/products/${productId}/images`, {
  method: 'POST',
  body: formData,
});
```

**Response:**
```json
{
  "success": true,
  "uploadedCount": 2,
  "failedCount": 0,
  "failedImages": [],
  "images": [
    {
      "id": "img-id-1",
      "url": "https://cdn.example.com/products/...",
      "isPrimary": true,
      "sortOrder": 0,
      "altText": "image-name"
    }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "uploadedCount": 1,
  "failedCount": 1,
  "failedImages": [
    "large-file.png: File exceeds 5MB limit"
  ],
  "images": [...]
}
```

**Validation:**
- File size: Max 5MB per file
- Formats: PNG, JPG, WebP (any MIME type supported)
- Multiple files: Yes, processed in parallel
- Authentication: super_admin role required
- Database persistence: Immediate (not deferred until form save)

---

### 2. Delete Image

**Endpoint:** `DELETE /api/admin/products/[id]/images?imageId=[imageId]`

**Request:**
```typescript
const response = await fetch(
  `/api/admin/products/${productId}/images?imageId=${imageId}`,
  { method: 'DELETE' }
);
```

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- Deletes from database immediately
- If deleted image was primary, first remaining image becomes primary
- Images reordered by sortOrder
- Authentication: super_admin role required

---

### 3. Get Product with Images

**Endpoint:** `GET /api/admin/products/[id]`

**Response:**
```json
{
  "id": "product-id",
  "name": "Product Name",
  "images": [
    {
      "id": "img-1",
      "url": "https://cdn...",
      "isPrimary": true,
      "sortOrder": 0,
      "altText": "name"
    }
  ],
  "priceTiers": [...],
  "categories": [...],
  "occasions": [...]
}
```

---

## File Handling Details

### Image Upload Process

1. **File Validation**
   - Check file size (≤5MB)
   - Validate File instance type
   - Get MIME type from file.type

2. **Digital Ocean Upload**
   - Generate unique filename: `products/timestamp-random-original.ext`
   - Use AWS Signature V4 authentication
   - PUT request to `https://region.digitaloceanspaces.com/bucket/...`
   - CDN endpoint: `https://bucket.region.cdn.digitaloceanspaces.com/...`

3. **Database Storage**
   - Create ProductImage record
   - Set isPrimary=true if first image
   - Calculate sortOrder based on existing images
   - Store altText (filename without extension)

### Error Handling

Errors are captured and included in response:
- File too large: "filename: File exceeds 5MB limit"
- Upload failed: "filename: Upload failed: [reason]"
- DB error: "filename: Database error"
- Auth error: Returns 403 Unauthorized

---

## Testing

### Manual Testing in Admin Dashboard

1. **Go to:** `/admin/products/[product-id]/edit`
2. **Click:** "Images" tab
3. **Upload:** Select PNG, JPG, or WebP files
4. **Verify:**
   - ✅ Toast shows "X image(s) saved"
   - ✅ Images appear in gallery
   - ✅ First image is marked primary
   - ✅ Refresh page - images persist
5. **Delete:**
   - ✅ Click image to select
   - ✅ Click delete button
   - ✅ Image removed immediately
   - ✅ If primary deleted, next becomes primary
6. **Reorder (future):**
   - Drag images to reorder
   - Verified via sortOrder in DB

### API Testing

```bash
# Create test product first
PRODUCT_ID="cmogoomr40000zdh2vuq20f6c"

# 1. GET product
curl -X GET http://localhost:3000/api/admin/products/$PRODUCT_ID \
  -H "Authorization: Bearer [token]"

# 2. Upload images
curl -X POST http://localhost:3000/api/admin/products/$PRODUCT_ID/images \
  -H "Authorization: Bearer [token]" \
  -F "images=@/path/to/image1.png" \
  -F "images=@/path/to/image2.jpg"

# 3. Delete image
curl -X DELETE "http://localhost:3000/api/admin/products/$PRODUCT_ID/images?imageId=img-xyz" \
  -H "Authorization: Bearer [token]"
```

---

## Authentication & Authorization

### Digital Ocean Spaces Auth

- **Method:** AWS Signature Version 4
- **Credentials:** DO_SPACES_KEY, DO_SPACES_SECRET
- **Region:** DO_SPACES_REGION (default: sfo3)
- **Bucket:** DO_SPACES_BUCKET (default: giftcraft-dev)
- **Endpoint:** DO_SPACES_ENDPOINT (default: https://sfo3.digitaloceanspaces.com)
- **CDN:** DO_SPACES_CDN_ENDPOINT

Environment variables in `.env`:
```env
DO_SPACES_KEY=your-key
DO_SPACES_SECRET=your-secret
DO_SPACES_REGION=sfo3
DO_SPACES_BUCKET=giftcraft-dev
DO_SPACES_CDN_ENDPOINT=https://giftcraft-dev.sfo3.cdn.digitaloceanspaces.com
```

### API Route Auth

- **Required Role:** super_admin
- **Session:** NextAuth.js
- **Check:** `session.user.role !== 'super_admin'` → 403 Unauthorized

---

## Database Schema

### ProductImage Table

```prisma
model ProductImage {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String   // CDN URL to image
  isPrimary Boolean  @default(false)
  sortOrder Int      @default(0)
  altText   String?  // For accessibility
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId])
}
```

---

## Troubleshooting

### Upload Returns 403 Forbidden

**Cause:** Digital Ocean Spaces credentials invalid or endpoint mismatch

**Solution:**
1. Verify DO_SPACES_KEY and DO_SPACES_SECRET in .env
2. Check DO_SPACES_REGION matches bucket region
3. Ensure bucket exists and is accessible
4. Check credentials have s3:PutObject permission

### Upload Returns 5MB Error

**Cause:** File size exceeds limit

**Solution:**
- Compress image before uploading
- Recommended: PNG/JPG at <2MB
- WebP more efficient (50-70% smaller)

### Images Don't Appear in Gallery

**Cause:** Database not updated or CDN URL incorrect

**Solution:**
1. Check browser Network tab for 200 response
2. Verify image rows created in database
3. Check CDN_ENDPOINT is correct
4. Verify CDN URL is accessible in browser

### Cannot Delete Image

**Cause:** Missing imageId parameter or auth issue

**Solution:**
1. Include `?imageId=xyz` in DELETE URL
2. Check user has super_admin role
3. Verify image exists in database

---

## Performance Considerations

- **Parallel Upload:** Currently sequential, could be parallelized
- **File Size:** Limited to 5MB per file (configurable)
- **CDN Caching:** Images cached at edge (check DO Spaces TTL)
- **Database:** Immediate writes (no batching)

---

## Future Enhancements

- [ ] Parallel file uploads (Promise.all)
- [ ] Image compression before upload
- [ ] Drag-to-reorder in gallery
- [ ] Bulk operations (delete multiple)
- [ ] Image optimization (resize, format conversion)
- [ ] Metadata extraction (EXIF data)
- [ ] Image cropping tool

---

**Last Updated:** 2026-04-27
**Status:** Complete and tested
