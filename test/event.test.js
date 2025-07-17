import {test, expect, describe, beforeEach} from "bun:test";

describe('CalendarEvent', function() {
    beforeEach(function() {
        document.body.querySelectorAll('cal-event').forEach(node => node.remove());
    });

    describe("data-ym attribute", function() {
        test("is populated with a single value", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 test';
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('2025-01');
        });

        test("is populated with multiple values", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 to 2025-02-01 test';
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('2025-01 2025-02');
        });

        test("does not duplicate values", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 to 2025-01-02 test';
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('2025-01');
        });

        test("can be empty", function() {
            const event = document.createElement('cal-event');
            document.body.appendChild(event);
            expect(event.dataset.ym).toBe('');
        });
    });

    describe("Date parsing", function() {
        test("defaults end date to start date", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 test';
            event.parseDate()
            expect(event.start.getFullYear()).toBe(2025);
            expect(event.start.getMonth()).toBe(0);
            expect(event.start.getDate()).toBe(2);
            expect(event.end.getFullYear(), event.start.getFullYear());
            expect(event.end.getMonth(), event.start.getMonth());
            expect(event.end.getDate(), event.start.getDate());
        });

        test("recognizes end date", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 to 2025-02-07 test';
            event.parseDate();
            expect(event.start.getMonth()).toBe(0);
            expect(event.start.getDate()).toBe(2);
            expect(event.end.getMonth()).toBe(1);
            expect(event.end.getDate()).toBe(7);
        });

        test("recognizes start date and time, end date only", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-03 1:01 to 2025-01-06 test';
            event.parseDate();
            event.parseTime();
            expect(event.start.getMonth()).toBe(0);
            expect(event.start.getDate()).toBe(3);
            expect(event.end.getMonth()).toBe(0);
            expect(event.end.getDate()).toBe(6);
        });

        test("does not look too far for end date", function() {
            const scenarios = [
                '2025-01-05 word <details>2025-01-06 word</details>',
                '2025-01-07 9:00 word <details>2025-01-08 word</details>',
                '2025-01-09 word <details>2025-01-10</details>',
            ];

            for (const scenario of scenarios) {
                const event = document.createElement('cal-event');
                event.textContent = scenario;
                event.parseDate();
                expect(event.end.getDate()).toBe(event.start.getDate(), scenario);
            }
        });
    });

    describe("Event classification", function() {
        test("identifies multi-day events within a single month", function () {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDay()).toBe(true);
            expect(event.isAllDay()).toBe(false);
        });

        test("identifies multi-day events that span multiple months", function () {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 to 2025-02-09 test';
            event.parseDate();
            expect(event.isMultiDay()).toBe(true);
            expect(event.isAllDay()).toBe(false);
        });

        test("identifies all-day events", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 test';
            event.parseDate();
            expect(event.isMultiDay()).toBe(false);
            expect(event.isAllDay()).toBe(true);
        });

        test("identifies multi-day start", function() {
            const d = new Date(2025, 0, 2);
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDayStart(d)).toBe(true);
            expect(event.isMultiDayEnd(d)).toBe(false);
            expect(event.isMultiDayContinuation(d)).toBe(false);
        });

        test("identifies multi-day end", function() {
            const d = new Date(2025, 0, 9)
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDayStart(d)).toBe(false);
            expect(event.isMultiDayEnd(d)).toBe(true);
            expect(event.isMultiDayContinuation(d)).toBe(false);
        });

        test("identifies multi-day continuation", function() {
            const d = new Date(2025, 0, 4)
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 to 2025-01-09 test';
            event.parseDate();
            expect(event.isMultiDayStart(d)).toBe(false);
            expect(event.isMultiDayEnd(d)).toBe(false);
            expect(event.isMultiDayContinuation(d)).toBe(true);
        });

    });

    describe("Time parsing", function() {
        test("parses date and time discretely", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-02 8:30 AM';
            event.parseDate()
            expect(event.parsedTime).toBe(false);
            expect(event.start.getHours()).toBe(0);
            event.parseTime();
            expect(event.parsedTime).toBe(true);
            expect(event.start.getHours()).toBe(8);
        });

        test("defaults start time to beginning of day", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01';
            event.parseDate()
            expect(event.start.getHours()).toBe(0);
            expect(event.start.getMinutes()).toBe(0);
            expect(event.start.getSeconds()).toBe(0);
            expect(event.start.getMilliseconds()).toBe(0);
        });

        test("defaults end time to end of day", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01';
            event.parseDate()
            expect(event.end.getHours()).toBe(23);
            expect(event.end.getMinutes()).toBe(59);
            expect(event.end.getSeconds()).toBe(59);
            expect(event.end.getMilliseconds()).toBe(999);
        });

        test("recognizes start time", function() {
            const scenarios = [
                ["8:30 AM", [8, 30]],
                ["1:03", [1, 3]],
                ["13:03", [13, 3]],
                ["12:30 PM", [12, 30]],
                ["1:37 pm", [13, 37]],
            ];

            for (const [value, [hours, minutes]] of scenarios) {
                const event = document.createElement('cal-event');
                event.textContent = `2025-01-02 ${value}`;
                event.parseDate()
                event.parseTime()
                expect(event.start.getHours()).toBe(hours);
                expect(event.start.getMinutes()).toBe(minutes);
                expect(event.start.getSeconds()).toBe(0);
                expect(event.start.getMilliseconds()).toBe(0);
            }
        });

        test("defaults end time to start time", function() {
            const scenarios = ["8:30 AM but", "13:03"];

            for (const value of scenarios) {
                const event = document.createElement('cal-event');
                event.textContent = `2025-01-02 ${value}`;
                event.parseDate()
                event.parseTime()
                expect(event.end.getHours()).toBe(event.start.getHours());
                expect(event.end.getMinutes()).toBe(event.start.getMinutes());
                expect(event.end.getSeconds()).toBe(event.start.getSeconds());
                expect(event.end.getMilliseconds()).toBe(event.start.getMilliseconds());
            }
        });

        test("recognizes end time", function() {
            const scenarios = [
                ["8:30 AM to 9:30 AM", [9, 30]],
                ["8:30 AM to 9:30 AM or maybe 11:00 AM", [9, 30]],
                ["8:30 AM might be rescheduled to 8:45", [8, 30]],
                ["8:30 AM until 9:30 AM", [9, 30]],
            ];

            for (const [value, [hours, minutes]] of scenarios) {
                const event = document.createElement('cal-event');
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
        test("includes start time when specified", function() {
            const event = document.createElement('cal-event');
            event.textContent = '2025-01-01 8:30 AM rest of text';
            event.parseDate();
            event.parseTime();
            expect(event.shortLine('en-US')).toBe('<time>8:30 AM</time> rest of text');
        });

        test("omits start time for all-day and multi-day events", function() {
            const scenarios = [
                '2025-01-01 rest of text',
                '2025-01-01 to 2025-01-04 rest of text',
            ];

            for (const value of scenarios) {
                const event = document.createElement('cal-event');
                event.textContent = value;
                event.parseDate();
                event.parseTime();
                expect(event.shortLine('en-US')).toBe('rest of text');
            }
        });

        test("preserves markup", function() {
            const date = '2025-01-01';
            const link = '<a href="http://example.com">link</a>';
            const scenarios = [
                [`${date} ${link}`, link],
                [`${date} test ${link}`, `test ${link}`],
                [`${date} test ${link} test`, `test ${link} test`],
                [`${date} 8:30PM ${link}`, `<time>8:30 PM</time> ${link}`],

            ];

            for (const [text, description] of scenarios) {
                const event = document.createElement('cal-event');
                event.innerHTML = text;
                event.parseDate();
                event.parseTime();
                expect(event.shortLine('en-US')).toBe(description);
            }
        });
    });

    describe("Repetition parsing", function() {
        function createEvent() {
            const event = document.createElement('cal-event');
            event.innerHTML = '2025-01-01 9:30 AM repetion parsing test';
            event.parseDate();
            return event;
        }

        test('daily', function() {
            const event = createEvent();
            event.dataset.repeat = 'daily';
            event.parseRepetition();
            expect(Array.from(event.repetition.days)).toEqual([0, 1, 2, 3, 4, 5, 6]);
            expect(event.repetition.until).toBeUndefined();
        });

        test('weekly', function() {
            const event = createEvent();
            event.dataset.repeat = 'weekly';
            event.parseRepetition();
            expect(Array.from(event.repetition.days)).toEqual([3]);
            expect(event.repetition.until).toBeUndefined();
        });

        test('biweekly', function() {
            const scenarios = ['biweekly', 'every other week', 'fortnightly'];
            for (const scenario of scenarios) {
                const event = createEvent();
                event.dataset.repeat = scenario;
                event.parseRepetition();
                expect(event.repetition.dayStep).toBe(14);
            }
        });

        test('bimonthly', function() {
            const scenarios = ['bimonthly', 'every other month'];
            for (const scenario of scenarios) {
                const event1 = createEvent();
                event1.dataset.repeat = scenario;
                event1.parseRepetition();
                expect(event1.repetition.date).toEqual(event1.start.getDate());
                expect(Array.from(event1.repetition.months)).toEqual([0, 2, 4, 6, 8, 10]);

                const event2 = createEvent();
                event2.start.setMonth(event2.start.getMonth() + 1);
                event2.dataset.repeat = scenario;
                event2.parseRepetition();
                expect(event2.repetition.date).toEqual(event2.start.getDate());
                expect(Array.from(event2.repetition.months)).toEqual([1, 3, 5, 7, 9, 11]);
            }
        });

        test('monthly', function() {
            const event = createEvent();
            event.dataset.repeat = 'monthly';
            event.parseRepetition();
            expect(event.repetition.date).toEqual(1);
            expect(Array.from(event.repetition.months)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
            expect(event.repetition.until).toBeUndefined();
        });

        test('yearly', function() {
            const event = createEvent();
            event.dataset.repeat = 'yearly';
            event.parseRepetition();
            expect(event.repetition.date).toEqual(1);
            expect(Array.from(event.repetition.months)).toEqual([0]);
            expect(event.repetition.until).toBeUndefined();
        });

        test('until', function() {
            const event = createEvent();
            event.dataset.repeat = 'daily until 2025-01-08';
            event.parseRepetition();
            expect(event.repetition.until.getDate()).toBe(8);
        });

        test('ordinals', function() {
            const scenarios = [
                ['first', 1],
                ['second', 2],
                ['third', 3],
                ['fourth', 4],
                ['fifth', 5],
                ['sixth', 6]
            ];
            for (const [word, number] of scenarios) {
                const event = createEvent();
                event.dataset.repeat = `${word} Monday`;
                event.parseRepetition();
                expect(event.repetition.ordinal).toEqual(number);
            }
        });

        test('weekdays', function() {
            const event = createEvent();
            event.dataset.repeat = 'weekdays';
            event.parseRepetition();
            expect(Array.from(event.repetition.days)).toEqual([1, 2, 3, 4, 5]);
        });

        test('single day', function() {
            const scenarios = [
                ['Sunday', 0],
                ['Monday', 1],
                ['Tuesday', 2],
                ['Wednesday', 3],
                ['Thursday', 4],
                ['Friday', 5],
                ['Saturday', 6],
                ['Sun', 0],
                ['Mon', 1],
                ['Tue', 2],
                ['Wed', 3],
                ['Thu', 4],
                ['Fri', 5],
                ['Sat', 6]
            ];
            for (const [day, number] of scenarios) {
                const event = createEvent();
                event.dataset.repeat = `every ${day}`;
                event.parseRepetition();
                expect(Array.from(event.repetition.days)).toEqual([number]);
            }
        });

        test('multiple days', function() {
            const scenarios = [
                ['weekly on Sunday and Thursday', [0, 4]],
                ['Mon and Wed weekly', [1, 3]]
            ];
            for (const [phrase, days] of scenarios) {
                const event = createEvent();
                event.dataset.repeat = `every ${phrase}`;
                event.parseRepetition();
                expect(Array.from(event.repetition.days)).toEqual(days);
            }
        });

        test('single month', function() {
            const scenarios = [
                ['January', 0],
                ['February', 1],
                ['March', 2],
                ['April', 3],
                ['May', 4],
                ['June', 5],
                ['July', 6],
                ['August', 7],
                ['September', 8],
                ['October', 9],
                ['November', 10],
                ['December', 11],
                ['Jan', 0],
                ['Feb', 1],
                ['Mar', 2],
                ['Apr', 3],
                ['May', 4],
                ['Jun', 5],
                ['Jul', 6],
                ['Aug', 7],
                ['Sep', 8],
                ['Oct', 9],
                ['Nov', 10],
                ['Dec', 11],
            ];

            for (const [month, number] of scenarios) {
                const event = createEvent();
                event.dataset.repeat = `every ${month}`;
                event.parseRepetition();
                expect(Array.from(event.repetition.months)).toEqual([number]);
            }

        });

        test('multiple months', function() {
            const scenarios = [
                ['monthly from January to February', [0, 1]],
                ['January, February, March', [0, 1, 2]]
            ];
            for (const [phrase, months] of scenarios) {
                const event = createEvent();
                event.dataset.repeat = phrase;
                event.parseRepetition();
                expect(Array.from(event.repetition.months)).toEqual(months);
            }
        });
    });

    describe("Repetition calculation", function() {
        test("daily", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-01 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = 'daily';
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-02-01T00:00:00');
            for (let i = 0; i < 30; i++) {
                d.setDate(d.getDate() + 1);
                expect(event.repeatsOn(d)).toBe(true);
            }
        });

        test("weekly", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-01 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = 'weekly';
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-08T00:00:00');
            for (let i = 0; i < 30; i++) {
                d.setDate(d.getDate() + 1);

                const expectation = d.getDay() === event.start.getDay();
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("monthly", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-01 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "monthly";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-08T00:00:00');
            for (let i = 0; i < 365; i++) {
                d.setDate(d.getDate() + 1);

                const expectation = d.getDate() === 1;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("yearly", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-01 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "yearly";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-08T00:00:00');
            for (let i = 0; i < 366; i++) {
                d.setDate(d.getDate() + 1);
                const expectation = d.getDate() === 1 && d.getMonth() === 0;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("ordinal - first", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-01 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "first wednesday";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-02T00:00:00');
            for (let i = 0; i < 366; i++){
                d.setDate(d.getDate() + 1);
                const expectation = d.getDay() === 3 && d.getDate() <= 7;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("ordinal - second", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-09 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "second thursday";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-10T00:00:00');
            for (let i = 0; i < 366; i++){
                d.setDate(d.getDate() + 1);
                const expectation = d.getDay() === 4 && Math.ceil(d.getDate()/7) == 2;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("ordinal - third", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-17 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "third friday";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-18T00:00:00');
            for (let i = 0; i < 366; i++){
                d.setDate(d.getDate() + 1);
                const expectation = d.getDay() === 5 && Math.ceil(d.getDate()/7) == 3;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });
        test("ordinal - fourth", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-25 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "fourth saturday";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-18T00:00:00');
            for (let i = 0; i < 366; i++){
                d.setDate(d.getDate() + 1);
                const expectation = d.getDay() === 6 && Math.ceil(d.getDate()/7) == 4;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("ordinal - last", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-26 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "last sunday";
            event.parseDate();
            event.parseRepetition();

            const d = new Date('2025-01-27T00:00:00');
            for (let i = 0; i < 366; i++){
                d.setDate(d.getDate() + 1);
                const expectation = d.getDay() === 0 && d.getDate() >= 25;
                expect(event.repeatsOn(d)).toBe(expectation, d);
            }
        });

        test("biweekly", function() {
            const event = document.createElement('cal-event');
            event.innerHTML = "2025-01-01 9:30 AM day-of-week repetition test event";
            event.dataset.repeat = "biweekly";
            event.parseDate();
            event.parseRepetition();

            const scenarios = [];
            const initial = new Date(2025, 0, 15, 0, 0, 0);
            for (let i = 0; i < 365 * 2; i += 14) {
                const d = new Date(initial);
                d.setDate(initial.getDate() + i);
                scenarios.push(d);
            }

            for (const scenario of scenarios) {
                expect(event.repeatsOn(scenario)).toBe(true, scenario);
                const previousWeek = new Date(scenario.getFullYear(), scenario.getMonth(), scenario.getDate() - 7);
                const nextWeek = new Date(scenario.getFullYear(), scenario.getMonth(), scenario.getDate() + 7);
                expect(event.repeatsOn(previousWeek)).toBe(false, scenario);
                expect(event.repeatsOn(nextWeek)).toBe(false, scenario);
            }
        });
    });
});
