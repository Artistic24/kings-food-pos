import type { Order, Settings } from "@/lib/db";
import { fcfa, dateOf, timeOf } from "@/lib/kings";

export function Receipt({ order, settings }: { order: Order; settings: Settings }) {
  const pharmacy = order.receiptKind === "pharmacy";
  const reductionPercent = Number(order.discountPercent ?? 0);
  const amountPaid = Math.min(
    Math.max(0, Number.isFinite(order.amountPaid) ? Number(order.amountPaid) : order.paid ? order.total : 0),
    order.total,
  );
  const change = Math.max(0, Number(order.tendered ?? amountPaid) - order.total);
  const remaining = Math.max(0, order.total - amountPaid);
  const patientName = order.customer?.trim() || "—";

  return (
    <div className="receipt-content medical-receipt rounded-lg border border-dashed border-border bg-card p-3 text-[11px] leading-tight">
      <header className="text-center">
        {settings.receiptLogo && (
          <img src={settings.receiptLogo} alt="" width={52} height={52} className="mx-auto mb-2 max-h-12 max-w-12 object-contain" />
        )}
        <p className="text-xs font-extrabold uppercase">{settings.businessName || "CENTRE MEDICAL"}</p>
        {settings.address && <p className="mt-1">{settings.address}</p>}
        {settings.phone && <p>Tél. : {settings.phone}</p>}
        <div className="my-2 border-t border-dashed border-foreground/70" />
        <p className="text-sm font-bold">{pharmacy ? "Reçu de Pharmacie" : "Reçu de Caisse"}</p>
        <p className="mt-1">N° : {order.ref}</p>
      </header>

      <section className="my-2 space-y-1 border-y border-dashed border-foreground/70 py-2">
        <p className="font-bold uppercase">{patientName}</p>
        <p className="flex justify-between gap-2"><span>Code Patient :</span><span className="text-right font-semibold">{order.patientCode || "—"}</span></p>
        {!pharmacy && (
          <>
            <p className="flex justify-between gap-2"><span>Service :</span><span className="text-right font-semibold">{order.service || "LABORATOIRE"}</span></p>
            <p className="flex justify-between gap-2"><span>Traitant :</span><span className="text-right font-semibold">{order.practitioner || "—"}</span></p>
          </>
        )}
        {order.phone && <p className="flex justify-between gap-2"><span>Tél. patient :</span><span>{order.phone}</span></p>}
      </section>

      <table className="w-full table-fixed border-b border-dashed border-foreground/70 text-left">
        <thead>
          <tr className="border-b border-foreground/70 font-bold">
            <th className="w-[36%] py-1 pr-1">{pharmacy ? "ARTICLE" : "ACTE"}</th>
            <th className="w-[12%] px-0.5 text-right">Red</th>
            <th className="w-[17%] px-0.5 text-right">PU</th>
            <th className="w-[10%] px-0.5 text-right">QTE</th>
            <th className="w-[25%] py-1 pl-0.5 text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={item.dishId || item.name + index} className="align-top">
              <td className="py-1 pr-1 break-words">{item.name}</td>
              <td className="px-0.5 py-1 text-right">{reductionPercent}%</td>
              <td className="px-0.5 py-1 text-right">{Math.round(item.price).toLocaleString("fr-FR")}</td>
              <td className="px-0.5 py-1 text-right">{item.qty}</td>
              <td className="py-1 pl-0.5 text-right">{Math.round(item.price * item.qty).toLocaleString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="space-y-1 border-b border-dashed border-foreground/70 py-2">
        <Row label="Sous-total" value={fcfa(order.subtotal)} />
        <Row label={`Réduction (${reductionPercent}%)`} value={fcfa(order.discount ?? Math.round(order.subtotal * reductionPercent / 100))} />
        {order.tax > 0 && <Row label="Taxes" value={fcfa(order.tax)} />}
        <Row label="Montant Total" value={fcfa(order.total)} strong />
        <Row label="Montant versé" value={fcfa(amountPaid)} />
        <Row label="Montant rendu" value={fcfa(change)} />
        <Row label="Reste à payer" value={fcfa(remaining)} strong />
      </section>

      <section className="space-y-1 py-2">
        <Row label="Dette du patient" value={fcfa(remaining)} />
        <Row label="Solde Caution" value={fcfa(order.depositBalance ?? 0)} />
        <p className="pt-1 text-right">{dateOf(order.createdAt)} · {timeOf(order.createdAt)}</p>
        {settings.cashierName && <p className="pt-1">Imprimé par : {settings.cashierName}</p>}
      </section>
      {settings.receiptFooter && <p className="mt-2 border-t border-dashed border-foreground/70 pt-2 text-center">{settings.receiptFooter}</p>}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${strong ? "font-bold text-foreground" : "text-foreground"}`}>
      <span>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}
