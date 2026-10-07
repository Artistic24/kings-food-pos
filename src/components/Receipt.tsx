import type { Order, Settings } from "@/lib/db";
import { fcfa, dateOf, timeOf } from "@/lib/kings";
import { hasPaymentQR } from "@/lib/payment";
import { PayQR } from "./PayQR";

export function Receipt({ order, settings }: { order: Order; settings: Settings }) {
  const method = settings.payments.find((p) => p.id === order.paymentMethod);
  return (
    <div className="receipt-content space-y-3 rounded-lg border border-dashed border-border bg-card p-4 text-sm">
      <div className="text-center">
        <img src={settings.receiptLogo || "/icons/kf-mark.png"} alt="" width={48} height={48} className="mx-auto size-12 object-contain" />
        <p className="font-display text-lg font-extrabold uppercase">{settings.businessName}</p>
        <p className="text-xs text-muted-foreground">{settings.address}{settings.phone && ` · ${settings.phone}`}</p>
        <p className="text-xs text-muted-foreground">
          Receipt code: {order.ref} · {dateOf(order.createdAt)} {timeOf(order.createdAt)}
        </p>
        {order.reference && <p className="mt-1 text-xs font-semibold">Reference: {order.reference}</p>}
      </div>
      <p className="text-xs">
        {order.mode === "table"
          ? `Dine-in · Table ${order.table}`
          : `Delivery · ${order.customer} (${order.phone}) · ${order.zone}`}
      </p>
      <ul className="space-y-1 border-y border-dashed border-border py-2">
        {order.items.map((i) => (
          <li key={i.dishId} className="flex justify-between gap-2">
            <span>{i.qty} × {i.name}</span>
            <span>{fcfa(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1">
        <Row label="Subtotal" value={fcfa(order.subtotal)} />
        {(order.discount ?? 0) > 0 && <Row label={`Discount (${order.discountPercent}%)`} value={`−${fcfa(order.discount ?? 0)}`} />}
        {order.tax > 0 && <Row label={`Tax (${settings.taxRate}%)`} value={fcfa(order.tax)} />}
        {order.deliveryFee > 0 && <Row label="Delivery" value={fcfa(order.deliveryFee)} />}
        <div className="flex justify-between font-display text-base font-bold">
          <span>TOTAL</span>
          <span>{fcfa(order.total)}</span>
        </div>
        {method && <Row label="Payment" value={method.name} />}
        {order.paid && order.paymentMethod === "cash" && order.tendered !== undefined && <>
          <Row label="Tendered" value={fcfa(order.tendered)} />
          <Row label="Change" value={fcfa(Math.max(0, order.tendered - order.total))} />
        </>}
      </div>
      {order.paid && <p className="text-center font-display text-base font-bold uppercase text-primary">Paid</p>}
      {method && !order.paid && hasPaymentQR(method) && <PayQR method={method} amount={order.total} refCode={order.ref} size={120} />}
      <p className="text-center text-[11px] text-muted-foreground">{settings.receiptFooter}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
