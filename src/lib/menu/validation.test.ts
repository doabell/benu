import { describe, expect, it } from "vitest";
import { isValidDateString } from "./validation";

describe("menu date validation", () => {
    it("rejects impossible dates without timezone conversion", () => {
        expect(isValidDateString("2026-02-30")).toBe(false);
        expect(isValidDateString("2026-07-21")).toBe(true);
        expect(isValidDateString("2026-2-3")).toBe(false);
    });
});
