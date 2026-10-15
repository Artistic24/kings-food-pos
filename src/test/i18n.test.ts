import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n";

describe("offline English/French translations", () => {
  it("translates French-only medical-centre labels into English", () => {
    expect(translate("Code Patient", "en")).toBe("Patient code");
    expect(translate("Code Patient :", "en")).toBe("Patient code:");
    expect(translate("Traitant :", "en")).toBe("Practitioner:");
    expect(translate("Historique des reçus", "en")).toBe("Receipt history");
    expect(translate("Rechercher par patient, code patient ou reçu", "en")).toBe(
      "Search by patient, patient code or receipt",
    );
    expect(translate("Echographie", "en")).toBe("Ultrasound");
    expect(translate("Maternité", "en")).toBe("Maternity");
  });

  it("translates receipt, printer, and settings labels into French", () => {
    expect(translate("Receipt format", "fr")).toBe("Format du reçu");
    expect(translate("Android printer", "fr")).toBe("Imprimante Android");
    expect(translate("Windows default printer", "fr")).toBe("Imprimante Windows par défaut");
    expect(translate("Open Excel receipts folder", "fr")).toBe("Ouvrir le dossier des reçus Excel");
    expect(translate("Receipt printed; Excel and PDF saved.", "fr")).toBe(
      "Reçu imprimé ; fichiers Excel et PDF enregistrés.",
    );
  });

  it("keeps the pharmacy-item empty state translatable in both directions", () => {
    const english = "No items yet. Tap a laboratory act or pharmacy item to add it.";
    expect(translate(english, "fr")).toBe(
      "Aucun article pour le moment. Touchez un acte de laboratoire ou un article de pharmacie pour l'ajouter.",
    );
    expect(translate(translate(english, "fr"), "en")).toBe(english);
  });
});
