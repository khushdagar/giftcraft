# TESTING_AND_EDGE_CASES.md — QA Plan by Sprint

> Run ALL tests for a sprint before moving to the next. If ANY test fails, fix it first.

---

## SPRINT 1 TESTS
- T1.1: npm install + npm run build succeeds
- T1.2: prisma db push creates all tables (verify with Prisma Studio)
- T1.3: Seed data: 6 zones, 4 packaging, 5 addons, 20 HSN codes, 10 occasions, platform settings
- T1.4: /admin redirects to Google OAuth sign-in. After login: sidebar renders.
- T1.5: /catalog loads without auth (public route)
- T1.6: WhatsApp widget visible on all pages. Footer renders.

## SPRINT 2 TESTS
- T2.1: Create product via 8-tab form. HSN "7323" auto-fills 18% GST. Margin calc works. All tabs save.
- T2.2: Change sell price -> PriceAuditLog record created with old/new/user/timestamp/reason
- T2.3: Bulk CSV: valid rows create products. Invalid flagged. Existing SKU updates.
- T2.4: Catalog: all 9 filters work. URL synced. Back button restores. Fuzzy search works.
- T2.5: Catalog empty state shows BOTH "Clear All Filters" AND "Contact Us for Help"
- T2.6: Product detail: tier highlights on qty change. Price animation visible. Delivery estimator works.

## SPRINT 3 TESTS ✅ ALL PASS
- ✅ T3.1: Pricing engine unit tests ALL pass (tier boundaries, GST routing, mixed HSN, Razorpay fee)
- ✅ T3.2: Quantity modal enforces MOQ 25 corporate / 10 party
- ✅ T3.3: Builder Step 1: products animate in/out. Drag reorder. Box size updates. Next disabled without products.
- ✅ T3.4: Builder Step 2: logo upload validates format. Printing badges read-only. Packaging updates cost.
- ✅ T3.5: Navigate back/forward between steps: all state preserved
  
**See SPRINT3_VERIFICATION.md for detailed test evidence**

## SPRINT 4 TESTS
- T4.1: Step 3: tier animation on qty change. CSV validates. Individual surcharge note visible.
- T4.2: Step 4 pricing: NO branding line. Razorpay fee SEPARATE. GST per HSN. Delhi=CGST+SGST, Mumbai=IGST.
- T4.3: Quote PDF: downloads, all details correct, NO branding line, Razorpay fee visible
- T4.4: Shareable quote URL works in incognito (read-only). Expired shows message.
- T4.5: Razorpay checkout completes (test mode). Order created. Email + WhatsApp sent.
- T4.6: GST invoice: seller GSTIN, buyer GSTIN, HSN per line, correct CGST/SGST or IGST
- T4.7: Tracking page works without login. Shows status.
- T4.8: Dashboard: orders, quotes, brand assets functional

## SPRINT 5 TESTS
- T5.1: Admin processes order through 6 stages. Timeline shows all changes.
- T5.2: QC photo upload + approve/reject works
- T5.3: "Mark as Shipped" sends WhatsApp with tracking link
- T5.4: Homepage renders all sections. Banners rotate. Staggered animations.
- T5.5: Admin manages banners/testimonials. Changes reflected.
- T5.6: Pricing/Contact/Packs pages render correctly.

## SPRINT 6 TESTS
- T6.1-T6.4: Settings, vendors, clients, analytics functional
- T6.5: Responsive at 375/768/1024/1440px
- T6.6: Lighthouse Performance >80, Accessibility >90
- T6.7: Meta tags, JSON-LD, sitemap present
- T6.8: 404/500 pages, form validation, payment failure handling
- T6.9: Keyboard nav, focus rings, reduced motion, alt text, aria-live
- T6.10: FULL END-TO-END TEST (18-step flow — see PROMPTS.md Sprint 6)

## SPRINT 7 TESTS
- T7.1: 12-stage pipeline functional
- T7.2: Kanban 12 columns, drag adjacent only
- T7.3: SLA badges update correctly
- T7.4: SLA breach triggers admin alert
- T7.5: Design approval link -> client approves -> order auto-advances
- T7.6: Revision request -> admin notified -> new version
- T7.7: Hard block: cannot skip design approval
- T7.8: Vendor PO PDF generated on stage transition

