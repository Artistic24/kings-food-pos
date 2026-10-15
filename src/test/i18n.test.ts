import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";

describe("offline English/French translations", () => {
  it("translates patient fields both ways", () => {
    expect(translate("Patient name", "fr")).toBe("Nom du patient");
    expect(translate("Nom du patient", "en")).toBe("Patient name");
    expect(translate("Nom complet du patient", "en")).toBe("Patient full name");
  });
  it("translates POS search text both ways", () => {
    expect(translate("Search acts, items, categories or prices", "fr")).toBe("Rechercher des actes, articles, catégories ou prix");
    expect(translate("Rechercher des actes, articles, catégories ou prix", "en")).toBe("Search acts, items, categories or prices");
  });
  it("translates dynamic receipt labels", () => {
    expect(translate("Discount (5%)", "fr")).toBe("Réduction (5%)");
    expect(translate("Réduction (5%)", "en")).toBe("Discount (5%)");
    expect(translate("N° : MC-123", "en")).toBe("No.: MC-123");
  });
});
