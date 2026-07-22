import { describe, expect, it } from "vitest";
import { createMenuCacheKey, getCachedMenu } from "./cache";

describe("warm-instance menu cache", () => {
    it("deduplicates concurrent misses", async () => {
        let calls = 0;
        const loader = async () => {
            calls += 1;
            await Promise.resolve();
            return {
                sections: [{ title: "Main", items: [] }],
                result: "ok" as const
            };
        };
        const key = `dedupe-${Date.now()}`;

        const [first, second] = await Promise.all([
            getCachedMenu(key, loader),
            getCachedMenu(key, loader)
        ]);

        expect(calls).toBe(1);
        expect(first.status).toBe("miss");
        expect(second.status).toBe("miss");
    });

    it("keeps menu entries separate for different venues", async () => {
        const dateStr = "2026-07-21";
        const proctorKey = createMenuCacheKey({
            dateStr,
            place: "proctor-dining-hall",
            meal: "lunch"
        });
        const rossKey = createMenuCacheKey({
            dateStr,
            place: "ross-dining-hall",
            meal: "lunch"
        });

        expect(proctorKey).not.toBe(rossKey);

        const [proctor, ross] = await Promise.all([
            getCachedMenu(proctorKey, async () => ({
                sections: [{ title: "Proctor", items: [] }],
                result: "ok"
            })),
            getCachedMenu(rossKey, async () => ({
                sections: [{ title: "Ross", items: [] }],
                result: "ok"
            }))
        ]);

        expect(proctor.value.sections[0].title).toBe("Proctor");
        expect(ross.value.sections[0].title).toBe("Ross");
    });
});
