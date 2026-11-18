import hallsJson from "../../data/halls.json" with { type: "json" };
import iconMapJson from "../../data/iconMap.json" with { type: "json" };
import ignoredSectionsJson from "../../data/ignoredSections.json" with { type: "json" };
import noConnectionJson from "../../data/noConnection.json" with { type: "json" };
import noDataJson from "../../data/noData.json" with { type: "json" };
import type { Hall, MenuSection } from "./types";

export const halls = hallsJson as Hall[];
export const iconMap = iconMapJson as Record<string, string>;
export const ignoredSections = ignoredSectionsJson as string[];
export const noConnection = noConnectionJson as MenuSection[];
export const noData = noDataJson as MenuSection[];
export const dietaryDisclaimer =
    "Dietary labels come from menu data and may be incomplete. Check with Dining Services about ingredients and allergens.";
