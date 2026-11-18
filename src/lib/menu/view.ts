import { shiftDate } from "./dates";
import type { MenuItem, MenuSection } from "./types";

export type FilterState = "on" | "only" | "off";
export type FilterStates = Record<string, FilterState>;
export interface CustomFilter {
    term: string;
    state: FilterState;
}
export const nextFilterState: Record<FilterState, FilterState> = {
    on: "only",
    only: "off",
    off: "on"
};
export const isFilterState = (value: unknown): value is FilterState =>
    value === "on" || value === "only" || value === "off";
export const filterGroups = [
    {
        label: "Dietary preferences",
        filters: ["Vegan", "Vegetarian", "Halal"]
    },
    {
        label: "Sourcing",
        filters: ["Local Ingredient", "Recipe From Home"]
    },
    {
        label: "Meat & seafood",
        filters: ["Beef", "Pork", "Fish", "Shellfish"]
    },
    {
        label: "Dairy & alcohol",
        filters: ["Dairy", "Milk", "Alcohol"]
    },
    {
        label: "Other allergens",
        filters: ["Wheat", "Soy", "Egg", "Sesame"]
    },
    {
        label: "Nuts",
        filters: ["Peanuts", "Tree Nuts"]
    }
];
export const filterNames = filterGroups.flatMap((group) => group.filters);

export const normalizeMenuText = (text: string): string =>
    text
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();

export function parseCustomFilters(value: string | null): CustomFilter[] {
    try {
        const saved: unknown = JSON.parse(value ?? "[]");
        if (!Array.isArray(saved)) return [];
        const filters: CustomFilter[] = [];
        const seen = new Set<string>();
        for (const entry of saved) {
            if (typeof entry?.term !== "string" || !isFilterState(entry.state))
                continue;
            const term = entry.term.trim();
            const key = normalizeMenuText(term);
            if (key && !seen.has(key)) {
                seen.add(key);
                filters.push({ term, state: entry.state });
            }
        }
        return filters;
    } catch {
        return [];
    }
}

export interface HallMenuState {
    sections: MenuSection[];
    status:
        | "idle"
        | "loading"
        | "ready"
        | "closed"
        | "unavailable"
        | "unsupported"
        | "error";
    loading: boolean;
    hasDataElsewhere: boolean;
    errorMessage: string;
}

export const emptyMenu = (): HallMenuState => ({
    sections: [],
    status: "idle",
    loading: false,
    hasDataElsewhere: false,
    errorMessage: ""
});

function dishText(item: MenuItem): string[] {
    return [
        item.name,
        item.subtext,
        item.details?.ingredients,
        item.details?.servingSize,
        ...(item.iconNames ?? [])
    ].flatMap((field) => (field ? [normalizeMenuText(field)] : []));
}

export function filterSections(
    sections: MenuSection[],
    states: FilterStates,
    {
        query = "",
        customFilters = []
    }: { query?: string; customFilters?: readonly CustomFilter[] } = {}
): MenuSection[] {
    const only = filterNames.filter((name) => states[name] === "only");
    const off = filterNames.filter((name) => states[name] === "off");
    const words = normalizeMenuText(query).split(" ").filter(Boolean);
    const required = customFilters
        .filter((filter) => filter.state === "only")
        .map((filter) => normalizeMenuText(filter.term))
        .filter(Boolean);
    const excluded = customFilters
        .filter((filter) => filter.state === "off")
        .map((filter) => normalizeMenuText(filter.term))
        .filter(Boolean);
    const matchText = words.length || required.length || excluded.length;
    return sections
        .map((section) => {
            const sectionText = words.length
                ? normalizeMenuText(section.title)
                : "";
            return {
                ...section,
                items: section.items.filter((item) => {
                    const labels = item.iconNames ?? [];
                    if (
                        !only.every((name) => labels.includes(name)) ||
                        off.some((name) => labels.includes(name))
                    )
                        return false;
                    if (!matchText) return true;

                    const fields = dishText(item);
                    const contains = (term: string) =>
                        fields.some((field) => field.includes(term));
                    return (
                        words.every(
                            (word) =>
                                sectionText.includes(word) || contains(word)
                        ) &&
                        required.every(contains) &&
                        !excluded.some(contains)
                    );
                })
            };
        })
        .filter((section) => section.items.length > 0);
}

export const countItems = (sections: MenuSection[]): number =>
    sections.reduce((count, section) => count + section.items.length, 0);

const dayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
});
const yearFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
});
const relativeFormatter = new Intl.RelativeTimeFormat("en", {
    numeric: "always"
});

export function formatMenuDate(date: string, today: string): string {
    const relative =
        date === today
            ? "Today"
            : date === shiftDate(today, 1)
              ? "Tomorrow"
              : date === shiftDate(today, -1)
                ? "Yesterday"
                : "";
    const formatter =
        date.slice(0, 4) === today.slice(0, 4) ? dayFormatter : yearFormatter;
    const formatted = formatter.format(new Date(`${date}T12:00:00Z`));
    return relative ? `${relative} · ${formatted}` : formatted;
}

export function savedMenuAge(fetchedAt: number, now: number): string {
    const minutes = Math.max(0, Math.floor((now - fetchedAt) / 60_000));
    if (minutes < 1) return "Saved just now";
    const hours = Math.floor(minutes / 60);
    if (hours >= 24)
        return `Saved ${relativeFormatter.format(-Math.floor(hours / 24), "day")}`;
    if (hours) return `Saved ${relativeFormatter.format(-hours, "hour")}`;
    return `Saved ${relativeFormatter.format(-minutes, "minute")}`;
}
