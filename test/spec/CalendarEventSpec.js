describe('CalendarEvent', function() {
    afterEach(function() {
        document.body.querySelectorAll(CalendarEvent.tag).forEach(node => node.remove());
    });

    describe("data-ym attribute", function() {
        it("is populated with a single value", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 test';
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('2025-01');
        });

        it("is populated with multiple values", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 to 2025-02-01 test';
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('2025-01 2025-02');
        });

        it("does not duplicate values", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 to 2025-01-02 test';
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('2025-01');
        });

        it("can be empty", function() {
            const event = document.createElement('cal-event');
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('');
        });
    });

    describe("Date parsing", function() {
        it("defaults end date to start date", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 test';
            event.parseDate()
            expect(event.start.getFullYear()).toBe(2025);
            expect(event.start.getMonth()).toBe(0);
            expect(event.start.getDate()).toBe(2);
            expect(event.end.getFullYear(), event.start.getFullYear());
            expect(event.end.getMonth(), event.start.getMonth());
            expect(event.end.getDate(), event.start.getDate());
        });

        it("recognizes end date", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 to 2025-02-07 test';
            event.parseDate();
            expect(event.start.getMonth()).toBe(0);
            expect(event.start.getDate()).toBe(2);
            expect(event.end.getMonth()).toBe(1);
            expect(event.end.getDate()).toBe(7);
        });

        it("recognizes start date and time, end date only", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-03 1:01 to 2025-01-06 test';
            event.parseDate();
            event.parseTime();
            expect(event.start.getMonth()).toBe(0);
            expect(event.start.getDate()).toBe(3);
            expect(event.end.getMonth()).toBe(0);
            expect(event.end.getDate()).toBe(6);
        });

        it("does not look too far for end date", function() {
            const scenarios = [
                '2025-01-05 word <details>2025-01-06 word</details>',
                '2025-01-07 9:00 word <details>2025-01-08 word</details>',
                '2025-01-09 word <details>2025-01-10</details>',
            ];

            for (const scenario of scenarios) {
                const event = new CalendarEvent();
                event.textContent = scenario;
                event.parseDate();
                expect(event.end.getDate()).toBe(event.start.getDate(), scenario);
            }
        });
    });

    describe("Event classification", function() {
        it("identifies multi-day events within a single month", function () {
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDay()).toBe(true);
            expect(event.isAllDay()).toBe(false);
        });

        it("identifies multi-day events that span multiple months", function () {
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 to 2025-02-09 test';
            event.parseDate();
            expect(event.isMultiDay()).toBe(true);
            expect(event.isAllDay()).toBe(false);
        });

        it("identifies all-day events", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 test';
            event.parseDate();
            expect(event.isMultiDay()).toBe(false);
            expect(event.isAllDay()).toBe(true);
        });

        it("identifies multi-day start", function() {
            const d = new Date(2025, 0, 2);
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDayStart(d)).toBe(true);
            expect(event.isMultiDayEnd(d)).toBe(false);
            expect(event.isMultiDayContinuation(d)).toBe(false);
        });

        it("identifies multi-day end", function() {
            const d = new Date(2025, 0, 9)
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDayStart(d)).toBe(false);
            expect(event.isMultiDayEnd(d)).toBe(true);
            expect(event.isMultiDayContinuation(d)).toBe(false);
        });

        it("identifies multi-day continuation", function() {
            const d = new Date(2025, 0, 4)
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDayStart(d)).toBe(false);
            expect(event.isMultiDayEnd(d)).toBe(false);
            expect(event.isMultiDayContinuation(d)).toBe(true);
        });

    });

    describe("Time parsing", function() {
        it("parses date and time discretely", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-02 8:30 AM';
            event.parseDate()
            expect(event.parsedTime).toBe(false);
            expect(event.start.getHours()).toBe(0);
            event.parseTime();
            expect(event.parsedTime).toBe(true);
            expect(event.start.getHours()).toBe(8);
        });

        it("defaults start time to beginning of day", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-01';
            event.parseDate()
            expect(event.start.getHours()).toBe(0);
            expect(event.start.getMinutes()).toBe(0);
            expect(event.start.getSeconds()).toBe(0);
            expect(event.start.getMilliseconds()).toBe(0);
        });

        it("defaults end time to end of day", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-01';
            event.parseDate()
            expect(event.end.getHours()).toBe(23);
            expect(event.end.getMinutes()).toBe(59);
            expect(event.end.getSeconds()).toBe(59);
            expect(event.end.getMilliseconds()).toBe(999);
        });

        it("recognizes start time", function() {
            const scenarios = [
                ["8:30 AM", [8, 30]],
                ["1:03", [1, 3]],
                ["13:03", [13, 3]],
                ["12:30 PM", [12, 30]],
                ["1:37 pm", [13, 37]],
            ];

            for (const [value, [hours, minutes]] of scenarios) {
                const event = new CalendarEvent();
                event.textContent = `2025-01-02 ${value}`;
                event.parseDate()
                event.parseTime()
                expect(event.start.getHours()).toBe(hours);
                expect(event.start.getMinutes()).toBe(minutes);
                expect(event.start.getSeconds()).toBe(0);
                expect(event.start.getMilliseconds()).toBe(0);
            }
        });

        it("defaults end time to start time", function() {
            const scenarios = ["8:30 AM but", "13:03"];

            for (const value of scenarios) {
                const event = new CalendarEvent();
                event.textContent = `2025-01-02 ${value}`;
                event.parseDate()
                event.parseTime()
                expect(event.end.getHours()).toBe(event.start.getHours());
                expect(event.end.getMinutes()).toBe(event.start.getMinutes());
                expect(event.end.getSeconds()).toBe(event.start.getSeconds());
                expect(event.end.getMilliseconds()).toBe(event.start.getMilliseconds());
            }
        });

        it("recognizes end time", function() {
            const scenarios = [
                ["8:30 AM to 9:30 AM", [9, 30]],
                ["8:30 AM to 9:30 AM or maybe 11:00 AM", [9, 30]],
                ["8:30 AM might be rescheduled to 8:45", [8, 30]],
                ["8:30 AM until 9:30 AM", [9, 30]],
            ];

            for (const [value, [hours, minutes]] of scenarios) {
                const event = new CalendarEvent();
                event.textContent = `2025-01-02 ${value}`;
                event.parseDate()
                event.parseTime()
                expect(event.end.getHours()).toBe(hours);
                expect(event.end.getMinutes()).toBe(minutes);
                expect(event.end.getSeconds()).toBe(0);
                expect(event.end.getMilliseconds()).toBe(0);
            }
        });
    });

    describe("Short line", function() {
        it("includes start time when specified", function() {
            const event = new CalendarEvent();
            event.textContent = '2025-01-01 8:30 AM rest of text';
            event.parseDate();
            event.parseTime();
            expect(event.shortLine('en-US')).toBe('<time>8:30 AM</time> rest of text');
        });

        it("omits start time for all-day and multi-day events", function() {
            const scenarios = [
                '2025-01-01 rest of text',
                '2025-01-01 to 2025-01-04 rest of text',
            ];

            for (const value of scenarios) {
                const event = new CalendarEvent();
                event.textContent = value;
                event.parseDate();
                event.parseTime();
                expect(event.shortLine('en-US')).toBe('rest of text');
            }
        });

        it("preserves markup", function() {
            const date = '2025-01-01';
            const link = '<a href="http://example.com">link</a>';
            const scenarios = [
                [`${date} ${link}`, link],
                [`${date} test ${link}`, `test ${link}`],
                [`${date} test ${link} test`, `test ${link} test`],
                [`${date} 8:30PM ${link}`, `<time>8:30 PM</time> ${link}`],

            ];

            for (const [text, description] of scenarios) {
                const event = new CalendarEvent();
                event.innerHTML = text;
                event.parseDate();
                event.parseTime();
                expect(event.shortLine('en-US')).toBe(description);
            }
        });
    });
});
