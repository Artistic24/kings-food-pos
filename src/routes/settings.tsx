import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DEFAULT_SETTINGS, getSettings, saveSettings, uid, type Settings } from "@/lib/db";
import { fileToDataUrl } from "@/lib/kings";
import { setLang, useLang } from "@/lib/i18n";
import { getDesktopPrinters, type DesktopPrinter } from "@/lib/desktop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Kings Food" },
      { name: "description", content: "Business info, payment methods with QR codes, delivery zones and tax settings." },
      { property: "og:title", content: "Settings — Kings Food" },
      { property: "og:description", content: "Configure payments, delivery zones and receipts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const lang = useLang();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [printers, setPrinters] = useState<DesktopPrinter[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  useEffect(() => {
    if (data) setS(data);
  }, [data]);

  const refreshPrinters = async () => {
    setLoadingPrinters(true);
    try {
      setPrinters(await getDesktopPrinters());
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    void refreshPrinters();
  }, []);

  const save = async () => {
    await saveSettings(s);
    qc.invalidateQueries({ queryKey: ["settings"] });
    toast.success("Settings saved");
  };

  const field = (label: string, key: "businessName" | "tagline" | "address" | "phone" | "receiptFooter") => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <h1 className="font-display text-2xl font-extrabold">Settings</h1>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold">Receipt printer</h2>
            <p className="text-xs text-muted-foreground">The Windows app prints receipts directly to this printer. Leave it on Windows default when using one main POS printer.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold"
            onClick={() => void refreshPrinters()}
            disabled={loadingPrinters}
          >
            <RefreshCw className={`size-4 ${loadingPrinters ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {printers.length ? (
          <select
            value={s.printerName ?? ""}
            onChange={(e) => setS({ ...s, printerName: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Windows default printer</option>
            {printers.map((printer) => (
              <option key={printer.name} value={printer.name}>
                {printer.displayName || printer.name}{printer.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No printer list is available in the browser/PWA. The installed Windows app will use the Windows default printer unless you select one here.
          </div>
        )}
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold"
          onClick={() => void window.kingsFoodDesktop?.openReceiptsFolder()}
          disabled={!window.kingsFoodDesktop}
        >
          <FolderOpen className="size-4" /> Open Excel receipts folder
        </button>
        <p className="text-xs text-muted-foreground">
          Every successful printed receipt is archived automatically into a daily Excel workbook in your Windows Documents/Kings Food POS/Receipts folder.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <h2 className="font-display font-bold">Language</h2>
        <p className="text-xs text-muted-foreground">Choose the language used across the app.</p>
        <div className="flex gap-2">
          <Button variant={lang === "en" ? "default" : "outline"} className="rounded-full" onClick={() => setLang("en")}>English</Button>
          <Button variant={lang === "fr" ? "default" : "outline"} className="rounded-full" onClick={() => setLang("fr")}>French</Button>
        </div>
      </section>


      <section className="grid gap-3 rounded-2xl bg-card p-4 shadow-soft md:grid-cols-2">
        <h2 className="font-display font-bold md:col-span-2">Business</h2>
        {field("Business name", "businessName")}
        {field("Tagline", "tagline")}
        {field("Address", "address")}
        {field("Phone", "phone")}
        {field("Receipt footer", "receiptFooter")}
        <div className="space-y-1.5">
          <Label>Tax rate (%)</Label>
          <Input type="number" value={s.taxRate} onChange={(e) => setS({ ...s, taxRate: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Number of tables</Label>
          <Input type="number" value={s.tables} onChange={(e) => setS({ ...s, tables: Number(e.target.value) })} />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">Payment methods & QR codes</h2>
          <Button size="sm" className="rounded-full" onClick={() => setS({ ...s, payments: [...s.payments, { id: uid(), name: "New method", account: "", holder: "", instructions: "", enabled: true }] })}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Mobile money can use an official QR code or account number. Cash and bank card do not use QR codes.</p>
        {s.payments.map((p, i) => {
          const upd = (patch: Partial<typeof p>) => setS({ ...s, payments: s.payments.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={p.id} className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-2">
              <Input value={p.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Name (e.g. MTN MoMo)" />
              {p.id !== "cash" && p.id !== "card" && <Input value={p.account} onChange={(e) => upd({ account: e.target.value })} placeholder="Account / phone number" />}
              {p.id !== "cash" && p.id !== "card" && <Input value={p.holder} onChange={(e) => upd({ holder: e.target.value })} placeholder="Account holder name" />}
              <Input value={p.instructions} onChange={(e) => upd({ instructions: e.target.value })} placeholder="Instructions" />
              {p.id !== "cash" && p.id !== "card" && <div className="flex items-center gap-2">
                {p.qrImage && <img src={p.qrImage} alt="QR" className="size-12 rounded object-contain" />}
                <Input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) upd({ qrImage: await fileToDataUrl(f, 600) }); }} />
              </div>}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={p.enabled} onChange={(e) => upd({ enabled: e.target.checked })} /> Enabled
                </label>
                <Button size="icon" variant="outline" aria-label="Remove" onClick={() => setS({ ...s, payments: s.payments.filter((_, j) => j !== i) })}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">Delivery zones (Yaoundé)</h2>
          <Button size="sm" className="rounded-full" onClick={() => setS({ ...s, zones: [...s.zones, { name: "New zone", fee: 1000 }] })}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        {s.zones.map((z, i) => (
          <div key={i} className="flex gap-2">
            <Input value={z.name} onChange={(e) => setS({ ...s, zones: s.zones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <Input type="number" className="w-32" value={z.fee} onChange={(e) => setS({ ...s, zones: s.zones.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) } : x)) })} />
            <Button size="icon" variant="outline" aria-label="Remove zone" onClick={() => setS({ ...s, zones: s.zones.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </section>

      <Button className="w-full rounded-full md:w-auto" onClick={save}>Save settings</Button>
    </div>
  );
}
