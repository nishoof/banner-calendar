import type { Course } from "./course";

const WEEKDAY_TO_BYDAY: Record<string, string> = {
    Sunday: "SU",
    Monday: "MO",
    Tuesday: "TU",
    Wednesday: "WE",
    Thursday: "TH",
    Friday: "FR",
    Saturday: "SA",
};

const JS_DAY_TO_WEEKDAY = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as const;

/**
 * Build one .ics calendar file from parsed courses.
 * Each course becomes one recurring VEVENT.
 */
export function coursesToIcs(courses: Course[]): string {
    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Nishil Anand//banner-calendar//EN",
        "CALSCALE:GREGORIAN", // TODO: this is optional, so we can remove. check for other optional fields that we don't need
        "METHOD:PUBLISH",
    ];

    const stamp = generateStamp();

    for (const course of courses) {
        lines.push(...courseToEventLines(course, stamp));
    }

    lines.push("END:VCALENDAR");

    // ICS wants CRLF line endings
    return lines.join("\r\n") + "\r\n";
}

function courseToEventLines(course: Course, dtstamp: string): string[] {
    const tzid = "America/Los_Angeles"; // TODO: allow user to configure timezone? or maybe just use user's timezone?
    const byDays = toByDays(course.days);
    const firstDate = firstOccurrenceOnOrAfter(course.startDate, course.days);

    const start = combineDateAndTime(firstDate, course.startTime);
    const end = combineDateAndTime(firstDate, course.endTime);
    const until = combineDateAndTime(course.endDate, "11:59 PM");

    const summary = escapeIcsText(course.title);
    const location = escapeIcsText(`${course.building} ${course.room}`.trim());
    const description = escapeIcsText(
        [
            `${course.subject} Section ${course.section}`,
            `Instructor: ${course.instructor}`,
        ].join("\n"),
    );

    const uid = escapeIcsText(
        [course.title, course.section, course.startDate, course.startTime].join(
            "-",
        ) + "@banner-calendar",
    ); // TODO: should this be a UUID?

    return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${tzid}:${start}`,
        `DTEND;TZID=${tzid}:${end}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${byDays};UNTIL=${until}`,
        `SUMMARY:${summary}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        "END:VEVENT",
    ];
}

/**
 * Converts days into their BYDAY codes.
 * For example, ["Tuesday", "Thursday"] → "TU,TH".
 */
function toByDays(days: string[]): string {
    const byDays: string[] = [];

    for (const day of days) {
        const code = WEEKDAY_TO_BYDAY[day];
        if (code !== undefined) {
            byDays.push(code);
        }
    }

    return byDays.join(",");
}

/**
 * DTSTART should land on a class day.
 * Walk forward from the Banner meeting start date until we hit one.
 */
function firstOccurrenceOnOrAfter(
    courseStartDate: string,
    courseDays: string[],
): string {
    // TODO: maybe this should be a part of the Course parsing? it's a bit weird to have the startDate be a non-class day, idk why banner does that. endDate looks like it is always a class day (need to confirm)

    const allowed = new Set(courseDays);
    const date = parseBannerDate(courseStartDate);

    for (let i = 0; i < 7; i++) {
        const weekday = JS_DAY_TO_WEEKDAY[date.getDay()];
        if (allowed.has(weekday)) {
            return formatBannerDate(date);
        }
        date.setDate(date.getDate() + 1);
    }

    return courseStartDate; // TODO: maybe throw an error instead of fallback?
}

/**
 * Combines the given date and time into the format ics needs.
 * For example, "08/25/2026" + "04:35 PM" → "20260825T163500".
 */
function combineDateAndTime(bannerDate: string, bannerTime: string): string {
    const date = parseBannerDate(bannerDate);
    const { hour, minute } = parseBannerTime(bannerTime);

    return (
        pad(date.getFullYear(), 4) +
        pad(date.getMonth() + 1, 2) +
        pad(date.getDate(), 2) +
        "T" +
        pad(hour, 2) +
        pad(minute, 2) +
        "00"
    );
}

/** Generates a DTSTAMP (metadata showing when this ics file was created). YYYYMMDDTHHMMSSZ (UTC time) format. */
function generateStamp(): string {
    return new Date()
        .toISOString() // "2026-08-23T05:47:00.000Z" (current UTC time)
        .replace(/[-:]|\.\d{3}/g, ""); // "20260823T054700Z"
}

/** Parse Banner date (such as "08/25/2026") into a local Date at midnight. */
function parseBannerDate(bannerDate: string): Date {
    const [monthText, dayText, yearText] = bannerDate.split("/");
    const month = Number(monthText);
    const day = Number(dayText);
    const year = Number(yearText);

    return new Date(year, month - 1, day); // month is 0-indexed in Date
}

function formatBannerDate(date: Date): string {
    return (
        pad(date.getMonth() + 1, 2) +
        "/" +
        pad(date.getDate(), 2) +
        "/" +
        pad(date.getFullYear(), 4)
    );
}

/**
 * Parse Banner time into 24-hour hour/minute.
 * For example, "04:35 PM" -> { hour: 16, minute: 35 }.
 */
function parseBannerTime(bannerTime: string): { hour: number; minute: number } {
    const [clock, period] = bannerTime.trim().split(" ");
    const [hourText, minuteText] = clock.split(":");

    let hour = Number(hourText);
    const minute = Number(minuteText);

    if (period === "AM" && hour === 12) {
        hour = 0;
    } else if (period === "PM" && hour !== 12) {
        hour = hour + 12;
    }

    return { hour, minute };
}

/** Escape text values per ics rules. */
function escapeIcsText(text: string): string {
    return text
        .replaceAll("\\", "\\\\")
        .replaceAll(";", "\\;")
        .replaceAll(",", "\\,")
        .replaceAll("\n", "\\n");
}

function pad(value: number, width: number): string {
    let text = String(value);
    while (text.length < width) {
        text = "0" + text;
    }
    return text;
}
