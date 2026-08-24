import "./style.css";
import { parseSchedule } from "../logic/parse";
import { coursesToIcs } from "../logic/ics";

const input = document.querySelector<HTMLTextAreaElement>("#schedule-input")!;
const downloadButton = document.querySelector<HTMLButtonElement>("#download")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;

downloadButton.addEventListener("click", () => {
    const text = input.value.trim();

    if (text === "") {
        status.textContent = "Please paste your schedule first";
        return;
    }

    try {
        const courses = parseSchedule(text);

        if (courses.length === 0) {
            status.textContent = "No courses found.";
            return;
        }

        const ics = coursesToIcs(courses);
        downloadTextFile(ics);
        status.textContent = `Downloaded ${courses.length} course(s).`;
    } catch (error) {
        console.error(error);
        status.textContent = "Could not parse that schedule.";
    }
});

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
