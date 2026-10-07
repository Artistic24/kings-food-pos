import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, getSettings, listOrders, type Order } from "@/lib/db";
import { fcfa, dateOf, timeOf, isSameDay, STATUS_LABEL } from "@/lib/kings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt } from "@/components/Receipt";
import { printReceiptAndArchive } from "@/lib/desktop";

export const Route = createFileRoute("/sales")({ component: SalesPage, head: () => ({ meta: [{ title: "Sales — Kings Food" }] }) });

function startOfDay(d: Date){const x=new Date(d);x.setHours(0,0,0,0);return x}
function startOfWeek(d: Date){const x=startOfDay(d);const day=x.getDay();x.setDate(x.getDate()-(day===0?6:day-1));return x}
function keyDay(d: Date){return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function keyMonth(d: Date){return `${d.getFullYear()}-${d.getMonth()}`}
function revenue(orders:Order[],from:number,to:number){return orders.filter(o=>o.createdAt>=from&&o.createdAt<to).reduce((s,o)=>s+o.total,0)}

function buildDaily(orders:Order[]){
 const end=startOfDay(new Date()); return Array.from({length:7},(_,i)=>{const d=new Date(end);d.setDate(end.getDate()-6+i);const n=new Date(d);n.setDate(d.getDate()+1);return {label:d.toLocaleDateString("en-US",{weekday:"short"}),value:revenue(orders,d.getTime(),n.getTime())}});
}
function buildWeekly(orders:Order[]){
 const end=startOfWeek(new Date()); return Array.from({length:8},(_,i)=>{const d=new Date(end);d.setDate(end.getDate()-7*(7-i));const n=new Date(d);n.setDate(d.getDate()+7);return {label:d.toLocaleDateString("en-US",{day:"2-digit",month:"short"}),value:revenue(orders,d.getTime(),n.getTime())}});
}
function buildMonthly(orders:Order[]){
 const end=new Date();end.setDate(1);end.setHours(0,0,0,0); return Array.from({length:12},(_,i)=>{const d=new Date(end.getFullYear(),end.getMonth()-(11-i),1);const n=new Date(d.getFullYear(),d.getMonth()+1,1);return {label:d.toLocaleDateString("en-US",{month:"short"}),value:revenue(orders,d.getTime(),n.getTime())}});
}
function buildYearly(orders:Order[]){
 const y=new Date().getFullYear(); return Array.from({length:5},(_,i)=>{const yr=y-4+i;return {label:String(yr),value:revenue(orders,new Date(yr,0,1).getTime(),new Date(yr+1,0,1).getTime())}});
}

function SalesPage(){
 const {data:orders=[]}=useQuery({queryKey:["orders"],queryFn:listOrders}),{data:settings=DEFAULT_SETTINGS}=useQuery({queryKey:["settings"],queryFn:getSettings});
 const [open,setOpen]=useState<Order|null>(null);
 const [search,setSearch]=useState("");
 const filteredOrders=useMemo(()=>{
   const q=search.trim().toLowerCase();
   if(!q) return orders;
   return orders.filter(o=>[o.ref,o.reference,o.customer,o.phone,o.table,o.zone].some(v=>String(v??"").toLowerCase().includes(q)));
 },[orders,search]);
 const printOpenReceipt = async () => {
   if (!open) return;
   try {
     const result = await printReceiptAndArchive(open, settings);
     if (result.printed && result.archived) toast.success("Receipt printed and saved to Excel");
     else if (result.printed) toast.warning("Receipt printed, but Excel archiving failed");
     else if (result.fallback) toast.info(result.message || "Browser print dialog opened");
   } catch (error) {
     console.error("Receipt print/archive failed:", error);
     toast.error("Could not complete the receipt print.");
   }
 };
 const today=useMemo(()=>orders.filter(o=>isSameDay(o.createdAt,Date.now())),[orders]);
 const revenueToday=today.reduce((s,o)=>s+o.total,0),delivery=today.filter(o=>o.mode==="delivery").length,avg=today.length?Math.round(revenueToday/today.length):0;
 const byMethod=today.reduce<Record<string,number>>((a,o)=>{const n=settings.payments.find(p=>p.id===o.paymentMethod)?.name??"Other";a[n]=(a[n]??0)+o.total;return a}, {});
 const topDishes=useMemo(()=>{const m=new Map<string,{name:string;qty:number;amount:number}>();today.forEach(o=>o.items.forEach(i=>{const x=m.get(i.name)??{name:i.name,qty:0,amount:0};m.set(i.name,{name:i.name,qty:x.qty+i.qty,amount:x.amount+i.qty*i.price})}));return [...m.values()].sort((a,b)=>b.qty-a.qty).slice(0,5)},[today]);
 return <div className="space-y-5">
  <div><p className="text-sm text-muted-foreground">Revenue analytics</p><h1 className="font-display text-2xl font-extrabold">Sales</h1></div>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Today's revenue" value={fcfa(revenueToday)} highlight/><Stat label="Orders" value={String(today.length)}/><Stat label="Deliveries" value={String(delivery)}/><Stat label="Average order" value={fcfa(avg)}/></div>
  <div className="grid gap-4 xl:grid-cols-2">
   <RevenueChart title="Daily revenue — last 7 days" data={buildDaily(orders)}/>
   <RevenueChart title="Weekly revenue — last 8 weeks" data={buildWeekly(orders)}/>
   <RevenueChart title="Monthly revenue — last 12 months" data={buildMonthly(orders)}/>
   <RevenueChart title="Yearly revenue — last 5 years" data={buildYearly(orders)}/>
  </div>
  <section className="rounded-2xl bg-card p-4 shadow-soft"><h2 className="font-display text-sm font-bold">Best sellers today</h2>{topDishes.length?<ul className="mt-2 space-y-2">{topDishes.map(d=><li key={d.name} className="flex justify-between text-sm"><span>{d.name} <span className="text-muted-foreground">× {d.qty}</span></span><b className="text-primary">{fcfa(d.amount)}</b></li>)}</ul>:<p className="mt-2 text-sm text-muted-foreground">No sales yet today.</p>}</section>
  <section className="rounded-2xl bg-card p-4 shadow-soft"><h2 className="font-display text-sm font-bold">Revenue by payment method today</h2>{Object.keys(byMethod).length?<ul className="mt-2 space-y-2">{Object.entries(byMethod).map(([n,a])=><li key={n} className="flex justify-between text-sm"><span>{n}</span><b className="text-primary">{fcfa(a)}</b></li>)}</ul>:<p className="mt-2 text-sm text-muted-foreground">Nothing yet.</p>}</section>
  <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-sm font-bold">Sales history</h2><span className="text-xs text-muted-foreground">{filteredOrders.length} result{filteredOrders.length===1?"":"s"}</span></div><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by reference or receipt code" className="rounded-full pl-9"/></div>{orders.length?<ul className="space-y-2">{filteredOrders.length?filteredOrders.map(o=><li key={o.id}><button onClick={()=>setOpen(o)} className="flex w-full items-center justify-between rounded-2xl bg-card p-3 text-left shadow-soft"><div><p className="text-sm font-semibold">{o.mode==="table"?`Table ${o.table}`:`Delivery · ${o.zone}`}</p><p className="text-[11px] text-muted-foreground">Receipt: {o.ref} · {dateOf(o.createdAt)} {timeOf(o.createdAt)} · {STATUS_LABEL[o.status]}</p>{o.reference&&<p className="text-[11px] text-muted-foreground">Reference: {o.reference}</p>}</div><span className="font-display font-bold text-primary">{fcfa(o.total)}</span></button></li>)}</ul>:<p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">{orders.length?"No matching receipts found.":"No orders recorded yet."}</p>}</section>
  <Dialog open={!!open} onOpenChange={v=>!v&&setOpen(null)}><DialogContent className="max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>{open&&<Receipt order={open} settings={settings}/>}<Button className="rounded-full no-print" onClick={()=>void printOpenReceipt()}><Printer className="size-4"/> Print</Button></DialogContent></Dialog>{open&&<div className="receipt-print"><Receipt order={open} settings={settings}/></div>}
 </div>
}
function RevenueChart({title,data}:{title:string;data:{label:string;value:number}[]}){
 const max=Math.max(...data.map(x=>x.value),1),w=520,h=190,p=28;
 const points=data.map((x,i)=>`${p+i*((w-2*p)/Math.max(1,data.length-1))},${h-p-(x.value/max)*(h-2*p)}`).join(" ");
 return <section className="rounded-2xl bg-card p-4 shadow-soft"><div className="flex items-center justify-between"><h2 className="font-display text-sm font-bold">{title}</h2><span className="text-xs text-muted-foreground">{fcfa(data.reduce((s,x)=>s+x.value,0))}</span></div><div className="mt-3 overflow-x-auto"><svg viewBox={`0 0 ${w} ${h}`} className="h-48 min-w-[520px] w-full" role="img" aria-label={title}><line x1={p} y1={h-p} x2={w-p} y2={h-p} stroke="currentColor" opacity=".15"/><polyline fill="none" stroke="currentColor" strokeWidth="3" points={points}/>{data.map((x,i)=>{const cx=p+i*((w-2*p)/Math.max(1,data.length-1));const cy=h-p-(x.value/max)*(h-2*p);return <g key={x.label+i}><circle cx={cx} cy={cy} r="4" fill="currentColor"/><text x={cx} y={h-7} textAnchor="middle" fontSize="10" fill="currentColor" opacity=".65">{x.label}</text></g>})}</svg></div></section>
}
function Stat({label,value,highlight}:{label:string;value:string;highlight?:boolean}){return <div className={`rounded-2xl p-4 shadow-soft ${highlight?"bg-brand text-primary-foreground":"bg-card"}`}><p className={`text-[11px] ${highlight?"opacity-85":"text-muted-foreground"}`}>{label}</p><p className="font-display text-lg font-extrabold">{value}</p></div>}
