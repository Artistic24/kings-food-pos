import { describe, expect, it } from "vitest";
import { ADDITIONAL_DISHES } from "@/lib/menu-seeds";

describe("additional menu dishes", () => {
  it.each(["c-plats", "c-grillades", "c-boissons"])("adds five dishes to %s", (categoryId) => {
    expect(ADDITIONAL_DISHES.filter((dish) => dish.categoryId === categoryId)).toHaveLength(5);
  });
});
import { CAMEROON_DRINKS } from "@/lib/menu-seeds";
import { translate } from "@/lib/i18n";
describe("cameroon drinks and language", () => {
  it("adds Power Malt to drinks", () => {
    expect(CAMEROON_DRINKS.find((d) => d.name === "Power Malt")?.categoryId).toBe("c-boissons");
  });
  it("translates to French and leaves English unchanged", () => {
    expect(translate("Kitchen", "fr")).toBe("Cuisine");
    expect(translate("Kitchen", "en")).toBe("Kitchen");
  });
});
