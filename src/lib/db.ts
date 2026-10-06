import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import poulet from "@/assets/dish-poulet.jpg";
import poisson from "@/assets/dish-poisson.jpg";
import soda from "@/assets/drink-soda.jpg";
import { ADDITIONAL_DISHES, CAMEROON_DRINKS } from "./menu-seeds";

export type Category = { id: string; name: string; createdAt: number };

export type Dish = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  description: string;
  photo?: string;
  available: boolean;
  createdAt: number;
};

export type OrderItem = {
  dishId: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderStatus = "new" | "preparing" | "ready" | "served";

export type Order = {
  id: string;
  ref: string;
  mode: "table" | "delivery";
  table?: string | undefined;
  customer?: string | undefined;
  phone?: string | undefined;
  zone?: string | undefined;
  deliveryFee: number;
  items: OrderItem[];
  subtotal: number;
  discountPercent?: number;
  discount?: number;
  total: number;
  tax: number;
  paymentMethod?: string;
  paid?: boolean;
  tendered?: number;
  status: OrderStatus;
  createdAt: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  account: string;
  holder: string;
  instructions: string;
  qrImage?: string;
  enabled: boolean;
};

export type Zone = { name: string; fee: number };

export type Settings = {
  id: "main";
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  taxRate: number;
  receiptFooter: string;
  tables: number;
  zones: Zone[];
  payments: PaymentMethod[];
};

export const DEFAULT_SETTINGS: Settings = {
  id: "main",
  businessName: "Kings Food",
  tagline: "The Royal Taste",
  address: "Yaoundé, Cameroon",
  phone: "",
  taxRate: 0,
  receiptFooter: "Thank you, see you soon!",
  tables: 20,
  zones: [
    { name: "City Centre", fee: 500 },
    { name: "Bastos", fee: 1500 },
    { name: "Essos", fee: 1000 },
    { name: "Biyem-Assi", fee: 1000 },
    { name: "Mvan", fee: 1000 },
    { name: "Nsimeyong", fee: 1000 },
    { name: "Mokolo", fee: 1000 },
    { name: "Odza", fee: 2000 },
    { name: "Emana", fee: 2000 },
    { name: "Ngoa-Ekelle", fee: 1000 },
  ],
  payments: [
    { id: "cash", name: "Cash", account: "", holder: "", instructions: "Pay at the counter.", enabled: true },
    { id: "card", name: "Bank card", account: "", holder: "", instructions: "Charge with your card terminal, then confirm here.", enabled: true },
    { id: "mtn", name: "MTN Mobile Money", account: "", holder: "", instructions: "Scan or dial *126# and pay to the number shown.", enabled: true },
    { id: "orange", name: "Orange Money", account: "", holder: "", instructions: "Scan or dial #150# and pay to the number shown.", enabled: true },
  ],
};

interface KingsDB extends DBSchema {
  settings: { key: string; value: Settings };
  categories: { key: string; value: Category };
  dishes: { key: string; value: Dish; indexes: { byCategory: string } };
  orders: { key: string; value: Order; indexes: { byCreatedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<KingsDB>> | null = null;

export const hasIDB = () => typeof indexedDB !== "undefined";

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KingsDB>("kings-food", 5, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 2 && !db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (oldVersion < 1) {
          db.createObjectStore("categories", { keyPath: "id" });
          const dishes = db.createObjectStore("dishes", { keyPath: "id" });
          dishes.createIndex("byCategory", "categoryId");
          const orders = db.createObjectStore("orders", { keyPath: "id" });
          orders.createIndex("byCreatedAt", "createdAt");
        }
        if (oldVersion >= 1 && oldVersion < 3) {
          const categories = transaction.objectStore("categories");
          const dishes = transaction.objectStore("dishes");
          for (const dish of ADDITIONAL_DISHES) {
            const request = categories.get(dish.categoryId);
            request.then((category) => {
              if (category) void dishes.add({ ...dish, createdAt: Date.now() + dish.createdAt });
            });
          }
        }
        if (oldVersion >= 2 && oldVersion < 4) {
          const settings = transaction.objectStore("settings");
          const card = DEFAULT_SETTINGS.payments.find((payment) => payment.id === "card");
          void settings.get("main").then((current) => {
            if (card && current && !current.payments.some((payment) => payment.id === "card")) {
              void settings.put({ ...current, payments: [...current.payments, card] });
            }
          });
        }
        if (oldVersion >= 1 && oldVersion < 5) {
          const categories = transaction.objectStore("categories");
          const dishes = transaction.objectStore("dishes");
          void categories.get("c-boissons").then((category) => {
            if (!category) return;
            for (const d of CAMEROON_DRINKS) void dishes.put({ ...d, createdAt: Date.now() + d.createdAt });
          });
        }
      },
    }).then(async (db) => {
      const count = await db.count("categories");
      if (count === 0) await seed(db);
      return db;
    });
  }
  return dbPromise;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

async function seed(db: IDBPDatabase<KingsDB>) {
  const now = Date.now();
  const cats: Category[] = [
    { id: "c-plats", name: "Main Dishes", createdAt: now },
    { id: "c-grillades", name: "Grills", createdAt: now + 1 },
    { id: "c-boissons", name: "Drinks", createdAt: now + 2 },
  ];
  const dishes: Dish[] = [
    {
      id: uid(),
      name: "Chicken DG",
      categoryId: "c-plats",
      price: 3500,
      description: "Braised chicken with ripe plantains and sautéed vegetables.",
      photo: poulet,
      available: true,
      createdAt: now,
    },
    {
      id: uid(),
      name: "Grilled Fish",
      categoryId: "c-grillades",
      price: 4000,
      description: "Grilled tilapia, pepper sauce and plantains.",
      photo: poisson,
      available: true,
      createdAt: now + 1,
    },
    {
      id: uid(),
      name: "Soda 33cl",
      categoryId: "c-boissons",
      price: 700,
      description: "Ice-cold soft drink.",
      photo: soda,
      available: true,
      createdAt: now + 2,
    },
  ];
  const tx = db.transaction(["categories", "dishes"], "readwrite");
  await Promise.all([
    ...cats.map((c) => tx.objectStore("categories").put(c)),
    ...[...dishes, ...[...ADDITIONAL_DISHES, ...CAMEROON_DRINKS].map((d) => ({ ...d, createdAt: now + d.createdAt }))].map((d) => tx.objectStore("dishes").put(d)),
  ]);
  await tx.done;
}

/* categories */
export async function listCategories(): Promise<Category[]> {
  if (!hasIDB()) return [];
  const db = await getDB();
  return (await db.getAll("categories")).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveCategory(c: Category) {
  const db = await getDB();
  await db.put("categories", c);
}

export async function deleteCategory(id: string) {
  const db = await getDB();
  const dishes = await db.getAllFromIndex("dishes", "byCategory", id);
  const tx = db.transaction(["categories", "dishes"], "readwrite");
  await Promise.all([
    tx.objectStore("categories").delete(id),
    ...dishes.map((d) => tx.objectStore("dishes").delete(d.id)),
  ]);
  await tx.done;
}

/* dishes */
export async function listDishes(): Promise<Dish[]> {
  if (!hasIDB()) return [];
  const db = await getDB();
  return (await db.getAll("dishes")).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveDish(d: Dish) {
  const db = await getDB();
  await db.put("dishes", d);
}

export async function deleteDish(id: string) {
  const db = await getDB();
  await db.delete("dishes", id);
}

/* orders */
export async function listOrders(): Promise<Order[]> {
  if (!hasIDB()) return [];
  const db = await getDB();
  return (await db.getAll("orders")).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveOrder(o: Order) {
  const db = await getDB();
  await db.put("orders", o);
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  const db = await getDB();
  const order = await db.get("orders", id);
  if (!order) return;
  await db.put("orders", { ...order, status });
}

export async function deleteOrder(id: string) {
  const db = await getDB();
  await db.delete("orders", id);
}

/* settings */
export async function getSettings(): Promise<Settings> {
  if (!hasIDB()) return DEFAULT_SETTINGS;
  const db = await getDB();
  const s = await db.get("settings", "main");
  return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings) {
  const db = await getDB();
  await db.put("settings", s);
}
