import { describe, expect, it } from "vitest";
import { transformItems } from "./transform";

describe("transformItems", () => {
    it("groups, sorts, and filters menu items", () => {
        const result = transformItems([
            {
                id: 10,
                position: 1,
                is_section_title: true,
                text: "Main",
                menu_id: 1
            },
            {
                id: 12,
                position: 2,
                is_section_title: false,
                text: "Second",
                menu_id: 1
            },
            {
                id: 11,
                position: 1,
                is_section_title: false,
                text: "First",
                menu_id: 1,
                food: {
                    id: 11,
                    name: "First",
                    icons: {
                        food_icons: [
                            {
                                slug: "local",
                                name: "Local Ingredient",
                                sort_order: 1
                            }
                        ]
                    }
                }
            },
            {
                id: 20,
                position: 3,
                is_section_title: true,
                text: "Alternatives",
                menu_id: 1
            },
            {
                id: 21,
                position: 1,
                is_section_title: false,
                text: "Filtered item",
                menu_id: 1
            }
        ]);

        expect(result).toEqual([
            {
                title: "Main",
                items: [
                    {
                        id: 11,
                        position: 1,
                        name: "First",
                        iconNames: ["Local Ingredient"]
                    },
                    {
                        id: 12,
                        position: 2,
                        name: "Second"
                    }
                ]
            }
        ]);
    });
});
