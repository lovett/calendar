import {test, expect, describe} from "bun:test";

function createEvent(repeat) {
    const event = document.createElement('cal-event');
    event.innerHTML = '2025-01-01 occurrence test';
    if (repeat) event.dataset.repeat = repeat;
    event.parseDate();
    event.parseRepetition();
    return event;
}

describe('Event Occurrence', () => {

    test("non-repeating event", () => {
        const event = createEvent();
        expect(event.occurrenceBySequence(event.date, -1)).toBeEmpty();
        expect(event.occurrenceBySequence(event.date, 1)).toBeEmpty();
    });

    describe('Next', () => {
        test("daily", () => {
            const event = createEvent('daily');
            const next = new Date('2025-01-02T00:00:00');
            expect(event.occurrenceBySequence(event.date, 1)).toEqual(next);
        });

        test("daily as of date", () => {
            const event = createEvent('daily');
            const asOf = new Date('2025-12-12T00:00:00');
            const next = new Date('2025-12-13T00:00:00');
            expect(event.occurrenceBySequence(asOf, 1)).toEqual(next);
        });

        test("weekly", () => {
            const event = createEvent('weekly');
            const next = new Date('2025-01-08T00:00:00');
            expect(event.occurrenceBySequence(event.date, 1)).toEqual(next);
        });

        test("weekly as of date", () => {
            const event = createEvent('weekly');
            const asOf = new Date('2025-01-08T00:00:00');
            const next = new Date('2025-01-15T00:00:00');
            expect(event.occurrenceBySequence(asOf, 1)).toEqual(next);
        });

        test("monthly", () => {
            const event = createEvent('monthly');
            const next = new Date('2025-02-01T00:00:00');
            expect(event.occurrenceBySequence(event.date, 1)).toEqual(next);
        });

        test("monthly as of date", () => {
            const event = createEvent('monthly');
            const asOf = new Date('2025-03-01T00:00:00');
            const next = new Date('2025-04-01T00:00:00');
            expect(event.occurrenceBySequence(asOf, 1)).toEqual(next);
        });

        test("yearly", () => {
            const event = createEvent('yearly');
            const next = new Date('2026-01-01T00:00:00');
            expect(event.occurrenceBySequence(event.date, 1)).toEqual(next);
        });

        test("yearly as of date", () => {
            const event = createEvent('yearly');
            const asOf = new Date('2030-01-01T00:00:00');
            const next = new Date('2031-01-01T00:00:00');
            expect(event.occurrenceBySequence(asOf, 1)).toEqual(next);
        });

        test("ordinal - first", () => {
            const event = createEvent('first wednesday');
            const next = new Date('2025-02-05T00:00:00');
            expect(event.occurrenceBySequence(event.date, 1)).toEqual(next);
        });

        test("ordinal - first as of date", () => {
            const event = createEvent('first wednesday');
            const asOf = new Date('2025-03-05T00:00:00');
            const next = new Date('2025-04-02T00:00:00');
            expect(event.occurrenceBySequence(asOf, 1)).toEqual(next);
        });

        test("biweekly", () => {
            const event = createEvent('biweekly');
            const next = new Date('2025-01-15T00:00:00');
            expect(event.occurrenceBySequence(event.date, 1)).toEqual(next);
        });

        test("biweekly as of date", () => {
            const event = createEvent('biweekly');
            const asOf = new Date('2025-01-15T00:00:00');
            const next = new Date('2025-01-29T00:00:00');
            expect(event.occurrenceBySequence(asOf, 1)).toEqual(next);
        });
    });

    describe('Previous', () => {
        test("daily", () => {
            const event = createEvent('daily');
            expect(event.occurrenceBySequence(event.date)).toBeEmpty();
        });

        test("daily as of date", () => {
            const event = createEvent('daily');
            const asOf = new Date('2025-12-12T00:00:00');
            const previous = new Date('2025-12-11T00:00:00');
            expect(event.occurrenceBySequence(asOf, -1)).toEqual(previous);
        });

        test("weekly", () => {
            const event = createEvent('weekly');
            expect(event.occurrenceBySequence(event.date, -1)).toBeEmpty();
        });

        test("weekly as of date", () => {
            const event = createEvent('weekly');
            const asOf = new Date('2025-01-08T00:00:00');
            const previous = new Date('2025-01-01T00:00:00');
            expect(event.occurrenceBySequence(asOf, -1)).toEqual(previous);
        });

        test("monthly", () => {
            const event = createEvent('monthly');
            expect(event.occurrenceBySequence(event.date, -1)).toBeEmpty();
        });

        test("monthly as of date", () => {
            const event = createEvent('monthly');
            const asOf = new Date('2025-03-01T00:00:00');
            const previous = new Date('2025-02-01T00:00:00');
            expect(event.occurrenceBySequence(asOf, -1)).toEqual(previous);
        });

        test("yearly", () => {
            const event = createEvent('yearly');
            expect(event.occurrenceBySequence(event.date, -1)).toBeEmpty();
        });

        test("yearly as of date", () => {
            const event = createEvent('yearly');
            const asOf = new Date('2030-01-01T00:00:00');
            const previous = new Date('2029-01-01T00:00:00');
            expect(event.occurrenceBySequence(asOf, -1)).toEqual(previous);
        });

        test("ordinal - first", () => {
            const event = createEvent('first wednesday');
            expect(event.occurrenceBySequence(event.date, -1)).toBeEmpty();
        });

        test("ordinal - first as of date", () => {
            const event = createEvent('first wednesday');
            const asOf = new Date('2025-03-05T00:00:00');
            const previous = new Date('2025-02-05T00:00:00');
            expect(event.occurrenceBySequence(asOf, -1)).toEqual(previous);
        });

        test("biweekly", () => {
            const event = createEvent('biweekly');
            expect(event.occurrenceBySequence(event.date, -1)).toBeEmpty();
        });

        test("biweekly as of date", () => {
            const event = createEvent('biweekly');
            const asOf = new Date('2025-01-15T00:00:00');
            const previous = new Date('2025-01-01T00:00:00');
            expect(event.occurrenceBySequence(asOf, -1)).toEqual(previous);
        });
    });
});
