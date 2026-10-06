import { describe, expect, it } from "vitest";
import { cashChange, discountedTotal, hasPaymentQR } from "@/lib/payment";
import type { PaymentMethod } from "@/lib/db";

const payment = (changes: Partial<PaymentMethod>): PaymentMethod => ({
  id: "mtn", name: "MTN Mobile Money", account: "", holder: "", instructions: "", enabled: true, ...changes,
});

describe("payment QR eligibility", () => {
  it("never shows a QR code for cash, even if old settings contain an account or image", () => {
    expect(hasPaymentQR(payment({ id: "cash", name: "Cash", account: "123", qrImage: "data:image/png;base64,abc" }))).toBe(false);
  });

  it("shows a QR code for a configured non-cash payment", () => {
    expect(hasPaymentQR(payment({ account: "670000000" }))).toBe(true);
  });

  it("does not offer a QR code for an unconfigured payment", () => {
    expect(hasPaymentQR(payment({}))).toBe(false);
  });
  it("never shows a QR code for bank card, even with leftover QR settings", () => {
    expect(hasPaymentQR(payment({ id: "card", account: "123", qrImage: "old-image" }))).toBe(false);
  });
  it("returns cash change only after covering the total", () => {
    expect(cashChange(3500, 5000)).toBe(1500);
    expect(cashChange(3500, 2000)).toBe(0);
  });
  it("applies a 10% discount to the food subtotal, not tax or delivery", () => {
    expect(discountedTotal(10000, 1000, 500, 10)).toBe(10500);
  });
});