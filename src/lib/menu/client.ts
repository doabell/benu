export function readPreference(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
export function writePreference(key: string, value?: string): void {
    try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
    } catch {
        /* Preferences are optional in private or restricted browsing. */
    }
}
