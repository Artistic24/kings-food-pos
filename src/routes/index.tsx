import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2, Printer, Check, Search, Banknote, CreditCard, Smartphone, Delete } from "lucide-react";
import { toast } from "sonner";

import { DEFAULT_SETTINGS, getSettings, listCategories, listDishes, saveOrder, uid, type Order, type OrderItem } from "@/lib/db";
import { fcfa, makeRef } from "@/lib/kings";
import { cashChange, discountedTotal, hasPaymentQR } from "@/lib/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PayQR } from "@/components/PayQR";
import { Receipt } from "@/components/Receipt";
import { printReceiptAndArchive } from "@/lib/desktop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "POS — Kings Food" },
      { name: "description", content: "Take dine-in or Yaoundé delivery orders, calculate totals, accept QR payments and print receipts." },
      { property: "og:title", content: "POS — Kings Food" },
      { property: "og:description", content: "Table or delivery orders, cart, QR payment and receipts — even offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PosPage,
});

function PosPage() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const { data: dishes = [] } = useQuery({ queryKey: ["dishes"], queryFn: listDishes });
  const { data: settings = DEFAULT_SETTINGS } = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [mode, setMode] = useState<"table" | "delivery">("table");
  const [table, setTable] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [zone, setZone] = useState("");
  const [pay, setPay] = useState("");
  const [tendered, setTendered] = useState("");
  const [cardApproved, setCardApproved] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const methods = settings.payments.filter((p) => p.enabled);
  useEffect(() => {
    if (!zone && settings.zones[0]) setZone(settings.zones[0].name);
    if (!methods.find((m) => m.id === pay) && methods[0]) setPay(methods[0].id);
  }, [settings, zone, pay, methods]);

  const visible = useMemo(
    () =>
      dishes.filter(
        (d) => d.available && (cat === "all" || d.categoryId === cat) && d.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [dishes, cat, query],
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round((subtotal * (settings.taxRate || 0)) / 100);
  const fee = mode === "delivery" ? (settings.zones.find((z) => z.name === zone)?.fee ?? 0) : 0;
  const discount = Math.round(subtotal * discountPercent / 100);
  const total = discountedTotal(subtotal, tax, fee, discountPercent);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const method = methods.find((m) => m.id === pay);
  const cashAmount = Number(tendered);
  const cashReady = tendered !== "" && Number.isFinite(cashAmount) && cashAmount >= total;
  const paymentReady = pay === "cash" ? cashReady : pay === "card" ? cardApproved : Boolean(method);
  const pressTenderKey = (key: string) => {
    if (key === "C") setTendered("");
    else if (key === "back") setTendered((value) => value.slice(0, -1));
    else setTendered((value) => (value + key).slice(0, 12).replace(/^0+(?=\d)/, ""));
  };

  const add = (dishId: string, name: string, price: number) =>
    setCart((c) => {
      const found = c.find((i) => i.dishId === dishId);
      return found
        ? c.map((i) => (i.dishId === dishId ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { dishId, name, price, qty: 1 }];
    });

  const bump = (dishId: string, delta: number) =>
    setCart((c) =>
      c.flatMap((i) => (i.dishId === dishId ? (i.qty + delta <= 0 ? [] : [{ ...i, qty: i.qty + delta }]) : [i])),
    );

  const place = useMutation({
    mutationFn: async () => {
      const order: Order = {
        id: uid(),
        ref: makeRef(),
        reference: reference.trim() || undefined,
        mode,
        table: mode === "table" ? table.trim() : undefined,
        customer: mode === "delivery" ? customer.trim() : undefined,
        phone: mode === "delivery" ? phone.trim() : undefined,
        zone: mode === "delivery" ? zone : undefined,
        deliveryFee: fee,
        items: cart,
        subtotal,
        discountPercent,
        discount,
        tax,
        total,
        paymentMethod: pay,
        paid: pay === "cash" || pay === "card",
        ...(pay === "cash" ? { tendered: cashAmount } : {}),
        status: "new",
        createdAt: Date.now(),
      };
      await saveOrder(order);
      return order;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      setCart([]);
      setCartOpen(false);
      setTable("");
      setCustomer("");
      setPhone("");
      setReference("");
      setTendered("");
      setCardApproved(false);
      setDiscountPercent(0);
      setReceipt(order);
      toast.success("Order sent to the kitchen");
    },
  });

  const printCurrentReceipt = async () => {
    if (!receipt) return;
    try {
      const result = await printReceiptAndArchive(receipt, settings);
      if (result.printed && result.archived) {
        toast.success("Receipt printed and saved to Excel");
      } else if (result.printed) {
        toast.warning("Receipt printed, but Excel archiving failed");
      } else if (result.fallback) {
        toast.info(result.message || "Browser print dialog opened");
      }
    } catch (error) {
      console.error("Receipt print/archive failed:", error);
      toast.error("Could not complete the receipt print.");
    }
  };

  const canSubmit =
    cart.length > 0 && paymentReady && (mode === "table" ? table.trim().length > 0 : customer.trim().length > 0 && phone.trim().length > 0);

  const cartPanel = (
    <div className="space-y-4">
      {cart.length === 0 ? (
        <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">Cart is empty. Tap a dish to add it.</p>
      ) : (
        <ul className="divide-y divide-border">
          {cart.map((i) => (
            <li key={i.dishId} className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <p className="text-sm font-semibold">{i.name}</p>
                <p className="text-xs text-muted-foreground">{fcfa(i.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-7 rounded-full" onClick={() => bump(i.dishId, -1)} aria-label="Decrease">
                  <Minus className="size-3" />
                </Button>
                <span className="w-5 text-center text-sm font-bold">{i.qty}</span>
                <Button variant="outline" size="icon" className="size-7 rounded-full" onClick={() => bump(i.dishId, 1)} aria-label="Increase">
                  <Plus className="size-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(["table", "delivery"] as const).map((m) => (
          <Button
            key={m}
            variant={mode === m ? "default" : "secondary"}
            onClick={() => setMode(m)}
            className="rounded-md text-sm font-semibold"
          >
            {m === "table" ? "Dine-in" : "Delivery"}
          </Button>
        ))}
      </div>

      {mode === "table" ? (
        <div className="space-y-1.5">
          <Label htmlFor="table">Table number</Label>
          <select id="table" value={table} onChange={(e) => setTable(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select a table</option>
            {Array.from({ length: settings.tables }, (_, i) => String(i + 1)).map((t) => (
              <option key={t} value={t}>Table {t}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="client">Customer name</Label>
            <Input id="client" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tel">Phone</Label>
            <Input id="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XX XX XX" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zone">Delivery zone (Yaoundé)</Label>
            <select id="zone" value={zone} onChange={(e) => setZone(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {settings.zones.map((z) => (
                <option key={z.name} value={z.name}>{z.name} — {fcfa(z.fee)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reference">Reference / important note</Label>
        <Input
          id="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Optional: order note, customer request, etc."
          maxLength={120}
        />
        <p className="text-[11px] text-muted-foreground">Saved with this receipt and printed on the POS receipt.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Payment method</Label>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <Button
              key={m.id}
              variant={pay === m.id ? "default" : "outline"}
              size="sm"
              onClick={() => { setPay(m.id); setCardApproved(false); }}
              className="rounded-md text-xs"
            >
              {m.id === "cash" ? <Banknote className="size-4" /> : m.id === "card" ? <CreditCard className="size-4" /> : <Smartphone className="size-4" />}
              {m.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
        <Line label="Subtotal" value={fcfa(subtotal)} />
        {discount > 0 && <Line label={`Discount (${discountPercent}%)`} value={`−${fcfa(discount)}`} />}
        {tax > 0 && <Line label={`Tax (${settings.taxRate}%)`} value={fcfa(tax)} />}
        {mode === "delivery" && <Line label="Delivery" value={fcfa(fee)} />}
        <div className="flex justify-between border-t border-border pt-1 font-display text-base font-bold">
          <span>Total</span>
          <span className="text-primary">{fcfa(total)}</span>
        </div>
      </div>

      {cart.length > 0 && <div className="space-y-1.5">
        <Label>Discount</Label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 5, 10, 15].map((percent) => (
            <Button key={percent} size="sm" variant={discountPercent === percent ? "default" : "outline"} onClick={() => setDiscountPercent(percent)}>{percent === 0 ? "None" : `${percent}%`}</Button>
          ))}
        </div>
      </div>}

      {pay === "cash" && cart.length > 0 && (
        <div className="space-y-3" aria-label="Cash payment">
          <div className="rounded-md bg-accent p-4">
            <Label htmlFor="tendered">Cash tendered (FCFA)</Label>
            <Input id="tendered" type="number" min="0" step="1" inputMode="numeric" value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder={String(total)} className="mt-2 bg-card font-display text-xl font-bold" />
            <p className="mt-2 text-sm text-muted-foreground">Change <span className="font-bold text-foreground">{fcfa(cashChange(total, cashAmount))}</span></p>
            {tendered !== "" && !cashReady && <p className="mt-1 text-xs text-destructive">Tendered amount must cover the total.</p>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[total, ...[5000, 10000, 20000].filter((amount) => amount >= total)].slice(0, 4).map((amount, i) => (
              <Button key={`${amount}-${i}`} variant="secondary" className="min-w-0 px-1 text-xs" onClick={() => setTendered(String(amount))}>{i === 0 ? "Exact" : fcfa(amount)}</Button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "back"].map((key) => (
              <Button key={key} variant="outline" className="h-11 font-display text-lg" onClick={() => pressTenderKey(key)} aria-label={key === "back" ? "Delete last digit" : key === "C" ? "Clear tendered amount" : key}>
                {key === "back" ? <Delete className="size-5" /> : key}
              </Button>
            ))}
          </div>
        </div>
      )}

      {pay === "card" && cart.length > 0 && (
        <label className="flex items-start gap-3 rounded-md border border-border bg-accent p-4 text-sm">
          <input type="checkbox" className="mt-1 accent-primary" checked={cardApproved} onChange={(e) => setCardApproved(e.target.checked)} />
          <span><strong>Card terminal payment confirmed</strong><span className="mt-1 block text-muted-foreground">Charge {fcfa(total)} on your card terminal first. This app does not charge cards.</span></span>
        </label>
      )}

      {method && cart.length > 0 && hasPaymentQR(method) && <PayQR method={method} amount={total} />}

      <div className="flex gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => setCart([])} disabled={!cart.length}>
          <Trash2 className="size-4" /> Clear
        </Button>
        <Button className="flex-1 rounded-full" disabled={!canSubmit || place.isPending} onClick={() => place.mutate()}>
          <Check className="size-4" /> {pay === "cash" || pay === "card" ? "Confirm paid order" : "Confirm order"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-6">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{settings.tagline}</p>
          <h1 className="font-display text-2xl font-extrabold md:text-3xl">
            New order, <span className="text-gradient">served hot.</span>
          </h1>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes" className="rounded-full pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${cat === c.id ? "bg-primary text-primary-foreground shadow-soft" : "border border-border bg-card text-foreground"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No dishes here. Add some from the Menu tab.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((d) => (
              <li key={d.id}>
                <button onClick={() => add(d.id, d.name, d.price)} className="block w-full overflow-hidden rounded-2xl bg-card text-left shadow-soft transition hover:-translate-y-0.5">
                  {d.photo ? (
                    <img src={d.photo} alt={d.name} loading="lazy" className="h-28 w-full object-cover md:h-36" />
                  ) : (
                    <div className="flex h-28 items-center justify-center bg-accent font-display text-2xl font-bold text-accent-foreground md:h-36">
                      {d.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1 p-3">
                    <p className="font-display text-sm font-bold">{d.name}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{d.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-bold text-primary">{fcfa(d.price)}</span>
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Plus className="size-4" />
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl bg-card p-5 shadow-soft">
          <h2 className="mb-3 font-display text-lg font-bold">Current order</h2>
          {cartPanel}
        </div>
      </aside>

      {count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between rounded-full bg-brand px-5 py-3 text-primary-foreground shadow-float md:bottom-6 lg:hidden no-print"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="size-4" /> {count} item{count > 1 ? "s" : ""}
          </span>
          <span className="font-display font-bold">{fcfa(total)}</span>
        </button>
      )}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Cart</DialogTitle>
          </DialogHeader>
          {cartPanel}
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>
          {receipt && <Receipt order={receipt} settings={settings} />}
          <Button className="rounded-full no-print" onClick={() => void printCurrentReceipt()}>
            <Printer className="size-4" /> Print receipt
          </Button>
        </DialogContent>
      </Dialog>
      {receipt && <div className="receipt-print"><Receipt order={receipt} settings={settings} /></div>}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
