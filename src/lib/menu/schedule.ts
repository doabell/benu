export const DINING_HOURS_URL =
    "https://www.middlebury.edu/dining-services/general-information";

export const CAMPUS_TIME_ZONE = "America/New_York";

interface MealWindow {
    meal: string;
    label: string;
    start: number;
    end: number;
}

interface HallSchedule {
    weekday: MealWindow[];
    weekend: MealWindow[];
}

export interface MealStatus {
    state: "open" | "closed";
    label: string;
    detail: string;
    currentMeal?: string;
}

const window = (
    meal: string,
    label: string,
    start: number,
    end: number
): MealWindow => ({ meal, label, start, end });

// Published normal dining-hall hours. Special events and summer schedules can
// differ, so the UI links to Dining Services for the authoritative calendar.
const schedules: Record<string, HallSchedule> = {
    "proctor-dining-hall": {
        weekday: [
            window("breakfast", "Breakfast", 7 * 60, 9 * 60 + 30),
            window("lunch", "Lunch", 11 * 60, 14 * 60),
            window("dinner", "Dinner", 16 * 60 + 30, 20 * 60)
        ],
        weekend: [
            window("breakfast", "Breakfast", 7 * 60, 11 * 60),
            window("lunch", "Brunch", 11 * 60, 14 * 60),
            window("dinner", "Dinner", 16 * 60 + 30, 20 * 60)
        ]
    },
    "ross-dining-hall": {
        weekday: [
            window("breakfast", "Breakfast", 7 * 60, 9 * 60 + 30),
            window("lunch", "Lunch", 11 * 60, 14 * 60),
            window("dinner", "Dinner", 17 * 60 + 30, 20 * 60 + 30)
        ],
        weekend: [
            window("breakfast", "Breakfast", 8 * 60, 11 * 60),
            window("lunch", "Brunch", 11 * 60, 14 * 60),
            window("dinner", "Dinner", 17 * 60 + 30, 20 * 60 + 30)
        ]
    },
    "atwater-dining-hall": {
        weekday: [
            window("lunch", "Lunch", 11 * 60, 14 * 60),
            window("dinner", "Dinner", 17 * 60, 20 * 60 + 30)
        ],
        weekend: []
    }
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CAMPUS_TIME_ZONE
});
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: CAMPUS_TIME_ZONE
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: CAMPUS_TIME_ZONE
});

const getTimeParts = (date: Date): { hour: number; minute: number } => {
    const parts = timeFormatter.formatToParts(date);
    const hourPart = Number(parts.find((part) => part.type === "hour")?.value);
    const minutePart = Number(
        parts.find((part) => part.type === "minute")?.value
    );

    return { hour: hourPart === 24 ? 0 : hourPart, minute: minutePart };
};

const getWeekday = (date: Date): number => {
    const weekday = weekdayFormatter.format(date);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
};

const clocks = new Map<
    string,
    { full: Intl.DateTimeFormat; hour: Intl.DateTimeFormat; hour12: boolean }
>();
export function formatCampusTime(minutes: number, locale?: string): string {
    const key = locale ?? "browser";
    let clock = clocks.get(key);
    if (!clock) {
        const full = new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "UTC"
        });
        clock = {
            full,
            hour: new Intl.DateTimeFormat(locale, {
                hour: "numeric",
                timeZone: "UTC"
            }),
            hour12: !!full.resolvedOptions().hour12
        };
        clocks.set(key, clock);
    }
    // These integers already represent campus wall time. UTC is only a neutral
    // carrier for locale formatting; never convert them into the viewer's zone.
    const time = new Date(
        Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)
    );
    return (clock.hour12 && minutes % 60 === 0 ? clock.hour : clock.full)
        .format(time)
        .replace(/[\u00a0\u202f]/g, " ");
}
const formatTime = formatCampusTime;
const zoneFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    timeZoneName: "short"
});
export function campusZoneLabel(dateStr: string): string {
    return (
        zoneFormatter
            .formatToParts(new Date(`${dateStr}T12:00:00Z`))
            .find((part) => part.type === "timeZoneName")?.value ?? "ET"
    );
}

const getWindows = (schedule: HallSchedule, weekday: number): MealWindow[] =>
    weekday === 0 || weekday === 6 ? schedule.weekend : schedule.weekday;

