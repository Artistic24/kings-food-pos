import type { Dish } from "./db";

// Stable IDs let existing offline installations receive the additions once.
export const ADDITIONAL_DISHES: Dish[] = [
  { id: "kf-ndole", name: "Ndolé & Plantain", categoryId: "c-plats", price: 3500, description: "Bitterleaf stew with peanuts and ripe plantains.", available: true, createdAt: 4 },
  { id: "kf-achu", name: "Achu Soup", categoryId: "c-plats", price: 4000, description: "Pounded cocoyam with yellow soup and beef.", available: true, createdAt: 5 },
  { id: "kf-okra", name: "Okra & Fufu", categoryId: "c-plats", price: 3000, description: "Fresh okra stew served with soft fufu.", available: true, createdAt: 6 },
  { id: "kf-rice", name: "Jollof Rice & Chicken", categoryId: "c-plats", price: 3500, description: "Spiced tomato rice with tender chicken.", available: true, createdAt: 7 },
  { id: "kf-beans", name: "Beans & Plantain", categoryId: "c-plats", price: 2500, description: "Slow-cooked beans with sweet fried plantains.", available: true, createdAt: 8 },
  { id: "kf-brochettes", name: "Beef Brochettes", categoryId: "c-grillades", price: 3000, description: "Chargrilled beef skewers with pepper sauce.", available: true, createdAt: 9 },
  { id: "kf-chicken-grill", name: "Grilled Chicken", categoryId: "c-grillades", price: 4000, description: "Spiced chicken, grilled and served with onions.", available: true, createdAt: 10 },
  { id: "kf-suya", name: "Suya Beef", categoryId: "c-grillades", price: 3500, description: "Smoky peppered beef with sliced vegetables.", available: true, createdAt: 11 },
  { id: "kf-shrimp", name: "Grilled Prawns", categoryId: "c-grillades", price: 5000, description: "Flame-grilled prawns with lemon and chilli.", available: true, createdAt: 12 },
  { id: "kf-wings", name: "BBQ Chicken Wings", categoryId: "c-grillades", price: 3000, description: "Glazed wings with a smoky barbecue finish.", available: true, createdAt: 13 },
  { id: "kf-ginger", name: "Ginger Juice", categoryId: "c-boissons", price: 1000, description: "Chilled house-made ginger drink.", available: true, createdAt: 14 },
  { id: "kf-bissap", name: "Bissap", categoryId: "c-boissons", price: 1000, description: "Refreshing hibiscus infusion served cold.", available: true, createdAt: 15 },
  { id: "kf-pineapple", name: "Pineapple Juice", categoryId: "c-boissons", price: 1200, description: "Freshly pressed pineapple juice.", available: true, createdAt: 16 },
  { id: "kf-water", name: "Mineral Water", categoryId: "c-boissons", price: 500, description: "Chilled bottled mineral water.", available: true, createdAt: 17 },
  { id: "kf-lemonade", name: "Homemade Lemonade", categoryId: "c-boissons", price: 1200, description: "Fresh lemon, lightly sweetened and served over ice.", available: true, createdAt: 18 },
];

// Drinks commonly consumed in Cameroon, added once to existing installs (DB v5).
const drink = (id: string, name: string, price: number, description: string, n: number): Dish => ({
  id: `cm-${id}`, name, categoryId: "c-boissons", price, description, available: true, createdAt: 100 + n,
});
export const CAMEROON_DRINKS: Dish[] = [
  drink("power-malt", "Power Malt", 700, "Non-alcoholic malt drink, served chilled.", 1),
  drink("malta-guinness", "Malta Guinness", 700, "Rich non-alcoholic malt.", 2),
  drink("top-grenadine", "Top Grenadine", 600, "Sweet grenadine soda.", 3),
  drink("top-ananas", "Top Ananas", 600, "Pineapple-flavoured soda.", 4),
  drink("top-pamplemousse", "Top Pamplemousse", 600, "Grapefruit-flavoured soda.", 5),
  drink("djino", "Djino Cocktail", 600, "Fruit cocktail soda.", 6),
  drink("vimto", "Vimto", 600, "Fruity soft drink.", 7),
  drink("castel", "Castel Beer", 1000, "Classic Cameroonian lager, 65cl.", 8),
  drink("33-export", "33 Export", 1000, "Popular Cameroonian lager, 65cl.", 9),
  drink("mutzig", "Mützig", 1000, "Strong lager, 65cl.", 10),
  drink("beaufort", "Beaufort Lager", 1000, "Light Cameroonian lager.", 11),
  drink("guinness", "Guinness", 1200, "Foreign Extra Stout.", 12),
  drink("isenbeck", "Isenbeck", 1000, "Premium lager.", 13),
  drink("supermont", "Supermont Water 1.5L", 600, "Cameroonian mineral water.", 14),
  drink("tangui", "Tangui Water 1.5L", 700, "Cameroonian mineral water.", 15),
  drink("folere", "Foléré Juice", 800, "Chilled hibiscus juice, Cameroonian style.", 16),
  drink("palm-wine", "Matango (Palm Wine)", 1000, "Fresh palm wine.", 17),
];