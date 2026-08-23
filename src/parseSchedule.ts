export type Course = {
    title: string;
    subject: string;
    section: string;
    startDate: string;
    endDate: string;
    days: string[];
    startTime: string;
    endTime: string;
    building: string;
    room: string;
    instructor: string;
};

export function parseSchedule(text: string): Course[] {
    const courses: Course[] = [];
    const lines = text.split("\n").flatMap((line) => line.trim().split("\r"));

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // New course starts at a header line
        const lineIsHeader =
            line.includes(" | Class Begin: ") &&
            line.includes(" | Class End: ");
        if (!lineIsHeader) continue;

        const course = parseCourse(lines, i);
        courses.push(course);
        i += 12; // Skip the next 12 lines that belong to this course
    }

    return courses;
}

function parseCourse(lines: string[], startIndex: number): Course {
    // TODO: could maybe make this more lenient to handle variations? this uses fixed offsets which only works for a correct input

    const line1 = lines[startIndex];                                            // example: "Compilers | Computer Science 414 Section 01 | Class Begin: 08/25/2026 | Class End: 12/17/2026"
    const parts = line1.split(" | ");                                           // example: ["Compilers", "Computer Science 414 Section 01", "Class Begin: 08/25/2026", "Class End: 12/17/2026"]
    const title = parts[0];                                                     // example: "Compilers"
    const subjectSection = parts[1];                                            // example: "Computer Science 414 Section 01"
    const [subject, section] = subjectSection.split(" Section ");               // example: ["Computer Science 414", "01"]

    const line3 = lines[startIndex + 2];                                        // example: "08/25/2026 -- 12/08/2026   Tuesday,Thursday"
    const [datesRaw, daysRaw] = line3.split("   ");                             // example: ["08/25/2026 -- 12/08/2026", "Tuesday,Thursday"]
    const [startDate, endDate] = datesRaw.split(" -- ");                        // example: ["08/25/2026", "12/08/2026"]
    const days = daysRaw.split(",");                                            // example: ["Tuesday", "Thursday"]

    const line11 = lines[startIndex + 10];                                      // example: "04:35 PM - 06:20 PM Type: In-Person Class Location: Hilltop Building: Lo Schiavo Science Room: G12"
    const timeRange = line11.split(" Type: ")[0];                               // example: "04:35 PM - 06:20 PM"
    const [startTime, endTime] = timeRange.split(" - ");                        // example: ["04:35 PM", "06:20 PM"]
    const [building, room] = line11.split(" Building: ")[1].split(" Room: ");   // example: ["Lo Schiavo Science", "G12"]

    const line12 = lines[startIndex + 11];                                      // example: "Instructor: Mehmet Emre (Primary)"
    const instructor = line12.split("Instructor: ")[1].split(" (")[0];          // example: "Mehmet Emre"

    const course: Course = {
        title,
        subject,
        section,
        startDate,
        endDate,
        days,
        startTime,
        endTime,
        building,
        room,
        instructor,
    };

    return course;
}
