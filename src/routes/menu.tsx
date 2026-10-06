import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCategory, deleteDish, listCategories, listDishes, saveCategory, saveDish, uid, type Dish } from "@/lib/db";
import { fcfa, fileToDataUrl } from "@/lib/kings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Kings Food" },
      { name: "description", content: "Manage menu categories and dishes with photos, prices and descriptions." },
      { property: "og:title", content: "Menu — Kings Food" },
      { property: "og:description", content: "Add, edit and delete dishes and categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

type Draft = Omit<Dish, "photo"> & { photo?: string | undefined };

function MenuPage() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const { data: dishes = [] } = useQuery({ queryKey: ["dishes"], queryFn: listDishes });
  const [newCat, setNewCat] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => qc.invalidateQueries();

  const openNew = () =>
    setDraft({ id: uid(), name: "", categoryId: categories[0]?.id ?? "", price: 0, description: "", available: true, createdAt: Date.now() });

  const save = async () => {
    if (!draft || !draft.name.trim() || !draft.categoryId) {
      toast.error("Name and category are required");
      return;
    }
    const { photo, ...rest } = draft;
    await saveDish(photo ? { ...rest, photo } : rest);
    setDraft(null);
    refresh();
    toast.success("Dish saved");
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="font-display text-2xl font-extrabold">Menu</h1>
        <div className="flex gap-2">
          <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" />
          <Button
            className="rounded-full"
            onClick={async () => {
              if (!newCat.trim()) return;
              await saveCategory({ id: uid(), name: newCat.trim(), createdAt: Date.now() });
              setNewCat("");
              refresh();
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
              {c.name}
              <button
                aria-label={`Delete ${c.name}`}
                onClick={async () => {
                  if (!confirm(`Delete "${c.name}" and its dishes?`)) return;
                  await deleteCategory(c.id);
                  refresh();
                }}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Dishes</h2>
          <Button className="rounded-full" onClick={openNew} disabled={!categories.length}>
            <Plus className="size-4" /> New dish
          </Button>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dishes.map((d) => (
            <li key={d.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
              {d.photo ? (
                <img src={d.photo} alt={d.name} className="size-16 rounded-xl object-cover" />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-xl bg-accent font-bold text-accent-foreground">{d.name.slice(0, 2)}</div>
              )}
              <div className="flex-1">
                <p className="font-semibold">{d.name}</p>
                <p className="text-xs text-muted-foreground">{categories.find((c) => c.id === d.categoryId)?.name}</p>
                <p className="text-sm font-bold text-primary">{fcfa(d.price)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="outline" className="size-8" onClick={() => setDraft(d)} aria-label="Edit">
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete ${d.name}?`)) return;
                    await deleteDish(d.id);
                    refresh();
                  }}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Dish</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              {draft.photo && <img src={draft.photo} alt="" className="h-36 w-full rounded-xl object-cover" />}
              <div className="space-y-1.5">
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setDraft({ ...draft, photo: await fileToDataUrl(f) });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price (FCFA)</Label>
                <Input id="price" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat">Category</Label>
                <select id="cat" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.available} onChange={(e) => setDraft({ ...draft, available: e.target.checked })} /> Available
              </label>
              <Button className="w-full rounded-full" onClick={save}>Save dish</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
