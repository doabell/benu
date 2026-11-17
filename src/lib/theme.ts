import { readPreference, writePreference } from "./menu/client";

const key = "mode-watcher-mode";
type Theme = "light" | "dark";
const validTheme = (value: string | null): Theme | undefined =>
    value === "light" || value === "dark" ? value : undefined;

function applyTheme(value?: Theme): void {
    const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="color-scheme"]'
    );
    if (meta) meta.content = value ?? "light dark";
    const dark =
        (value ??
            (matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light")) === "dark";
    const color = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]'
    );
    if (color) color.content = dark ? "#121212" : "#ffffff";
}

export function toggleMode(): void {
    const system: Theme = matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    const rendered =
        validTheme(
            document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
                ?.content ?? null
        ) ?? system;
    const target = rendered === "dark" ? "light" : "dark";
    // Toggling back to the OS preference restores System, rather than pinning it.
    const override = target === system ? undefined : target;
    applyTheme(override);
    writePreference(key, override);
}

export function watchTheme(): () => void {
    applyTheme(validTheme(readPreference(key)));
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (): void => {
        applyTheme(
            validTheme(
                document.querySelector<HTMLMetaElement>(
                    'meta[name="color-scheme"]'
                )?.content ?? null
            )
        );
    };
    const onStorage = (event: StorageEvent): void => {
        if (event.key === key || event.key === null)
            applyTheme(validTheme(readPreference(key)));
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
        media.removeEventListener("change", onSystemChange);
        window.removeEventListener("storage", onStorage);
    };
}
