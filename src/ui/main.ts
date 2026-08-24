import "./style.css";
import type { Course } from "../logic/course";
import { parseSchedule } from "../logic/parse";
import { coursesToIcs } from "../logic/ics";

const input = document.querySelector<HTMLTextAreaElement>("#schedule-input")!;
const downloadButton = document.querySelector<HTMLButtonElement>("#download")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const previewList = document.querySelector<HTMLUListElement>("#preview-list")!;

// Update preview when the user pastes or edits the schedule text
input.addEventListener("input", () => {
    const courses = tryParseCourses({ quietWhenEmpty: true });
    if (courses === null) {
        return;
    }

    renderPreview(courses);
    // status.textContent = `Showing ${courses.length} course(s).`;
});

// Download .ics file when the user clicks the download button
downloadButton.addEventListener("click", () => {
    const courses = tryParseCourses({ quietWhenEmpty: false });
    if (courses === null) {
        return;
    }

    downloadTextFile(coursesToIcs(courses));
    status.textContent = `Downloaded ${courses.length} course(s).`;
});

/**
 * Parse the textarea.
 * On failure, clears the preview, updates status, and returns null.
 */
function tryParseCourses(options: {
    quietWhenEmpty: boolean;
}): Course[] | null {
    const text = input.value.trim();

    if (text === "") {
        previewList.replaceChildren();
        status.textContent = options.quietWhenEmpty
            ? ""
            : "Please paste your schedule first";
        return null;
    }

    try {
        const courses = parseSchedule(text);

        if (courses.length === 0) {
            previewList.replaceChildren();
            status.textContent = "No courses found.";
            return null;
        }

        return courses;
    } catch (error) {
        previewList.replaceChildren();
        status.textContent = "Could not parse that schedule.";
        return null;
    }
}

/** Replaces the children of previewList with an updated preview based on the given courses. */
function renderPreview(courses: Course[]): void {
    previewList.replaceChildren();

    for (const course of courses) {
        const title = document.createElement("strong");
        const when = document.createElement("div");
        const where = document.createElement("div");
        const range = document.createElement("div");

        title.textContent = course.title;
        when.textContent = `${course.days.join(", ")} · ${course.startTime} - ${course.endTime}`;
        where.textContent = `${course.building} ${course.room} · ${course.instructor}`;
        range.textContent = `${course.startDate} - ${course.endDate}`;

        const item = document.createElement("li");
        item.append(title, when, where, range);

        previewList.append(item);
    }
}

function downloadTextFile(contents: string): void {
    const mimeType = "text/calendar";
    const filename = "schedule.ics";

    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
