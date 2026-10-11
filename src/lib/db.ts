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
    { id: "c-echography", name: "Echographie", createdAt: now + 4 },
    { id: "c-radiology", name: "Radiologie", createdAt: now + 5 },
    { id: "c-maternity", name: "Maternité", createdAt: now + 6 },
    { id: "c-theater", name: "Théâtre", createdAt: now + 7 },
  ];
  const examples: Array<Pick<Dish, "id" | "name" | "categoryId" | "price" | "description">> = [
    { id: "lab-tdr", name: "TDR", categoryId: "c-laboratory", price: 500, description: "Test de diagnostic rapide — prix d’exemple" },
    { id: "lab-glucose", name: "Glycémie rapide (One Touch)", categoryId: "c-laboratory", price: 1000, description: "Acte de laboratoire — prix d’exemple" },
    { id: "lab-kit", name: "Kit prélèvement", categoryId: "c-laboratory", price: 500, description: "Matériel de prélèvement — prix d’exemple" },
    { id: "pharm-betastene", name: "Betastene goutte", categoryId: "c-pharmacy", price: 4000, description: "Article de pharmacie — prix d’exemple, à valider par l’établissement" },
    { id: "care-kit", name: "Kit de soins", categoryId: "c-care", price: 500, description: "Article de soins — prix d’exemple" },
    { id: "pharm-paracetamol-infu", name: "Paracetamol infu", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-artemether-inj", name: "Artemether 60 mg inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ceftriaxone", name: "Ceftriaxone 1g inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-gentamicin", name: "Gentamicine 80mg", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-diclofenac-inj", name: "Diclofenac 75mg inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-saline", name: "Normal sale 0,9% 500 cc", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-catheter", name: "Catheter", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-tetanus", name: "Tetanus Antitoxin", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-vitdenk", name: "Vitamine Denk", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-calcium-tab", name: "Calcium Tablet", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-omeprazole", name: "Omeprazol Capsul", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-salbutamol", name: "Salbutamol", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-calcium-d3", name: "Calcium D3", categoryId: "c-pharmacy", price: 3000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-dexacure", name: "Dexacure Tablet", categoryId: "c-pharmacy", price: 100, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-fleming", name: "Fleming Tablet", categoryId: "c-pharmacy", price: 5500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cartef", name: "Cartef 80/480 Tablet", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-metronidazole", name: "Metronidazol 500mg tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ciproflox", name: "Ciprofloxacille 500mg tablet", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-amoxicillin", name: "Amoxicilline tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-azithro", name: "Azithromicine 500mg tablet", categoryId: "c-pharmacy", price: 3000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-dexamet", name: "Dexametazol tablet", categoryId: "c-pharmacy", price: 100, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ibumol", name: "Ibumol tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-doliprane", name: "Doliprane 1000mg", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-mixagripe", name: "Mixagripe tablet", categoryId: "c-pharmacy", price: 250, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cloxacillin", name: "Cloxacilline capsul", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-malaria-strip", name: "Malaria strip test", categoryId: "c-laboratory", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-tramadol", name: "Tramadol", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-calcimax", name: "Calcimax tablet", categoryId: "c-pharmacy", price: 3000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-vitamin-b", name: "Vitamine B complex tablet", categoryId: "c-pharmacy", price: 3000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-amoxiclav", name: "Amoxicilline capsule", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-calcium-inj", name: "Calcium inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-vitc-inj", name: "Vitamine C inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-diclofenac-pommade", name: "Diclofenac Pommade", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-flagyl", name: "Flagyle", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-artesunate", name: "Artesunat 60mg inj", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ofloxacine", name: "Ofloxacile 200mg tablet", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-penicillin-v", name: "Penicilline V", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-albendazole", name: "Albendazol 40mg tablet", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-carboxysteine", name: "Carboxysteine 2%", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-quinine", name: "Quinine inj 600mg", categoryId: "c-pharmacy", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-analgin", name: "Analgin inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ampicilline", name: "Ampicilline inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-buscopan", name: "Buscopan inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cefixime", name: "Cefixime 500mg tablet", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-nystatin", name: "Nystatine tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cimetidine", name: "Cimetidine tablet", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-piroxicam", name: "Piroxicam inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-multivit", name: "Multivit tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-diazepam", name: "Diazepam 10mg tablet", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-loperamide", name: "Loperamide", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-tetracycline", name: "Tetracycline 500g tablet", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-neoskin", name: "Neoskin pommade", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cipro-drops", name: "Ciprofloxacine drops", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ringer", name: "Ringer Lactat", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-furosemide", name: "Furosemide inj", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-hemfer", name: "Hemafer inj", categoryId: "c-pharmacy", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-glucose", name: "Glucose 5%", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-benzatine", name: "Benzatine inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ats", name: "ATS", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-vitk3", name: "Vitamine K3", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-bandage", name: "Bandage", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-glucophage", name: "Glucophage tablet", categoryId: "c-pharmacy", price: 3500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cefixime200", name: "Cefixime 200mg tablet", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-metanize", name: "Metanize", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-bronco", name: "Broncocal SP", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-potassium", name: "Potassium inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-coatem", name: "Coatem tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-tothenat", name: "Tothenat", categoryId: "c-pharmacy", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-diprostone", name: "Diprostome inj", categoryId: "c-pharmacy", price: 7000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-glucart", name: "Glucart", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-potassium-tab", name: "Potasium inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cotrim", name: "Cotrim tablet", categoryId: "c-pharmacy", price: 300, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-metronidazole-inj", name: "Metronidazol 250mg tablet", categoryId: "c-pharmacy", price: 300, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-vitc-tab", name: "Vitamine C tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-viseralgin", name: "Viseralgin Pommade", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-fleming-inj", name: "Fleming inj", categoryId: "c-pharmacy", price: 3000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-levoflox", name: "Levoflox tablet", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-penicillin-g", name: "Penicillin G", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-omeprazole-inj", name: "Omepraxol inj", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-captopril", name: "Captopril", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-artesunate-inj", name: "Artesunate inj", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-amlodipine", name: "Amlodipine", categoryId: "c-pharmacy", price: 3500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-smecta", name: "Smecta", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-nifedipine", name: "Nifedipine", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-cardioaspirin", name: "Cardio aspirin", categoryId: "c-pharmacy", price: 3500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-gaviscon", name: "Gaviscon", categoryId: "c-pharmacy", price: 250, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-benzatine-inj", name: "Benzatine inj", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-omeprazol", name: "Omeprazol inj", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ampiclox", name: "Ampicloxacilline tablet", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-sachet", name: "Sachet eye drop", categoryId: "c-pharmacy", price: 4500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-ascabiol", name: "Ascabiol", categoryId: "c-pharmacy", price: 3500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-meconazol", name: "Meconazol pommade", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-fluconazole", name: "Fluconazol tablet", categoryId: "c-pharmacy", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-spasfon", name: "Spasfon table", categoryId: "c-pharmacy", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-biamalari", name: "Biamalari", categoryId: "c-pharmacy", price: 3500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-metoclopramide", name: "Metoclopramine inj", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-dynamogene", name: "Dynamogene", categoryId: "c-pharmacy", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-neoskin2", name: "Neoskin", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-griseofulvin", name: "Griseofulvin Cream", categoryId: "c-pharmacy", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-clarithromycin", name: "Clarithromycin", categoryId: "c-pharmacy", price: 4500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-antagax", name: "Antagex", categoryId: "c-pharmacy", price: 4500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-erythromicine", name: "Erythromicine cp", categoryId: "c-pharmacy", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-bande-verpo", name: "Bande verpo", categoryId: "c-pharmacy", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "pharm-denobacter", name: "Denobacter", categoryId: "c-pharmacy", price: 4500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-consultation", name: "Consultation", categoryId: "c-consultation", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-consumables", name: "Consommables", categoryId: "c-care", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-thorax", name: "RX Thorax", categoryId: "c-radiology", price: 7500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-tdm", name: "TDM Cerebral Sans Injection (Scanner)", categoryId: "c-radiology", price: 90000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-medical-book", name: "Medical Book", categoryId: "c-care", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-hospital-private", name: "Hospitalisation (Private Ward)", categoryId: "c-care", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-hospital-general", name: "Hospitalisation (General Ward)", categoryId: "c-care", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-physio", name: "Physiotherapy Séance", categoryId: "c-care", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-orthopedic-surgery", name: "Orthopedic surgery", categoryId: "c-theater", price: 1500000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-general-anesthesia", name: "General anesthesia", categoryId: "c-theater", price: 100000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-orthopedic-plate", name: "Orthopedic plate", categoryId: "c-theater", price: 100000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-tibial-nail", name: "Tibial intramedullary Nail", categoryId: "c-theater", price: 50000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-interlocking-screw", name: "Interlocking Screw", categoryId: "c-theater", price: 50000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-stockinette", name: "Stockinette", categoryId: "c-theater", price: 10000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-padding", name: "Padding Undercast", categoryId: "c-theater", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-pop10", name: "Plaster of Paris (POP) 10cm", categoryId: "c-theater", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-pop15", name: "Plaster of Paris (POP) 15cm", categoryId: "c-theater", price: 3500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-nursing", name: "Nersing Care", categoryId: "c-maternity", price: 1000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-dressing", name: "Dressing", categoryId: "c-care", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-amputation", name: "Amputation", categoryId: "c-theater", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-stitches", name: "Stitches", categoryId: "c-theater", price: 1500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-local-anesthesia", name: "Local Anestesia", categoryId: "c-theater", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-cannula", name: "Cannula", categoryId: "c-care", price: 500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-echo-abdominal", name: "Echographie abdominal", categoryId: "c-echography", price: 9000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-certificate", name: "Medical Certificate", categoryId: "c-consultation", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-ankle-xray", name: "Ankle X-Ray", categoryId: "c-radiology", price: 12000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-ultrasound", name: "Ultra-soum", categoryId: "c-echography", price: 8000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-shoulder-xray", name: "Shoulder-X-Ray", categoryId: "c-radiology", price: 18000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-lumbar-xray", name: "Lumbar spine-X-Ray", categoryId: "c-radiology", price: 18000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-ketamine", name: "Ketamine", categoryId: "c-theater", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-atropine", name: "Atropine", categoryId: "c-theater", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-ephedrine", name: "Ephedrine", categoryId: "c-theater", price: 5000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-valium", name: "Valuem", categoryId: "c-theater", price: 2500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-procedure-anesthesia", name: "Procedure anesthesie", categoryId: "c-theater", price: 50000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "svc-surgical-procedure", name: "Surgical Procedure", categoryId: "c-theater", price: 800000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-crp", name: "CRP", categoryId: "c-laboratory", price: 2000, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-widal", name: "WIDAL/FELIX", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-aslo", name: "ASLO", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-ca2", name: "Ca2+", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-rbs", name: "RBS", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-hpylori", name: "H-PYLORI", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-sniff", name: "SNIFF TEST", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-lave", name: "LAVE", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-stool", name: "STOOL", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-fr", name: "FR", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-bt", name: "BT", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-ct", name: "CT", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-blood-group", name: "Blood Group & Rhesus", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-transfusion", name: "Blood Transfusion", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-potassium", name: "Potassium test", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-esr", name: "ESR", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-magnesium", name: "Magnesium Test", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-fbs", name: "FBS", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-hemogram", name: "Hemogram Complete", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-nfs", name: "NFS", categoryId: "c-laboratory", price: 4500, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-tpha", name: "TPHA", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-chlamydia", name: "Chlamydia", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-hbv", name: "HBV", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-hcv", name: "HCV", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-vs", name: "VS", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-lipid", name: "Profil lipidique", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-uree", name: "UREE", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
    { id: "lab-creatinine", name: "Creatinine", categoryId: "c-laboratory", price: 0, description: "Importé du catalogue St Josephs — vérifier le tarif", },
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
