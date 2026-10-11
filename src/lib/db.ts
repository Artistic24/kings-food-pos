import { openDB, type DBSchema, type IDBPDatabase } from "idb";


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
  reference?: string;
  patientCode?: string;
  service?: string;
  practitioner?: string;
  receiptKind?: "cashier" | "pharmacy";
  amountPaid?: number;
  depositBalance?: number;
  mode: "table" | "delivery" | "medical";
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

export type Spending = {
  id: string;
  ref: string;
  reference?: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  vendor?: string;
  notes?: string;
  createdAt: number;
};

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
  printerName?: string;
  receiptLogo?: string;
  cashierName?: string;
};

export const DEFAULT_SETTINGS: Settings = {
  id: "main",
  businessName: "CENTRE MEDICAL",
  tagline: "Reçus de caisse, laboratoire et pharmacie",
  address: "",
  phone: "",
  taxRate: 0,
  receiptFooter: "Merci pour votre confiance.",
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
  printerName: "",
  receiptLogo: "",
  cashierName: "",
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
  spendings: { key: string; value: Spending; indexes: { byCreatedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<KingsDB>> | null = null;

export const hasIDB = () => typeof indexedDB !== "undefined";

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KingsDB>("medical-centre-pos", 7, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("dishes")) {
          const dishes = db.createObjectStore("dishes", { keyPath: "id" });
          dishes.createIndex("byCategory", "categoryId");
        }
        if (!db.objectStoreNames.contains("orders")) {
          const orders = db.createObjectStore("orders", { keyPath: "id" });
          orders.createIndex("byCreatedAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("spendings")) {
          const spendings = db.createObjectStore("spendings", { keyPath: "id" });
          spendings.createIndex("byCreatedAt", "createdAt");
        }
      },
    }).then(async (db) => {
      await seed(db);
      return db;
    });
  }
  return dbPromise;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

async function seed(db: IDBPDatabase<KingsDB>) {
  const now = Date.now();
  const cats: Category[] = [
    { id: "c-laboratory", name: "Laboratoire", createdAt: now },
    { id: "c-pharmacy", name: "Pharmacie", createdAt: now + 1 },
    { id: "c-care", name: "Soins & prélèvements", createdAt: now + 2 },
    { id: "c-consultation", name: "Consultations", createdAt: now + 3 },
  ];
  const examples: Array<Pick<Dish, "id" | "name" | "categoryId" | "price" | "description">> = [
    { id: "lab-nfs", name: "NFS", categoryId: "c-laboratory", price: 4500, description: "Acte de laboratoire — prix d’exemple" },
    { id: "lab-crp", name: "CRP", categoryId: "c-laboratory", price: 2000, description: "Acte de laboratoire — prix d’exemple" },
    { id: "lab-tdr", name: "TDR", categoryId: "c-laboratory", price: 500, description: "Test de diagnostic rapide — prix d’exemple" },
    { id: "lab-glucose", name: "Glycémie rapide (One Touch)", categoryId: "c-laboratory", price: 1000, description: "Acte de laboratoire — prix d’exemple" },
    { id: "lab-kit", name: "Kit prélèvement", categoryId: "c-laboratory", price: 500, description: "Matériel de prélèvement — prix d’exemple" },
    { id: "pharm-amoxiclav", name: "Amoxiclav SP", categoryId: "c-pharmacy", price: 3500, description: "Article de pharmacie — prix d’exemple, à valider par l’établissement" },
    { id: "pharm-betastene", name: "Betastene goutte", categoryId: "c-pharmacy", price: 4000, description: "Article de pharmacie — prix d’exemple, à valider par l’établissement" },
    { id: "care-kit", name: "Kit de soins", categoryId: "c-care", price: 500, description: "Article de soins — prix d’exemple" },
  ];
  const dishes: Dish[] = examples.map((item, index) => ({
    ...item,
    available: true,
    createdAt: now + index,
  }));
  // Add the medical starter catalogue without overwriting items or prices already configured by the centre.
  const tx = db.transaction(["categories", "dishes"], "readwrite");
  const categoryStore = tx.objectStore("categories");
  const dishStore = tx.objectStore("dishes");
  await Promise.all([
    ...cats.map(async (category) => {
      if (!(await categoryStore.get(category.id))) await categoryStore.add(category);
    }),
    ...dishes.map(async (dish) => {
      if (!(await dishStore.get(dish.id))) await dishStore.add(dish);
    }),
  ]);
  await tx.done;
}

/* categories */
export async function listCategories(): Promise<Category[]> {
  if (!hasIDB()) return [];
  const db = await getDB();
  const order = new Map(["c-plats", "c-grillades", "c-boissons", "c-cakes"].map((id, i) => [id, i]));
  return (await db.getAll("categories")).sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99) || a.createdAt - b.createdAt);
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

/* spendings */
export async function listSpendings(): Promise<Spending[]> {
  if (!hasIDB()) return [];
  const db = await getDB();
  return (await db.getAll("spendings")).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveSpending(s: Spending) {
  const db = await getDB();
  await db.put("spendings", s);
}

export async function deleteSpending(id: string) {
  const db = await getDB();
  await db.delete("spendings", id);
}
