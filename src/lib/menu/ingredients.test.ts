import { describe, expect, it } from "vitest";
import { parseIngredients } from "./ingredients";

describe("ingredient lists", () => {
    it("keeps components with the ingredient they describe", () => {
        expect(
            parseIngredients(
                "Button Mushroom, Lemon Juice (Lemon Juice, Sodium Benzoate, Sodium Metabisulfite, Lemon Oil), Pepper."
            )
        ).toEqual([
            { name: "Button Mushroom" },
            {
                name: "Lemon Juice",
                components:
                    "Lemon Juice, Sodium Benzoate, Sodium Metabisulfite, Lemon Oil"
            },
            { name: "Pepper" }
        ]);
    });

    it("preserves nested groups, qualifiers, and repeated ingredients", () => {
        expect(
            parseIngredients(
                "Pepper (Ground), Salt, Salt, Croutons (Bread [Wheat, Yeast], Oil (Canola, Soybean))."
            )
        ).toEqual([
            { name: "Pepper (Ground)" },
            { name: "Salt" },
            { name: "Salt" },
            {
                name: "Croutons",
                components: "Bread [Wheat, Yeast], Oil (Canola, Soybean)"
            }
        ]);
    });

    it.each(["Oil, Sauce (Salt, Garlic", "Oil, Sauce [Salt, Garlic)"])(
        "preserves the original text when groups do not match",
        (name) => expect(parseIngredients(name)).toEqual([{ name }])
    );
});
