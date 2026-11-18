import { halls } from "./data";
import { isValidDateString } from "./validation";
import type { MenuQuery } from "./types";

export type MenuLocation = Omit<MenuQuery, "dateStr"> & { dateStr?: string };

export const hallSlug = (place: string): string =>
    place === "all"
        ? "all"
        : halls.find((hall) => hall.id === place)!.name.toLowerCase();
export const menuPath = ({
    place,
    meal,
    dateStr
}: MenuLocation): `/${string}/${string}` =>
    dateStr
        ? `/${hallSlug(place)}/${meal}/${dateStr}`
        : `/${hallSlug(place)}/${meal}`;

export function selectionFromPath(pathname: string): MenuLocation | undefined {
    const parts = pathname.split("/");
    if (parts.length !== 3 && parts.length !== 4) return;
    const [, slug, meal, dateStr] = parts;
    const place =
        slug === "all"
            ? "all"
            : halls.find((hall) => hall.name.toLowerCase() === slug)?.id;
    // Unsupported hall/meal choices still have URLs, e.g. Atwater breakfast.
    if (
        !place ||
        !halls[0].options.some((option) => option.id === meal) ||
        (dateStr !== undefined && !isValidDateString(dateStr))
    )
        return;
    return dateStr === undefined ? { place, meal } : { place, meal, dateStr };
}
