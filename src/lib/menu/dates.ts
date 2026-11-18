export const CAMPUS_TIME_ZONE = "America/New_York";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: CAMPUS_TIME_ZONE
});

export const campusToday = (date = new Date()): string => {
    const parts = dateFormatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
};

export function shiftDate(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

// Verified against days[] in Nutrislice responses. Its start_date field is
// Monday, even though the returned dates begin on Sunday.
export function weekStart(dateStr: string): string {
    return shiftDate(dateStr, -new Date(`${dateStr}T00:00:00Z`).getUTCDay());
}
