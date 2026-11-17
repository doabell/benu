import { halls } from "../menu/data";
import { weekStart, shiftDate } from "../menu/dates";
import { menuPolicy } from "../menu/policy";
import { campusToday } from "../menu/schedule";
import { getWeekSnapshot, type MenuStore } from "./cache";

export async function refreshMenus(
    store: MenuStore,
    now = new Date(),
    fetcher: typeof fetch = fetch
): Promise<void> {
    const first = weekStart(campusToday(now));
    const failures: unknown[] = [];
    // Eight hall/meal pairs, two weeks: sixteen upstream requests per run.
    // Bounded concurrency avoids a large burst or one failed hall blocking others.
    for (let week = 0; week < menuPolicy.prefetchWeeks; week++) {
        for (const hall of halls) {
            const results = await Promise.allSettled(
                hall.options.map((meal) =>
                    getWeekSnapshot(
                        {
                            dateStr: shiftDate(first, week * 7),
                            place: hall.id,
                            meal: meal.id
                        },
                        store,
                        fetcher,
                        true
                    )
                )
            );
            for (const result of results) {
                if (result.status === "rejected") failures.push(result.reason);
                else if (result.value.status === "stale")
                    failures.push(new Error(`Refresh failed for ${hall.id}`));
            }
        }
    }
    if (failures.length)
        throw new AggregateError(
            failures,
            "Some weekly menus could not be refreshed"
        );
}