## SPRINT 8 TESTS
- T8.1: "Report Issue" active 48h post-delivery, gone after
- T8.2: Dispute claim with photo submits
- T8.3: Replacement order created, linked, no charge
- T8.4: Refund via Razorpay Payout + GST credit note
- T8.5: Shiprocket: carriers load, AWB generated
- T8.6: Shiprocket webhook delivers -> order auto-advances
- T8.7: Vendor score auto-calculated
- T8.8: Price confirmation fires at 90 days

## SPRINT 9 TESTS
- T9.1: Gold client 8% discount auto-applied
- T9.2: Gifting calendar reminder fires 6 weeks before occasion
- T9.3: Quote follow-up WhatsApp at 48h
- T9.4: Budget planner: 3 recommendations correct
- T9.5: Analytics charts render. Exports work.
- T9.6: E-invoicing: IRN + QR in invoice
- T9.7: GST toggle switches inclusive/exclusive
- T9.8: Modify buttons disabled past stage cutoff

## SPRINT 10 TESTS
- T10.1: GOC: campaign, claim links, recipient claims, swap works
- T10.2: Build Your Box: budget meter enforces limit
- T10.3: Sample order + convert to bulk with credit

## SPRINT 11 TESTS
- T11.1: Wallet: top-up + pay + partial + history + alerts
- T11.2: Approval workflow: member -> admin notification -> approve
- T11.3: Stock deducted on confirm. Low-stock alert fires.
- T11.4: Reseller: order for client, commission calculated

## SPRINT 12 TESTS
- T12.1: Occasion reminder fires with personalised message
- T12.2: Eco dashboard shows correct percentages
- T12.3: RFQ -> bids -> compare -> award -> PO

## SPRINT 13 TESTS
- T13.1: Branding zones defined on product image
- T13.2: Admin generates mockup at 1200px+
- T13.3: Client Design Studio: position logo, submit
- T13.4: Builder auto-preview on logo upload

## SPRINT 14 TESTS
- T14.1: Sequence executes steps with delays
- T14.2: ROI: outcome entry, multiplier calculated
- T14.3: GHL: registration creates contact
- T14.4: White-label subdomain loads with client branding

## SPRINT 15-17 TESTS
- T15.1: HRIS employee sync, birthday trigger
- T15.2: Slack command works
- T16.1: Wedding cultural collections render
- T16.2: Party age filtering works
- T16.3: Platform API authenticated request succeeds
- T17.1: Zapier trigger fires on new order
- T17.2: Mobile app core flow completes

---

## CRITICAL EDGE CASES (Test Anytime)

### Pricing
| Test | Expected |
|------|----------|
| 24 units (Tier 1) vs 25 units (Tier 2) | 25 units is CHEAPER per unit |
| 49 vs 50 units | 50 units cheaper total (tier shift) |
| NO branding line in builder Step 4 | PASS — branding in base price |
| NO branding line in Quote PDF | PASS |
| NO branding line in GST Invoice | PASS |
| Razorpay fee as separate line in Step 4 | PASS |
| Razorpay fee as separate line in PDF | PASS |
| Razorpay fee as separate line in Invoice | PASS |

### GST
| Delivery Pincode | State | Split |
|-----------------|-------|-------|
| 110001 | Delhi | CGST 9% + SGST 9% (for 18% product) |
| 400001 | Maharashtra | IGST 18% |
| 560001 | Karnataka | IGST 18% |
| Mixed HSN (5% + 18%) | — | TWO separate GST lines |

### Payments
| Scenario | Expected |
|----------|----------|
| Cancel Razorpay checkout | Order NOT created. Quote preserved. |
| Double click Pay | Razorpay order ID unique. Second attempt fails. |
| Webhook fires but frontend already processed | Idempotent. No duplicate order. |

### Security
| Test | Expected |
|------|----------|
| /admin without auth | Redirect to /login (Google OAuth) |
| /admin with company_member role | 403 Forbidden |
| Upload .exe as product image | Rejected |
| GSTIN with SQL injection | Sanitised. No injection. |
| Access another company order | 403 Forbidden |

### Sprint Sign-Off Checklist (Run After EVERY Sprint)
- [ ] All sprint tests pass
- [ ] npm run type-check — no TypeScript errors
- [ ] npm run lint — no ESLint errors
- [ ] No branding cost line anywhere (check 3 products)
- [ ] Razorpay fee shown as separate line (check builder, PDF, checkout)
- [ ] GST correct for Delhi and non-Delhi delivery
- [ ] All pages responsive at 375/768/1024/1440px
- [ ] Animations disabled with prefers-reduced-motion
- [ ] Empty states have helpful CTAs
- [ ] Loading states show skeletons
