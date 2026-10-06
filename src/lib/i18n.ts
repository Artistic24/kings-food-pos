import { useSyncExternalStore } from "react";

export type Lang = "en" | "fr";
const KEY = "kf-lang";
const listeners = new Set<() => void>();

export const getLang = (): Lang =>
  typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "fr" ? "fr" : "en";

export function setLang(lang: Lang) {
  localStorage.setItem(KEY, lang);
  listeners.forEach((l) => l());
}

export const useLang = () =>
  useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    getLang,
    () => "en" as Lang,
  );

// English source text -> French. The UI is written in English and translated on display.
export const FR: Record<string, string> = {
  POS: "Caisse", Kitchen: "Cuisine", Menu: "Menu", Sales: "Ventes", Settings: "Paramètres",
  "Install app": "Installer l'appli", Language: "Langue", English: "Anglais", French: "Français",
  "Page not found": "Page introuvable", "The page you're looking for doesn't exist.": "La page demandée n'existe pas.",
  "Back to POS": "Retour à la caisse", "This page didn't load": "Cette page ne s'est pas chargée",
  "Try again or go back home.": "Réessayez ou revenez à l'accueil.", "Try again": "Réessayer", Home: "Accueil",
  "Account / phone number": "Compte / numéro de téléphone", "Account holder name": "Nom du titulaire",
  Add: "Ajouter", All: "Tout", Available: "Disponible", "Average order": "Commande moyenne",
  "Bank card": "Carte bancaire", "Best sellers": "Meilleures ventes", Business: "Entreprise",
  "Business name": "Nom de l'entreprise", Tagline: "Slogan", Address: "Adresse", Phone: "Téléphone",
  "Receipt footer": "Pied de reçu", "Card terminal payment confirmed": "Paiement par terminal confirmé",
  Cart: "Panier", "Cart is empty. Tap a dish to add it.": "Panier vide. Touchez un plat pour l'ajouter.",
  Cash: "Espèces", "Cash payment": "Paiement en espèces", "Cash tendered (FCFA)": "Montant reçu (FCFA)",
  Category: "Catégorie", Change: "Monnaie", "Charge with your card terminal, then confirm here.": "Encaissez avec votre terminal, puis confirmez ici.",
  Clear: "Effacer", "Clear tendered amount": "Effacer le montant", "Current order": "Commande en cours",
  "Customer name": "Nom du client", "Daily report": "Rapport du jour", Decrease: "Diminuer", Delete: "Supprimer",
  "Delete last digit": "Effacer le dernier chiffre", Deliveries: "Livraisons", Delivery: "Livraison",
  "Delivery zone (Yaoundé)": "Zone de livraison (Yaoundé)", "Delivery zones (Yaoundé)": "Zones de livraison (Yaoundé)",
  Description: "Description", Discount: "Remise", Dish: "Plat", "Dish saved": "Plat enregistré", Dishes: "Plats",
  Drinks: "Boissons", Edit: "Modifier", Enabled: "Activé", Grills: "Grillades", "Main Dishes": "Plats principaux",
  History: "Historique", Increase: "Augmenter", Instructions: "Instructions", Name: "Nom",
  "Name (e.g. MTN MoMo)": "Nom (ex. MTN MoMo)", "Name and category are required": "Le nom et la catégorie sont requis",
  "Mobile money can use an official QR code or account number. Cash and bank card do not use QR codes.":
    "Le mobile money peut utiliser un QR code officiel ou un numéro. Les espèces et la carte n'utilisent pas de QR code.",
  "New category": "Nouvelle catégorie", "New dish": "Nouveau plat", "New method": "Nouveau moyen", "New zone": "Nouvelle zone",
  "No dishes here. Add some from the Menu tab.": "Aucun plat ici. Ajoutez-en depuis l'onglet Menu.",
  "No orders recorded yet.": "Aucune commande enregistrée.", "No pending orders. Enjoy the break!": "Aucune commande en attente. Bonne pause !",
  "No sales yet today.": "Aucune vente aujourd'hui.", "Nothing yet.": "Rien pour l'instant.",
  None: "Aucune", Other: "Autre", Orders: "Commandes", "Order sent to the kitchen": "Commande envoyée en cuisine",
  Paid: "Payé", "Pay at the counter.": "Payez au comptoir.", "Pay to": "Payer à", Payment: "Paiement",
  "Payment method": "Moyen de paiement", "Payment methods & QR codes": "Moyens de paiement et QR codes",
  Photo: "Photo", "Price (FCFA)": "Prix (FCFA)", Print: "Imprimer", "Print receipt": "Imprimer le reçu",
  Receipt: "Reçu", Remove: "Retirer", "Remove zone": "Retirer la zone", Revenue: "Chiffre d'affaires",
  "Revenue by payment method": "Recettes par moyen de paiement", "Save dish": "Enregistrer le plat",
  "Save settings": "Enregistrer", "Scan or dial #150# and pay to the number shown.": "Scannez ou composez #150# et payez au numéro indiqué.",
  "Scan or dial *126# and pay to the number shown.": "Scannez ou composez *126# et payez au numéro indiqué.",
  "Search dishes": "Rechercher un plat", "Select a table": "Choisir une table", "Settings saved": "Paramètres enregistrés",
  "Status updated": "Statut mis à jour", Subtotal: "Sous-total", TOTAL: "TOTAL", Total: "Total",
  "Table number": "Numéro de table", "Tax rate (%)": "Taux de taxe (%)", "Number of tables": "Nombre de tables",
  Tendered: "Reçu", "Tendered amount must cover the total.": "Le montant reçu doit couvrir le total.",
  "Dine-in": "Sur place", Exact: "Exact", "Confirm order": "Valider la commande", "Confirm paid order": "Valider la commande payée",
  Table: "Table", New: "Nouvelle", Preparing: "En préparation", Ready: "Prête", Served: "Servie",
  "Thank you, see you soon!": "Merci, à bientôt !", "City Centre": "Centre-ville",
  "New order,": "Nouvelle commande,", "served hot.": "servie bien chaude.",
  "Choose the language used across the app.": "Choisissez la langue de l'application.",
};

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Table (.+)$/, (m) => `Table ${m[1]}`],
  [/^Delivery · (.+)$/, (m) => `Livraison · ${m[1]}`],
  [/^Discount \((.+)\)$/, (m) => `Remise (${m[1]})`],
  [/^Account: (.+)$/, (m) => `Compte : ${m[1]}`],
  [/^Name: (.+)$/, (m) => `Nom : ${m[1]}`],
  [/^Amount: (.+)$/, (m) => `Montant : ${m[1]}`],
  [/^Ref: (.+)$/, (m) => `Réf : ${m[1]}`],
  [/^Mark (.+)$/, (m) => { const w = m[1] ?? ""; return `Marquer ${(FR[w.charAt(0).toUpperCase() + w.slice(1)] ?? w).toLowerCase()}`; }],
  [/^Delete (.+)\?$/, (m) => `Supprimer ${m[1]} ?`],
];

