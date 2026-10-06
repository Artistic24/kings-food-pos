import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { listOrders, setOrderStatus, type OrderStatus } from "@/lib/db";
import { fcfa, timeOf, STATUS_LABEL } from "@/lib/kings";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen — Kings Food" },
      { name: "description", content: "Track new orders in the kitchen and mark them preparing, ready or served." },
      { property: "og:title", content: "Kitchen — Kings Food" },
      { property: "og:description", content: "Live kitchen board for Kings Food orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitchenPage,
});

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  new: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};

const TONE: Record<OrderStatus, string> = {
  new: "bg-primary/15 text-primary",
  preparing: "bg-warning/25 text-warning-foreground",
  ready: "bg-success/20 text-success",
  served: "bg-muted text-muted-foreground",
};

function KitchenPage() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: listOrders, refetchInterval: 5000 });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => setOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status updated");
    },
  });

  const active = orders.filter((o) => o.status !== "served");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Kitchen</h1>
      {active.length === 0 ? (
        <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
          No pending orders. Enjoy the break!
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((o) => {
            const next = NEXT[o.status];
            return (
            <li key={o.id} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-bold">
                    {o.mode === "table" ? `Table ${o.table}` : `Delivery · ${o.zone}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.ref} · {timeOf(o.createdAt)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TONE[o.status]}`}>
                  {STATUS_LABEL[o.status]}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i) => (
                  <li key={i.dishId} className="flex justify-between">
                    <span className="font-medium">
                      {i.qty} × {i.name}
                    </span>
                    <span className="text-muted-foreground">{fcfa(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display font-bold text-primary">{fcfa(o.total)}</span>
                {next && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => advance.mutate({ id: o.id, status: next })}
                  >
                    Mark {STATUS_LABEL[next]?.toLowerCase()}
                  </Button>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
