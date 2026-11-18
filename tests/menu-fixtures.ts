import type { ApiMenuItem } from "../src/lib/menu/types";
import { shiftDate, weekStart } from "../src/lib/menu/dates";

export const items: ApiMenuItem[] = [
    { id: 1, position: 1, is_section_title: true, text: "Main", menu_id: 1 },
    {
        id: 2,
        position: 2,
        is_section_title: false,
        text: "Soup",
        menu_id: 1,
        food: {
            id: 42,
            name: "Soup",
            ingredients: "Carrots, lentils, and vegetable stock.",
            serving_size_info: {
                serving_size_amount: "1",
                serving_size_unit: "cup"
            },
            has_nutrition_info: true,
            rounded_nutrition_info: {
                calories: 140,
                g_protein: 7,
                g_carbs: 22,
                g_fat: 3,
                g_fiber: 5,
                mg_sodium: 350
            },
            icons: {
                food_icons: [{ name: "Vegan", slug: "vegan", sort_order: 1 }]
            }
        }
    }
];
export function menuWeek(dateStr = "2026-07-21", menuItems = items) {
    const start = weekStart(dateStr);
    return {
        start_date: shiftDate(start, 1),
        days: Array.from({ length: 7 }, (_, i) => ({
            date: shiftDate(start, i),
            menu_items: menuItems
        }))
    };
}
export function weekForUrl(input: RequestInfo | URL) {
    const match = new URL(String(input)).pathname.match(
        /(\d{4})\/(\d{2})\/(\d{2})\/$/
    )!;
    return menuWeek(`${match[1]}-${match[2]}-${match[3]}`);
}
