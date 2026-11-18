const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(dateStr: string): boolean {
    if (!DATE_PATTERN.test(dateStr)) return false;

    const date = new Date(`${dateStr}T00:00:00Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === dateStr
    );
}
