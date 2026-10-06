import { QRCodeSVG } from "qrcode.react";
import type { PaymentMethod } from "@/lib/db";
import { fcfa } from "@/lib/kings";
import { hasPaymentQR } from "@/lib/payment";

export function qrPayload(m: PaymentMethod, amount: number, ref?: string) {
  return [m.name, m.account && `Account: ${m.account}`, m.holder && `Name: ${m.holder}`, `Amount: ${amount} FCFA`, ref && `Ref: ${ref}`]
    .filter(Boolean)
    .join("\n");
}

export function PayQR({ method, amount, refCode, size = 168 }: { method: PaymentMethod; amount: number; refCode?: string; size?: number }) {
  if (!hasPaymentQR(method)) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center">
      <p className="font-display text-sm font-bold">Scan to pay · {method.name}</p>
      {method.qrImage ? (
        <img src={method.qrImage} alt={`${method.name} QR code`} width={size} height={size} className="rounded-lg object-contain" style={{ width: size, height: size }} />
      ) : (
        <div className="rounded-lg bg-card p-2">
          <QRCodeSVG value={qrPayload(method, amount, refCode)} size={size} level="M" />
        </div>
      )}
      <p className="font-display text-lg font-extrabold text-primary">{fcfa(amount)}</p>
      {method.account && (
        <p className="text-xs">
          <span className="text-muted-foreground">Pay to </span>
          <span className="font-semibold">{method.account}</span>
          {method.holder && <span className="text-muted-foreground"> · {method.holder}</span>}
        </p>
      )}
      {method.instructions && <p className="text-[11px] text-muted-foreground">{method.instructions}</p>}
    </div>
  );
}
