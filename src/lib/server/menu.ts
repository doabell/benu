import { noData } from "../menu/data";
import { transformItems } from "../menu/transform";
import type { ApiResponse, MenuQuery, MenuSection } from "../menu/types";

const UPSTREAM_BASE =
    "https://middlebury.api.nutrislice.com/menu/api/weeks/school";
const UPSTREAM_TIMEOUT_MS = 8_000;

export type MenuResult = "ok" | "closed" | "unavailable";

export interface MenuFetchResult {
    sections: MenuSection[];
    result: MenuResult;
}

export async function fetchExternalMenu(
    query: MenuQuery,
    fetcher: typeof fetch
): Promise<MenuFetchResult> {
    const month = query.dateStr.slice(5, 7);
    const day = query.dateStr.slice(8, 10);
    const url = `${UPSTREAM_BASE}/${encodeURIComponent(query.place)}/menu-type/${encodeURIComponent(
        query.meal
    )}/${query.dateStr.slice(0, 4)}/${month}/${day}/?format=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const response = await fetcher(url, {
            headers: { accept: "application/json" },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Nutrislice returned ${response.status}`);
        }

        const data = (await response.json()) as Partial<ApiResponse>;
        if (!Array.isArray(data.days))
            throw new Error("Nutrislice returned an invalid response");

        const dayData = data.days.find(
            (candidate) => candidate.date === query.dateStr
        );
        if (!dayData) return { sections: noData, result: "unavailable" };
        if (dayData.has_unpublished_menus)
            return { sections: noData, result: "unavailable" };

        const items = dayData.menu_items;
        if (!Array.isArray(items))
            return { sections: noData, result: "unavailable" };
        if (items.length === 0) return { sections: noData, result: "closed" };

        const sections = transformItems(items);
        return sections.length > 0
            ? { sections, result: "ok" }
            : { sections: noData, result: "unavailable" };
    } finally {
        clearTimeout(timeout);
    }
}
