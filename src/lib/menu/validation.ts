import { halls } from "./data";
import type { MenuQuery } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(dateStr: string): boolean {
    if (!DATE_PATTERN.test(dateStr)) return false;

    const date = new Date(`${dateStr}T00:00:00Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === dateStr
    );
}

export function parseMenuQuery(
    searchParams: URLSearchParams
): { query: MenuQuery } | { error: string } {
    const dateStr = searchParams.get("dateStr");
    const place = searchParams.get("place");
    const meal = searchParams.get("meal");

    if (!dateStr || !place || !meal) {
        return { error: "dateStr, place, and meal are required" };
    }

    if (!isValidDateString(dateStr)) {
        return { error: "dateStr must be a valid YYYY-MM-DD date" };
    }

    const hall = halls.find((candidate) => candidate.id === place);
    if (!hall) return { error: "Unknown dining hall" };

    if (!hall.options.some((option) => option.id === meal)) {
        return { error: "Unknown meal" };
    }

    return { query: { dateStr, place, meal } };
}
