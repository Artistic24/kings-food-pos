import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Order } from "@/lib/db";
import { generateReceiptPdfBase64 } from "@/lib/receiptPdf";

describe("patient receipt PDF generation", () => {
  it("creates a valid PDF containing patient and receipt information", () => {
    const order: Order = {
      id: "order-1",
      ref: "MC-123",
      patientCode: "PT-007",
      service: "LABORATORY",
      practitioner: "Dr Example",
      receiptKind: "cashier",
      mode: "medical",
      customer: "Patient Smith",
      phone: "670000000",
      deliveryFee: 0,
      items: [{ dishId: "lab-cbc", name: "Full blood count", price: 3500, qty: 1 }],
      subtotal: 3500,
      discountPercent: 0,
      discount: 0,
      total: 3500,
      tax: 0,
      amountPaid: 3500,
      tendered: 4000,
      paid: true,
      status: "served",
      createdAt: new Date("2026-10-15T10:00:00Z").getTime(),
    };
    const base64 = generateReceiptPdfBase64(order, DEFAULT_SETTINGS);
    const pdf = atob(base64);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("PATIENT SMITH");
    expect(pdf).toContain("MC-123");
    // Narrow receipt paper wraps long item names across adjacent rows.
    expect(pdf).toContain("Full blood");
    expect(pdf).toContain("count");
    expect(pdf).toContain("%%EOF");
  });
});
