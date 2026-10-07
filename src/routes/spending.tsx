import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, getSettings, listSpendings, saveSpending, deleteSpending, uid, type Spending } from "@/lib/db";
import { dateOf, fcfa, makeRef, timeOf } from "@/lib/kings";
import { printSpendingAndArchive } from "@/lib/desktop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/spending")({ component: SpendingPage, head: () => ({ meta: [{ title: "Spending — Kings Food" }] }) });
const CATEGORIES = ["Supplies","Repairs","Equipment","Utilities","Maintenance","Other"];
const day=(a:number,b:number)=>new Date(a).toDateString()===new Date(b).toDateString();
const month=(a:number,b:number)=>{const x=new Date(a),y=new Date(b);return x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()};
const year=(a:number,b:number)=>new Date(a).getFullYear()===new Date(b).getFullYear();

function SpendingPage(){
 const qc=useQueryClient(), {data:spendings=[]}=useQuery({queryKey:["spendings"],queryFn:listSpendings}), {data:settings=DEFAULT_SETTINGS}=useQuery({queryKey:["settings"],queryFn:getSettings});
 const [description,setDescription]=useState(""),[reference,setReference]=useState(""),[category,setCategory]=useState(CATEGORIES[0]),[amount,setAmount]=useState(""),[vendor,setVendor]=useState(""),[paymentMethod,setPaymentMethod]=useState("cash"),[notes,setNotes]=useState(""),[receipt,setReceipt]=useState<Spending|null>(null),[search,setSearch]=useState("");
 const filteredSpendings=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return spendings;return spendings.filter(s=>[s.ref,s.reference,s.description,s.vendor,s.notes].some(v=>String(v??"").toLowerCase().includes(q)))},[spendings,search]);
 const now=Date.now(), daily=useMemo(()=>spendings.filter(s=>day(s.createdAt,now)),[spendings,now]), monthly=useMemo(()=>spendings.filter(s=>month(s.createdAt,now)),[spendings,now]), yearly=useMemo(()=>spendings.filter(s=>year(s.createdAt,now)),[spendings,now]);
 const sum=(xs:Spending[])=>xs.reduce((a,s)=>a+s.amount,0);
 const printSpendingReceipt = async (item: Spending) => {
   try {
     const result = await printSpendingAndArchive(item, settings);
     if (result.printed && result.archived) toast.success(result.message || "Spending receipt printed and saved to Excel");
     else if (result.printed) toast.warning(result.message || "Printed, but Excel archiving failed");
     else toast.info(result.message || "Printing was cancelled");
   } catch (error) {
     console.error("Spending print/archive failed:", error);
     toast.error("Could not complete the spending receipt print.");
   }
 };
 const create=useMutation({mutationFn:async()=>{const n=Number(amount);if(!description.trim()||!Number.isFinite(n)||n<=0)throw new Error("Enter a description and valid amount.");const s:Spending={id:uid(),ref:makeRef(),reference:reference.trim()||undefined,description:description.trim(),category,amount:Math.round(n),vendor:vendor.trim()||undefined,paymentMethod,notes:notes.trim()||undefined,createdAt:Date.now()};await saveSpending(s);return s},onSuccess:s=>{qc.invalidateQueries({queryKey:["spendings"]});setDescription("");setReference("");setAmount("");setVendor("");setNotes("");setReceipt(s);toast.success("Spending recorded")},onError:e=>toast.error(e instanceof Error?e.message:"Could not save spending")});
 return <div className="space-y-5">
  <div><p className="text-sm text-muted-foreground">Restaurant expenses</p><h1 className="font-display text-2xl font-extrabold">Spending</h1></div>
  <section className="rounded-2xl bg-card p-4 shadow-soft"><h2 className="font-display font-bold">Record a spending</h2><div className="mt-4 grid gap-3 md:grid-cols-2">
   <Field label="Description"><Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Buy new bulbs"/></Field>
   <Field label="Reference"><Input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Optional reference / important note" maxLength={120}/></Field>
   <Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></Field>
   <Field label="Amount (FCFA)"><Input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="5000"/></Field>
   <Field label="Supplier / recipient"><Input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Optional"/></Field>
   <Field label="Payment method"><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{settings.payments.filter(p=>p.enabled).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
   <Field label="Notes"><Textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional details"/></Field>
  </div><Button className="mt-4 rounded-full" disabled={create.isPending} onClick={()=>create.mutate()}>Record spending & print receipt</Button></section>
  <div className="grid gap-3 md:grid-cols-3"><Summary title="Today" amount={sum(daily)}/><Summary title="This month" amount={sum(monthly)}/><Summary title="This year" amount={sum(yearly)}/></div>
  <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Spending history</h2><span className="text-xs text-muted-foreground">{filteredSpendings.length} result{filteredSpendings.length===1?"":"s"}</span></div><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by reference or receipt code" className="rounded-full pl-9"/></div>{spendings.length===0?<p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No spendings recorded yet.</p>:filteredSpendings.length?<ul className="space-y-2">{filteredSpendings.map(s=><li key={s.id} className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-soft"><button className="min-w-0 flex-1 text-left" onClick={()=>setReceipt(s)}><p className="truncate text-sm font-semibold">{s.description}</p><p className="text-[11px] text-muted-foreground">Receipt: {s.ref} · {s.category} · {dateOf(s.createdAt)} {timeOf(s.createdAt)}</p>{s.reference&&<p className="text-[11px] text-muted-foreground">Reference: {s.reference}</p>}</button><span className="font-display font-bold text-destructive">−{fcfa(s.amount)}</span><Button size="icon" variant="ghost" className="size-8" onClick={async()=>{if(confirm("Delete spending "+s.ref+"?")){await deleteSpending(s.id);qc.invalidateQueries({queryKey:["spendings"]})}}}><Trash2 className="size-4 text-destructive"/></Button></li>)}</ul>:<p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No matching spending receipts found.</p>}</section>
  <Dialog open={!!receipt} onOpenChange={v=>!v&&setReceipt(null)}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Spending receipt</DialogTitle></DialogHeader>{receipt&&<SpendingReceipt spending={receipt} settings={settings}/>}<Button className="rounded-full no-print" onClick={()=>receipt&&void printSpendingReceipt(receipt)}><Printer className="size-4"/> Print receipt</Button></DialogContent></Dialog>
  {receipt&&<div className="receipt-print"><SpendingReceipt spending={receipt} settings={settings}/></div>}
 </div>
}
function Field({label,children}:{label:string;children:ReactNode}){return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>}
function Summary({title,amount}:{title:string;amount:number}){return <div className="rounded-2xl bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground">{title} spending</p><p className="font-display text-xl font-extrabold text-destructive">{fcfa(amount)}</p></div>}
function SpendingReceipt({spending,settings}:{spending:Spending;settings:typeof DEFAULT_SETTINGS}){const m=settings.payments.find(p=>p.id===spending.paymentMethod);return <div className="receipt-content space-y-3 rounded-lg border border-dashed border-border bg-card p-4 text-sm"><div className="text-center"><img src={settings.receiptLogo || "/icons/kf-mark.png"} alt="" width="48" height="48" className="mx-auto size-12 object-contain"/><p className="font-display text-lg font-extrabold uppercase">{settings.businessName}</p><p className="text-xs text-muted-foreground">{settings.address}</p><p className="mt-2 text-xs font-bold">SPENDING RECEIPT</p><p className="text-xs text-muted-foreground">Receipt code: {spending.ref} · {dateOf(spending.createdAt)} {timeOf(spending.createdAt)}</p>{spending.reference&&<p className="mt-1 text-xs font-semibold">Reference: {spending.reference}</p>}</div><div className="space-y-2 border-y border-dashed border-border py-3"><Row label="Description" value={spending.description}/><Row label="Category" value={spending.category}/>{spending.vendor&&<Row label="Supplier / recipient" value={spending.vendor}/>} {m&&<Row label="Payment" value={m.name}/>}<Row label="Amount" value={fcfa(spending.amount)}/>{spending.notes&&<Row label="Notes" value={spending.notes}/>}</div><p className="text-center text-[11px] text-muted-foreground">{settings.receiptFooter}</p></div>}
function Row({label,value}:{label:string;value:string}){return <div className="flex justify-between gap-4 text-xs"><span className="text-muted-foreground">{label}</span><span className="text-right font-semibold">{value}</span></div>}
