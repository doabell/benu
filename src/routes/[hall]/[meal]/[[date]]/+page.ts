import { error } from "@sveltejs/kit";
import { selectionFromPath } from "$lib/menu/paths";
import type { PageLoad } from "./$types";

export const prerender = false;
export const load: PageLoad = ({ url }) => {
    if (!selectionFromPath(url.pathname)) error(404, "Menu not found");
};