export function translate(text: string, lang: Lang): string {
  if (lang === "en") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const hit = FR[trimmed] ?? PATTERNS.reduce<string | undefined>((acc, [re, fn]) => {
    if (acc) return acc;
    const m = trimmed.match(re);
    return m ? fn(m) : undefined;
  }, undefined);
  return hit ? text.replace(trimmed, hit) : text;
}

/** Translates rendered text and common attributes in place; keeps originals so switching back works. */
export function startDomTranslation(root: HTMLElement) {
  const originals = new WeakMap<Node, string>();
  const shown = new WeakMap<Node, string>();
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];

  const doText = (n: Text) => {
    const cur = n.nodeValue ?? "";
    if (shown.get(n) !== cur) originals.set(n, cur);
    const next = translate(originals.get(n) ?? cur, getLang());
    shown.set(n, next);
    if (next !== cur) n.nodeValue = next;
  };
  const doEl = (el: Element) => {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v == null) continue;
      const key = `data-i18n-${a}`;
      if (el.getAttribute(`${key}-shown`) !== v) el.setAttribute(key, v);
      const next = translate(el.getAttribute(key) ?? v, getLang());
      el.setAttribute(`${key}-shown`, next);
      if (next !== v) el.setAttribute(a, next);
    }
  };
  const walk = (node: Node) => {
    if (node.nodeType === 3) return doText(node as Text);
    if (node.nodeType !== 1) return;
    const el = node as Element;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;
    doEl(el);
    el.childNodes.forEach(walk);
  };

  let busy = false;
  const run = (fn: () => void) => { busy = true; fn(); obs.takeRecords(); busy = false; };
  const obs = new MutationObserver((records) => {
    if (busy) return;
    run(() => records.forEach((r) => {
      if (r.type === "characterData") doText(r.target as Text);
      else if (r.type === "attributes") doEl(r.target as Element);
      else r.addedNodes.forEach(walk);
    }));
  });
  run(() => walk(root));
  obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const onLang = () => { document.documentElement.lang = getLang(); run(() => walk(root)); };
  listeners.add(onLang);
  onLang();
  return () => { obs.disconnect(); listeners.delete(onLang); };
}
