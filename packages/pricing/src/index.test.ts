import { describe, it, expect } from "vitest";
import { computePricing, ProductForPricing } from "./index";

describe("Pricing Engine", () => {
  describe("Basic Calculation", () => {
    it("should calculate subtotal correctly", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      expect(result.subtotal).toBe(1000);
    });

    it("should calculate packaging correctly", () => {
      const result = computePricing({
        productsSubtotal: 0,
        packagingPerUnit: 50,
        addonsPerUnit: 0,
        quantity: 100,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      expect(result.packaging).toBe(5000);
    });

    it("should calculate addons correctly", () => {
      const result = computePricing({
        productsSubtotal: 0,
        packagingPerUnit: 0,
        addonsPerUnit: 25,
        quantity: 100,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      expect(result.addons).toBe(2500);
    });
  });

  describe("GST Calculation", () => {
    it("should split GST as CGST+SGST for same state", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      const gstTotal = result.cgst + result.sgst;
      expect(result.cgst).toBe(result.sgst);
      expect(gstTotal).toBe(180);
    });

    it("should use IGST for different states", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "MH",
        effectiveGstRate: 18,
      });

      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(180);
    });

    it("should be case-insensitive for state codes", () => {
      const resultLower = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "dl",
        buyerStateCode: "dl",
        effectiveGstRate: 18,
      });

      const resultUpper = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      expect(resultLower.cgst).toBe(resultUpper.cgst);
      expect(resultLower.sgst).toBe(resultUpper.sgst);
    });
  });

  describe("Razorpay Fee", () => {
    it("should calculate Razorpay fee on total with tax", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
        razorpayFeePct: 2,
        razorpayFeeGstPct: 18,
      });

      // (1000 + 180) * 0.02 = 23.6
      // 23.6 * 0.18 = 4.248 ≈ 4.25
      // Total fee = 23.6 + 4.25 = 27.85
      expect(result.razorpayFee).toBe(27.85);
    });

    it("should use default Razorpay fee percentage", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
        // No razorpayFeePct specified, should default to 2%
      });

      expect(result.razorpayFee).toBe(27.85);
    });
  });

  describe("Discount Handling", () => {
    it("should subtract discount from subtotal", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        discount: 100,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      // preTax = 1000 - 100 = 900
      // GST = 900 * 0.18 = 162
      expect(result.subtotal).toBe(1000);
      expect(result.discount).toBe(100);
    });

    it("should not allow negative totals", () => {
      const result = computePricing({
        productsSubtotal: 100,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        discount: 500,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      // preTax should be max(0, 100 - 500) = 0
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
    });
  });

  describe("Per-Pack Calculation", () => {
    it("should calculate cost per pack", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 100,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      expect(result.perPack).toBe(result.grandTotal / 100);
    });

    it("should handle quantity of 0", () => {
      const result = computePricing({
        productsSubtotal: 1000,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 0,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      expect(result.perPack).toBe(0);
    });
  });

  describe("Full Integration", () => {
    it("should calculate complete pricing breakdown", () => {
      const result = computePricing({
        productsSubtotal: 5000,
        packagingPerUnit: 50,
        addonsPerUnit: 25,
        quantity: 50,
        shippingFlat: 500,
        discount: 250,
        sellerStateCode: "DL",
        buyerStateCode: "MH",
        effectiveGstRate: 18,
      });

      // preTax = 5000 + 2500 + 1250 + 500 - 250 = 9000
      // GST (IGST) = 9000 * 0.18 = 1620
      // Razorpay base = (9000 + 1620) * 0.02 = 212.4
      // Razorpay GST = 212.4 * 0.18 = 38.232 ≈ 38.23
      // Razorpay fee = 212.4 + 38.23 = 250.63
      // Grand Total = 9000 + 1620 + 250.63 = 10870.63

      expect(result.subtotal).toBe(5000);
      expect(result.packaging).toBe(2500);
      expect(result.addons).toBe(1250);
      expect(result.shipping).toBe(500);
      expect(result.discount).toBe(250);
      expect(result.igst).toBe(1620);
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.razorpayFee).toBe(250.63);
      expect(result.grandTotal).toBe(10870.63);
    });
  });

  describe("Precision", () => {
    it("should round all values to 2 decimals", () => {
      const result = computePricing({
        productsSubtotal: 333.33,
        packagingPerUnit: 0,
        addonsPerUnit: 0,
        quantity: 50,
        shippingFlat: 0,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      // All values should have at most 2 decimal places
      Object.values(result).forEach((value) => {
        if (typeof value === "number") {
          const str = value.toString();
          const decimals = str.includes(".") ? str.split(".")[1].length : 0;
          expect(decimals).toBeLessThanOrEqual(2);
        }
      });
    });
  });

  describe("Per-HSN GST Breakdown", () => {
    it("should compute per-HSN GST with multiple HSN codes (same state)", () => {
      const products: ProductForPricing[] = [
        {
          sellPrice: 1000,
          quantity: 1,
          hsnCode: "4820",
          gstRate: 12, // Paper goods
        },
        {
          sellPrice: 500,
          quantity: 1,
          hsnCode: "6505",
          gstRate: 18, // Textiles
        },
      ];

      const result = computePricing({
        products,
        packagingPerUnit: 50,
        addonsPerUnit: 25,
        packQuantity: 50,
        shippingFlat: 1000,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
      });

      // Products subtotal: (1000 + 500) * 50 = 75000
      // Packaging: 50 * 50 = 2500
      // Addons: 25 * 50 = 1250
      // Shipping: 1000
      // preTax = 75000 + 2500 + 1250 + 1000 = 79750

      // HSN 4820: 1000 * 50 = 50000, GST 12% = 6000, CGST=3000, SGST=3000
      // HSN 6505: 500 * 50 = 25000, GST 18% = 4500, CGST=2250, SGST=2250
      // HSN 4819 (packaging+addons): 3750, GST 18% = 675, CGST=337.5, SGST=337.5
      // Shipping is GST-inclusive (Shiprocket) — no separate shipping GST line.
      // Total CGST = 3000 + 2250 + 337.5 = 5587.5
      // Total SGST = 5587.5
      // Total GST = 11175

      expect(result.hsnBreakdown.length).toBe(3);
      expect(result.hsnBreakdown.some((l) => l.hsnCode === "9965")).toBe(false);
      expect(result.hsnBreakdown[0].hsnCode).toBe("4820");
      expect(result.hsnBreakdown[0].gstRate).toBe(12);
      expect(result.hsnBreakdown[1].hsnCode).toBe("6505");
      expect(result.hsnBreakdown[1].gstRate).toBe(18);
      expect(result.cgst).toBe(result.sgst);
      expect(result.igst).toBe(0);
    });

    it("should compute per-HSN GST for cross-state (IGST)", () => {
      const products: ProductForPricing[] = [
        {
          sellPrice: 1000,
          quantity: 1,
          hsnCode: "4820",
          gstRate: 12,
        },
        {
          sellPrice: 500,
          quantity: 1,
          hsnCode: "6505",
          gstRate: 18,
        },
      ];

      const result = computePricing({
        products,
        packagingPerUnit: 50,
        addonsPerUnit: 25,
        packQuantity: 50,
        shippingFlat: 1000,
        sellerStateCode: "DL",
        buyerStateCode: "MH", // Different state
      });

      // CGST and SGST should be 0, IGST should be calculated
      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBeGreaterThan(0);

      // Sum of per-HSN IGST should equal total IGST
      const perHsnIgst = result.hsnBreakdown.reduce((sum, line) => sum + line.igst, 0);
      expect(perHsnIgst).toBe(result.igst);
    });

    it("should include hsnBreakdown with legacy fallback", () => {
      const result = computePricing({
        productsSubtotal: 5000,
        packagingPerUnit: 50,
        addonsPerUnit: 25,
        packQuantity: 50,
        shippingFlat: 500,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
        effectiveGstRate: 18,
      });

      // Legacy path should return empty hsnBreakdown
      expect(result.hsnBreakdown).toEqual([]);
    });

    it("should sum per-HSN breakdown to total GST", () => {
      const products: ProductForPricing[] = [
        {
          sellPrice: 1000,
          quantity: 1,
          hsnCode: "4820",
          gstRate: 12,
        },
        {
          sellPrice: 500,
          quantity: 1,
          hsnCode: "6505",
          gstRate: 18,
        },
      ];

      const result = computePricing({
        products,
        packagingPerUnit: 100,
        addonsPerUnit: 50,
        packQuantity: 100,
        shippingFlat: 2000,
        sellerStateCode: "DL",
        buyerStateCode: "DL",
      });

      // Sum of all per-HSN lines should match totals
      const sumCgst = result.hsnBreakdown.reduce((sum, line) => sum + line.cgst, 0);
      const sumSgst = result.hsnBreakdown.reduce((sum, line) => sum + line.sgst, 0);
      const sumIgst = result.hsnBreakdown.reduce((sum, line) => sum + line.igst, 0);

      expect(Math.abs(sumCgst - result.cgst)).toBeLessThan(0.01);
      expect(Math.abs(sumSgst - result.sgst)).toBeLessThan(0.01);
      expect(Math.abs(sumIgst - result.igst)).toBeLessThan(0.01);
    });
  });
});
