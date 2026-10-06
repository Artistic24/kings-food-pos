import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { DEFAULT_SETTINGS, getSettings, listOrders, type Order } from "@/lib/db";
import { fcfa, dateOf, timeOf, isSameDay, STATUS_LABEL } from "@/lib/kings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt } from "@/components/Receipt";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Kings Food" },
      { name: "description", content: "Sales history and daily report for Kings Food." },
      { property: "og:title", content: "Sales — Kings Food" },
      { property: "og:description", content: "Today's revenue, orders and best-selling dishes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: listOrders });
  const { data: settings = DEFAULT_SETTINGS } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [open, setOpen] = useState<Order | null>(null);

  const today = useMemo(() => orders.filter((o) => isSameDay(o.createdAt, Date.now())), [orders]);

  const revenue = today.reduce((s, o) => s + o.total, 0);
  const delivery = today.filter((o) => o.mode === "delivery").length;
  const byMethod = today.reduce<Record<string, number>>((acc, o) => {
    const name = settings.payments.find((p) => p.id === o.paymentMethod)?.name ?? "Other";
    acc[name] = (acc[name] ?? 0) + o.total;
    return acc;
  }, {});
  const avg = today.length ? Math.round(revenue / today.length) : 0;

  const topDishes = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    today.forEach((o) =>
      o.items.forEach((i) => {
        const cur = map.get(i.name) ?? { name: i.name, qty: 0, amount: 0 };
        map.set(i.name, { name: i.name, qty: cur.qty + i.qty, amount: cur.amount + i.qty * i.price });
      }),
    );
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [today]);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold">Daily report</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue" value={fcfa(revenue)} highlight />
        <Stat label="Orders" value={String(today.length)} />
        <Stat label="Deliveries" value={String(delivery)} />
        <Stat label="Average order" value={fcfa(avg)} />
      </div>

      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <h2 className="font-display text-sm font-bold">Best sellers</h2>
        {topDishes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No sales yet today.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {topDishes.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {d.name} <span className="text-muted-foreground">× {d.qty}</span>
                </span>
                <span className="font-semibold text-primary">{fcfa(d.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-soft">
        <h2 className="font-display text-sm font-bold">Revenue by payment method</h2>
        {Object.keys(byMethod).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {Object.entries(byMethod).map(([name, amount]) => (
              <li key={name} className="flex justify-between text-sm">
                <span className="font-medium">{name}</span>
                <span className="font-semibold text-primary">{fcfa(amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold">History</h2>
        {orders.length === 0 ? (
          <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No orders recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => setOpen(o)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-3 text-left shadow-soft"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {o.mode === "table" ? `Table ${o.table}` : `Delivery · ${o.zone}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {o.ref} · {dateOf(o.createdAt)} {timeOf(o.createdAt)} · {STATUS_LABEL[o.status]}
                    </p>
                  </div>
                  <span className="font-display font-bold text-primary">{fcfa(o.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>
          {open && <Receipt order={open} settings={settings} />}
          <Button className="rounded-full no-print" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </DialogContent>
      </Dialog>
      {open && <div className="receipt-print"><Receipt order={open} settings={settings} /></div>}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-soft ${highlight ? "bg-brand text-primary-foreground" : "bg-card"}`}>
      <p className={`text-[11px] ${highlight ? "opacity-85" : "text-muted-foreground"}`}>{label}</p>
      <p className="font-display text-lg font-extrabold">{value}</p>
    </div>
  );
}
