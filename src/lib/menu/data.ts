import hallsJson from "../../data/halls.json";
import iconMapJson from "../../data/iconMap.json";
import ignoredSectionsJson from "../../data/ignoredSections.json";
import noConnectionJson from "../../data/noConnection.json";
import noDataJson from "../../data/noData.json";
import type { Hall, MenuSection } from "./types";

export const halls = hallsJson as Hall[];
export const iconMap = iconMapJson as Record<string, string>;
export const ignoredSections = ignoredSectionsJson as string[];
export const noConnection = noConnectionJson as MenuSection[];
export const noData = noDataJson as MenuSection[];
