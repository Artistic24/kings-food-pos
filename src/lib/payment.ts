import type { PaymentMethod } from "./db";

export function hasPaymentQR(method: PaymentMethod): boolean {
  return method.id !== "cash" && method.id !== "card" && Boolean(method.account || method.qrImage);
}

export function cashChange(total: number, tendered: number): number {
  return Math.max(0, tendered - total);
}

export function discountedTotal(subtotal: number, tax: number, deliveryFee: number, discountPercent: number): number {
  return subtotal + tax + deliveryFee - Math.round(subtotal * discountPercent / 100);
}