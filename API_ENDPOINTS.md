# GiftCraft API Endpoints Audit

**Last Updated:** 2026-04-27  
**Total Endpoints:** 60

## Legend
- ✅ Implemented
- ⚠️ Partial (missing some standard methods)
- ❌ Missing/Not implemented

---

## PUBLIC ENDPOINTS (Catalog)

### Products
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/products` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/products/[slug]` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Collections
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/collections` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/collections/[slug]` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Catalog Filters
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/catalog/filters` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Additional Resources
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/addons` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/packaging` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/occasions` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/hsn` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/banners` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/vendors` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## ADMIN ENDPOINTS (Management)

### Products (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/products` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/products/[id]` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `/api/admin/products/bulk-upload` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/products/bulk-upload/template` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- Missing: GET `/api/admin/products/[id]` - should fetch single product details
- Bulk upload is POST-only (can't update bulk)

### Categories (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/categories` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/categories/[id]` | ❌ | ❌ | ✅ | ❌ | ❌ |

**Status:** ⚠️ Missing GET for single category, missing DELETE

### Collections (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/collections` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/collections/[id]` | ❌ | ❌ | ✅ | ❌ | ✅ |

**Status:** ⚠️ Missing GET for single collection

### Orders (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/orders` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/admin/orders/[id]` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/admin/orders/[id]/status` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/api/admin/orders/[id]/ship` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/api/admin/orders/[id]/einvoice` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/orders/[id]/mockup` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/orders/[id]/modifications` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/orders/[id]/spec-sheet` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/admin/orders/[id]/vendor-po` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Status:** ✅ Mostly complete (uses PATCH for state changes)

### Vendors (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/vendors` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/vendors/[id]` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/api/admin/vendors/[id]/communications` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/vendors/[id]/confirm-prices` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/vendors/[id]/payments` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/vendors/[id]/score` | ❌ | ✅ | ❌ | ❌ | ❌ |

**Status:** ⚠️ Missing GET for single vendor, no DELETE support

### Disputes (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/disputes` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/admin/disputes/[id]` | ✅ | ❌ | ❌ | ✅ | ❌ |

**Status:** ⚠️ Missing POST to create disputes, missing DELETE

### Shipping (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/shipping` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/shipping/[id]` | ❌ | ❌ | ✅ | ❌ | ✅ |

**Status:** ⚠️ Missing GET for single shipping zone

### Taxes (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/taxes` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/taxes/[id]` | ❌ | ❌ | ✅ | ❌ | ✅ |

**Status:** ⚠️ Missing GET for single tax config

### Automations (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/automations` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/admin/automations/[id]` | ✅ | ❌ | ❌ | ✅ | ✅ |

**Status:** ⚠️ No PUT support (use PATCH instead)

### Analytics (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/analytics` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Status:** ✅ Read-only (as expected)

### Settings (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/settings` | ✅ | ✅ | ❌ | ❌ | ❌ |

**Status:** ⚠️ No PUT/PATCH/DELETE (immutable?)

### Clients (Admin)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/admin/clients/[id]` | ✅ | ❌ | ❌ | ✅ | ❌ |

**Status:** ⚠️ Only single client detail + PATCH

---

## AUTHENTICATED USER ENDPOINTS

### Orders (User)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/orders` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/orders/[id]/approve-mockup` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/orders/[id]/revisions` | ❌ | ✅ | ❌ | ❌ | ❌ |

**Status:** ⚠️ Missing GET for user's own orders

### Quotes
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/quotes` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/quotes/[token]` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Status:** ⚠️ Missing GET all quotes (probably intentional for privacy)

### Disputes (User)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/disputes` | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/disputes/[id]` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Status:** ⚠️ Missing GET all disputes

### Dashboard
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/dashboard/orders` | ✅ | ❌ | ❌ | ❌ | ❌ |

**Status:** ✅ Complete

---

## OTHER ENDPOINTS

### Shipping Estimate
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/shipping/estimate` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Planner Recommendations
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/planner/recommendations` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Settings (User)
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/settings/notifications` | ✅ | ❌ | ❌ | ✅ | ❌ |

### Approval Flow
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/approve/[token]` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Consent
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/consent` | ❌ | ✅ | ❌ | ❌ | ❌ |

### Webhooks
| Endpoint | GET | POST | PUT | PATCH | DELETE |
|----------|-----|------|-----|-------|--------|
| `/api/webhooks/shiprocket` | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## SUMMARY

### Completeness Score
- **Public Catalog APIs:** 90% (read-only, as expected)
- **Admin Management APIs:** 70% (missing some GET singles, DELETE)
- **User Order APIs:** 65% (missing list endpoints for privacy)
- **Overall:** ~75%

### Key Issues Found

#### HIGH PRIORITY
1. ❌ `/api/admin/products/[id]` - Missing GET (can't fetch single product details)
2. ❌ `/api/dashboard/orders` - Missing single order detail endpoint
3. ❌ `/api/orders` - Missing GET to list user's orders

#### MEDIUM PRIORITY
1. ⚠️ Categories, Shipping, Taxes - Missing individual GET endpoints
2. ⚠️ Collections - Missing GET single collection
3. ⚠️ Vendors - Missing GET single vendor, no DELETE support

#### LOW PRIORITY
1. ⚠️ Settings endpoints - No DELETE (might be intentional)
2. ⚠️ Disputes - No DELETE (might be intentional for audit trail)

---

## Recommendations

### To Implement
1. Add GET endpoints for all `[id]` routes that support updates
2. Add DELETE endpoints where CRUD is expected
3. Standardize PATCH vs PUT usage (currently mixed)
4. Add proper error handling and validation to all endpoints

### Already Good
✅ Shipping, Collection, Order management (mostly complete)
✅ Webhook integration
✅ Approval flow tokens
✅ Consent tracking

---

**Generated:** 2026-04-27
