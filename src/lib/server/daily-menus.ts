import {
    emptyMenus,
    menuSlots,
    menuSlotKey,
    type DailyMenus
} from "../menu/daily-menus";
import { getWeekSnapshot, type MenuStore } from "./cache";
import { unavailableMenu } from "./menu";

export async function getCachedMenus(
    dateStr: string,
    store: MenuStore,
    fetcher: typeof fetch
): Promise<DailyMenus> {
    const day = emptyMenus(dateStr);
    const timestamps = await Promise.all(
        menuSlots.map(async (slot) => {
            try {
                const { snapshot, status } = await getWeekSnapshot(
                    { ...slot, dateStr },
                    store,
                    fetcher
                );
                const menu = snapshot.days[dateStr] ?? unavailableMenu();
                day.menus[menuSlotKey(slot.place, slot.meal)] = {
                    ...menu,
                    hasDataElsewhere: false
                };
                if (status === "stale") day.fallback = true;
                return snapshot.fetchedAt;
            } catch {
                return;
            }
        })
    );
    const saved = timestamps.filter(
        (time): time is number => time !== undefined
    );
    // One conservative age for the entire day, based on its oldest source snapshot.
    day.fetchedAt = saved.length ? Math.min(...saved) : 0;
    for (const slot of menuSlots) {
        day.menus[menuSlotKey(slot.place, slot.meal)].hasDataElsewhere =
            menuSlots.some(
                (other) =>
                    other.place !== slot.place &&
                    other.meal === slot.meal &&
                    day.menus[menuSlotKey(other.place, other.meal)].result ===
                        "ok"
            );
    }
    return day;
}
