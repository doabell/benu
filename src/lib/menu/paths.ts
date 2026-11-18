import { halls } from "./data";
import { isValidDateString } from "./validation";
import type { MenuQuery } from "./types";

export const hallSlug = (place: string): string =>
    place === "all"
        ? "all"
        : halls.find((hall) => hall.id === place)!.name.toLowerCase();
export const menuPath = ({
    place,
    meal,
    dateStr
}: MenuQuery): `/${string}/${string}/${string}` =>
    `/${hallSlug(place)}/${meal}/${dateStr}`;

export function selectionFromPath(pathname: string): MenuQuery | undefined {
    const parts = pathname.split("/");
    if (parts.length !== 4) return;
    const [, slug, meal, dateStr] = parts;
    const place =
        slug === "all"
            ? "all"
            : halls.find((hall) => hall.name.toLowerCase() === slug)?.id;
    // Unsupported hall/meal choices still have URLs, e.g. Atwater breakfast.
    if (
        !place ||
        !halls[0].options.some((option) => option.id === meal) ||
        !isValidDateString(dateStr)
    )
        return;
    return { place, meal, dateStr };
}