export function getRegularMealHours(
    place: string,
    meal: string,
    dateStr: string,
    locale?: string
): { label: string; hours: string } | undefined {
    const schedule = schedules[place];
    if (!schedule) return;
    // A menu date is a calendar day, independent of the viewer's time zone.
    const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
    const mealWindow = getWindows(schedule, weekday).find(
        (window) => window.meal === meal
    );
    if (!mealWindow) return;
    return {
        label: mealWindow.label,
        hours: `${formatTime(mealWindow.start, locale)}–${formatTime(mealWindow.end, locale)}`
    };
}

export function getWeeklyMealHours(
    place: string,
    locale?: string
): { label: string; weekday: string; weekend: string }[] {
    const schedule = schedules[place];
    if (!schedule) return [];
    const hours = (window: MealWindow | undefined): string =>
        window
            ? `${formatTime(window.start, locale)}–${formatTime(window.end, locale)}`
            : "Not served";
    const rows = ["breakfast", "lunch", "dinner"].map((meal) => ({
        label:
            meal === "lunch" &&
            schedule.weekend.some((window) => window.meal === "lunch")
                ? "Lunch / brunch"
                : meal.charAt(0).toUpperCase() + meal.slice(1),
        weekday: hours(schedule.weekday.find((window) => window.meal === meal)),
        weekend: hours(schedule.weekend.find((window) => window.meal === meal))
    }));
    if (place === "proctor-dining-hall" || place === "ross-dining-hall")
        rows.splice(1, 0, {
            label: "Continental",
            weekday: `${formatTime(9 * 60 + 30, locale)}–${formatTime(11 * 60, locale)}`,
            weekend: "—"
        });
    return rows;
}

export function getDiningHoursNotes(place: string): string[] {
    return place === "ross-dining-hall"
        ? [
              `Lunch has limited options until ${formatTime(14 * 60 + 30)} on weekdays.`
          ]
        : [];
}

const nextOpening = (
    schedule: HallSchedule,
    weekday: number,
    currentMinutes: number
): { mealWindow: MealWindow; dayOffset: number } | undefined => {
    for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
        const candidateWeekday = (weekday + dayOffset) % 7;
        const mealWindow = getWindows(schedule, candidateWeekday).find(
            (candidate) => dayOffset > 0 || candidate.start > currentMinutes
        );
        if (mealWindow) return { mealWindow, dayOffset };
    }
};

const openingLabel = (
    opening: { mealWindow: MealWindow; dayOffset: number },
    weekday: number
): string => {
    const time = formatTime(opening.mealWindow.start);
    if (opening.dayOffset === 0) return `Should open ${time}`;
    if (opening.dayOffset === 1) return `Should open ${time} tomorrow`;

    const day = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ][(weekday + opening.dayOffset) % 7];
    return `Should open ${time} ${day}`;
};

export const campusToday = (date = new Date()): string => {
    const parts = dateFormatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
};

export function getSuggestedMeal(
    place: string,
    date = new Date()
): string | undefined {
    const current = getMealStatus(place, date).currentMeal;
    if (current) return current;
    const schedule = schedules[place];
    if (!schedule) return;
    const time = getTimeParts(date);
    return nextOpening(schedule, getWeekday(date), time.hour * 60 + time.minute)
        ?.mealWindow.meal;
}

export const getNoDataReason = (
    dateStr: string,
    campusDate = campusToday(),
    hasDataElsewhere = false
): string => {
    if (hasDataElsewhere) return "Other halls have menus for this meal.";
    if (dateStr > campusDate) return "This menu has not been published yet.";
    if (dateStr < campusDate)
        return "No published menu is available for this date.";
    return "No menu has been published for this meal.";
};

export const getMealStatus = (place: string, date = new Date()): MealStatus => {
    const schedule = schedules[place];
    if (!schedule) {
        return {
            state: "closed",
            label: "Hours unavailable",
            detail: "Check official hours"
        };
    }

    const weekday = getWeekday(date);
    const { hour, minute } = getTimeParts(date);
    const currentMinutes = hour * 60 + minute;
    const windows = getWindows(schedule, weekday);
    const current = windows.find(
        (mealWindow) =>
            currentMinutes >= mealWindow.start &&
            currentMinutes < mealWindow.end
    );

    if (current) {
        return {
            state: "open",
            label: "Usually open",
            detail: `Should close ${formatTime(current.end)}`,
            currentMeal: current.meal
        };
    }

    const opening = nextOpening(schedule, weekday, currentMinutes);
    return {
        state: "closed",
        label: "Usually closed",
        detail: opening
            ? openingLabel(opening, weekday)
            : "No upcoming regular hours"
    };
};
