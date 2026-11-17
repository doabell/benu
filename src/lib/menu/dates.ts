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
