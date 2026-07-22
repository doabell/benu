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
            window("dinner", "Dinner", 17 * 60, 20 * 60 + 30)
        ],
        weekend: [
            window("breakfast", "Breakfast", 8 * 60, 11 * 60),
            window("lunch", "Brunch", 11 * 60, 14 * 60),
            window("dinner", "Dinner", 17 * 60, 20 * 60 + 30)
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

const getTimeParts = (date: Date): { hour: number; minute: number } => {
    const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: CAMPUS_TIME_ZONE
    }).formatToParts(date);
    const hourPart = Number(parts.find((part) => part.type === "hour")?.value);
    const minutePart = Number(
        parts.find((part) => part.type === "minute")?.value
    );

    return { hour: hourPart === 24 ? 0 : hourPart, minute: minutePart };
};

const getWeekday = (date: Date): number => {
    const weekday = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: CAMPUS_TIME_ZONE
    }).format(date);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
};

const formatTime = (minutes: number): string => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return minute === 0
        ? `${displayHour} ${suffix}`
        : `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const getWindows = (schedule: HallSchedule, weekday: number): MealWindow[] =>
    weekday === 0 || weekday === 6 ? schedule.weekend : schedule.weekday;

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
    const parts = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: CAMPUS_TIME_ZONE
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
};

export const getNoDataReason = (
    dateStr: string,
    campusDate = campusToday()
): string => {
    if (dateStr > campusDate) return "Not published yet?";
    if (dateStr < campusDate) return "Too far away?";
    return "Closed?";
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
