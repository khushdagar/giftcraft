import { describe, it, expect } from "vitest";
import { computePricing } from "./index";

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
        const str = value.toString();
        const decimals = str.includes(".") ? str.split(".")[1].length : 0;
        expect(decimals).toBeLessThanOrEqual(2);
      });
    });
  });
});
