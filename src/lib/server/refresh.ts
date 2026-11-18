import { halls } from "../menu/data";
import { weekStart, shiftDate } from "../menu/dates";
import { menuPolicy } from "../menu/policy";
import { campusToday } from "../menu/schedule";
import type { MenuQuery } from "../menu/types";
import { getWeekSnapshot, type MenuStore } from "./cache";

export async function refreshMenus(
    store: MenuStore,
    now = new Date(),
    fetcher: typeof fetch = fetch,
    { retryTimeouts = false }: { retryTimeouts?: boolean } = {}
): Promise<void> {
    const first = weekStart(campusToday(now));
    const failures: Error[] = [];
    const refresh = async (query: MenuQuery): Promise<void> => {
        const result = await getWeekSnapshot(query, store, fetcher, true);
        if (result.status === "stale") {
            throw result.refreshError ?? new Error("Kept the saved menu.");
        }
    };
    // Eight hall/meal pairs across two weeks under the default policy.
    // Bounded concurrency avoids a large burst or one failed hall blocking others.
    for (let week = 0; week < menuPolicy.prefetchWeeks; week++) {
        const dateStr = shiftDate(first, week * 7);
        for (const hall of halls) {
            const results = await Promise.allSettled(
                hall.options.map((meal) => {
                    const query = { dateStr, place: hall.id, meal: meal.id };
                    return refresh(query).catch((error: unknown) => {
                        if (
                            retryTimeouts &&
                            error instanceof Error &&
                            error.name === "TimeoutError"
                        ) {
                            return refresh(query);
                        }
                        throw error;
                    });
                })
            );
            for (const [index, result] of results.entries()) {
                if (result.status !== "rejected") continue;
                const cause: unknown = result.reason;
                const detail =
                    cause instanceof Error ? cause.message : String(cause);
                failures.push(
                    new Error(
                        `Could not refresh ${hall.name} ${hall.options[index].id} for the week of ${dateStr}. ${detail}`,
                        { cause }
                    )
                );
            }
        }
    }
    if (failures.length)
        throw new AggregateError(
            failures,
            "Some weekly menus could not be refreshed"
        );
}
