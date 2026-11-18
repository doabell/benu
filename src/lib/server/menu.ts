import { z } from "zod";
import { noData } from "../menu/data";
import { transformItems } from "../menu/transform";
import { isValidDateString } from "../menu/validation";
import { weekStart, shiftDate } from "../menu/dates";
import type { MenuQuery, MenuSection } from "../menu/types";

const UPSTREAM_BASE =
    "https://middlebury.api.nutrislice.com/menu/api/weeks/school";
const UPSTREAM_TIMEOUT_MS = 8_000;

export type MenuResult = "ok" | "closed" | "unavailable";

export interface MenuFetchResult {
    sections: MenuSection[];
    result: MenuResult;
    hasDataElsewhere?: boolean;
}

const menuUrl = (query: MenuQuery): string => {
    const month = query.dateStr.slice(5, 7);
    const day = query.dateStr.slice(8, 10);
    return `${UPSTREAM_BASE}/${encodeURIComponent(query.place)}/menu-type/${encodeURIComponent(
        query.meal
    )}/${query.dateStr.slice(0, 4)}/${month}/${day}/?format=json`;
};

// Optional dish fields can be blank or malformed even when the menu is valid.
const detailText = z.string().trim().nullish().catch(undefined);
const nutrientAmount = z.number().nonnegative().nullish().catch(undefined);

const itemSchema = z
    .object({
        id: z.number().int().nullable(),
        position: z.number(),
        is_section_title: z.boolean(),
        text: z.string(),
        menu_id: z.number().int(),
        food: z
            .object({
                id: z.number().int(),
                name: z.string(),
                subtext: z
                    .string()
                    .nullish()
                    .transform((value) => value ?? undefined),
                ingredients: detailText,
                image_url: detailText,
                image_alt_text: detailText,
                has_nutrition_info: z.boolean().optional().catch(undefined),
                serving_size_info: z
                    .object({
                        serving_size_amount: z
                            .union([z.string().trim(), z.number().positive()])
                            .nullish()
                            .catch(undefined),
                        serving_size_unit: detailText
                    })
                    .nullish()
                    .catch(undefined),
                rounded_nutrition_info: z
                    .object({
                        calories: nutrientAmount,
                        g_protein: nutrientAmount,
                        g_carbs: nutrientAmount,
                        g_fat: nutrientAmount,
                        g_fiber: nutrientAmount,
                        mg_sodium: nutrientAmount
                    })
                    .nullish()
                    .catch(undefined),
                icons: z
                    .object({
                        food_icons: z
                            .array(
                                z.object({
                                    slug: z.string(),
                                    name: z.string(),
                                    sort_order: z.number()
                                })
                            )
                            .optional()
                    })
                    .nullish()
                    .transform((value) => value ?? undefined)
            })
            .nullish()
    })
    .refine(
        (item) => item.id !== null || !item.food || item.is_section_title,
        "Food item is missing its menu ID"
    );
const weekSchema = z.object({
    last_updated: z
        .string()
        .nullish()
        .transform((value) => value ?? undefined),
    days: z
        .array(
            z.object({
                date: z.string().refine(isValidDateString),
                has_unpublished_menus: z.boolean().optional(),
                menu_items: z.array(itemSchema).optional()
            })
        )
        .max(7)
});

export interface WeekMenu {
    days: Record<string, MenuFetchResult>;
    sourceUpdatedAt?: string;
    sourceEtag?: string;
}

export const unavailableMenu = (): MenuFetchResult => ({
    sections: noData,
    result: "unavailable"
});

export const fetchWeekMenu = async (
    query: MenuQuery,
    fetcher: typeof fetch,
    previous?: WeekMenu
): Promise<WeekMenu> => {
    const headers = new Headers({ accept: "application/json" });
    if (previous?.sourceEtag) headers.set("If-None-Match", previous.sourceEtag);
    const response = await fetcher(menuUrl(query), {
        headers,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });

    const sourceEtag = response.headers.get("ETag") ?? undefined;
    if (response.status === 304 && previous?.sourceEtag) {
        return {
            days: previous.days,
            sourceUpdatedAt: previous.sourceUpdatedAt,
            sourceEtag: sourceEtag ?? previous.sourceEtag
        };
    }
    if (!response.ok) {
        throw new Error(`Nutrislice returned ${response.status}`);
    }

    const data = weekSchema.parse(await response.json());
    const start = weekStart(query.dateStr);
    const end = shiftDate(start, 7);
    const days: Record<string, MenuFetchResult> = {};
    for (const day of data.days) {
        if (
            day.date < start ||
            day.date >= end ||
            Object.hasOwn(days, day.date)
        )
            throw new Error("Nutrislice returned invalid week boundaries");
        // Closure notices such as "Thanksgiving Break" have a null ID and no
        // food. They are metadata, not malformed dishes. Header IDs are unused.
        const items = day.menu_items
            ?.filter((item) => item.id !== null || item.is_section_title)
            .map((item) => ({ ...item, id: item.id ?? 0 }));
        if (day.has_unpublished_menus || !items) {
            days[day.date] = unavailableMenu();
        } else if (!items.length) {
            days[day.date] = { sections: noData, result: "closed" };
        } else {
            const sections = transformItems(items);
            days[day.date] = sections.length
                ? { sections, result: "ok" }
                : unavailableMenu();
        }
    }
    return { days, sourceUpdatedAt: data.last_updated, sourceEtag };
};
