import { shiftDate } from "./dates";
import type { MenuSection } from "./types";

export type FilterState = "on" | "only" | "off";
export type FilterStates = Record<string, FilterState>;
export const filterGroups = [
    {
        label: "Dietary preferences",
        filters: ["Vegan", "Vegetarian", "Halal"]
    },
    {
        label: "Sourcing",
        filters: ["Local Ingredient"]
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

export function filterSections(
    sections: MenuSection[],
    states: FilterStates
): MenuSection[] {
    const only = filterNames.filter((name) => states[name] === "only");
    const off = filterNames.filter((name) => states[name] === "off");
    return sections
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => {
                const labels = item.iconNames ?? [];
                return (
                    only.every((name) => labels.includes(name)) &&
                    off.every((name) => !labels.includes(name))
                );
            })
        }))
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
    return minutes < 1
        ? "Saved just now"
        : `Saved ${relativeFormatter.format(-Math.floor(minutes >= 60 ? minutes / 60 : minutes), minutes >= 60 ? "hour" : "minute")}`;
}
