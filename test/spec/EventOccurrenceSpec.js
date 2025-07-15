describe("Occurrence", function() {
    function createEvent(repeat) {
        const event = new CalendarEvent();
        event.innerHTML = '2025-01-01 9:30 AM repetion parsing test';
        if (repeat) event.dataset.repeat = repeat;
        event.parseDate();
        event.parseRepetition();
        return event;
    }

    it("non-repeating event", function() {
        const event = createEvent();
        expect(event.previousOccurrence()).toBeNull();
        expect(event.nextOccurrence()).toBeNull();
    });

    describe('Next', function() {
        it("daily", function() {
            const event = createEvent('daily');
            const next = new Date('2025-01-02T00:00:00');
            expect(event.nextOccurrence()).toCalendarEqual(next);
        });

        it("daily as of date", function() {
            const event = createEvent('daily');
            const asOf = new Date('2025-12-12T00:00:00');
            const next = new Date('2025-12-13T00:00:00');
            expect(event.nextOccurrence(asOf)).toCalendarEqual(next);
        });

        it("weekly", function() {
            const event = createEvent('weekly');
            const next = new Date('2025-01-08T00:00:00');
            expect(event.nextOccurrence()).toCalendarEqual(next);
        });

        it("weekly as of date", function() {
            const event = createEvent('weekly');
            const asOf = new Date('2025-01-08T00:00:00');
            const next = new Date('2025-01-15T00:00:00');
            expect(event.nextOccurrence(asOf)).toCalendarEqual(next);
        });

        it("monthly", function() {
            const event = createEvent('monthly');
            const next = new Date('2025-02-01T00:00:00');
            expect(event.nextOccurrence()).toCalendarEqual(next);
        });

        it("monthly as of date", function() {
            const event = createEvent('monthly');
            const asOf = new Date('2025-03-01T00:00:00');
            const next = new Date('2025-04-01T00:00:00');
            expect(event.nextOccurrence(asOf)).toCalendarEqual(next);
        });

        it("yearly", function() {
            const event = createEvent('yearly');
            const next = new Date('2026-01-01T00:00:00');
            expect(event.nextOccurrence()).toCalendarEqual(next);
        });

        it("yearly as of date", function() {
            const event = createEvent('yearly');
            const asOf = new Date('2030-01-01T09:30:00');
            const next = new Date('2031-01-01T09:30:00');
            expect(event.nextOccurrence(asOf)).toCalendarEqual(next);
        });

        it("ordinal - first", function() {
            const event = createEvent('first wednesday');
            const next = new Date('2025-02-05T00:00:00');
            expect(event.nextOccurrence()).toCalendarEqual(next);
        });

        it("ordinal - first as of date", function() {
            const event = createEvent('first wednesday');
            const asOf = new Date('2025-03-05T09:30:00');
            const next = new Date('2025-04-02T09:30:00');
            expect(event.nextOccurrence(asOf)).toCalendarEqual(next);
        });

        it("biweekly", function() {
            const event = createEvent('biweekly');
            const next = new Date('2025-01-15T00:00:00');
            expect(event.nextOccurrence()).toCalendarEqual(next);
        });

        it("biweekly as of date", function() {
            const event = createEvent('biweekly');
            const asOf = new Date('2025-01-15T09:30:00');
            const next = new Date('2025-01-29T09:30:00');
            expect(event.nextOccurrence(asOf)).toCalendarEqual(next);
        });
    });

    describe('Previous', function() {
        it("daily", function() {
            const event = createEvent('daily');
            expect(event.previousOccurrence()).toBeNull();
        });

        it("daily as of date", function() {
            const event = createEvent('daily');
            const asOf = new Date('2025-12-12T00:00:00');
            const previous = new Date('2025-12-11T00:00:00');
            expect(event.previousOccurrence(asOf)).toCalendarEqual(previous);
        });

        it("weekly", function() {
            const event = createEvent('weekly');
            expect(event.previousOccurrence()).toBeNull();
        });

        it("weekly as of date", function() {
            const event = createEvent('weekly');
            const asOf = new Date('2025-01-08T00:00:00');
            const previous = new Date('2025-01-01T00:00:00');
            expect(event.previousOccurrence(asOf)).toCalendarEqual(previous);
        });

        it("monthly", function() {
            const event = createEvent('monthly');
            expect(event.previousOccurrence()).toBeNull();
        });

        it("monthly as of date", function() {
            const event = createEvent('monthly');
            const asOf = new Date('2025-03-01T00:00:00');
            const previous = new Date('2025-02-01T00:00:00');
            expect(event.previousOccurrence(asOf)).toCalendarEqual(previous);
        });

        it("yearly", function() {
            const event = createEvent('yearly');
            expect(event.previousOccurrence()).toBeNull();
        });

        it("yearly as of date", function() {
            const event = createEvent('yearly');
            const asOf = new Date('2030-01-01T09:30:00');
            const previous = new Date('2029-01-01T09:30:00');
            expect(event.previousOccurrence(asOf)).toCalendarEqual(previous);
        });

        it("ordinal - first", function() {
            const event = createEvent('first wednesday');
            expect(event.previousOccurrence()).toBeNull();
        });

        it("ordinal - first as of date", function() {
            const event = createEvent('first wednesday');
            const asOf = new Date('2025-03-05T09:30:00');
            const previous = new Date('2025-02-05T09:30:00');
            expect(event.previousOccurrence(asOf)).toCalendarEqual(previous);
        });

        it("biweekly", function() {
            const event = createEvent('biweekly');
            expect(event.previousOccurrence()).toBeNull();
        });

        it("biweekly as of date", function() {
            const event = createEvent('biweekly');
            const asOf = new Date('2025-01-15T09:30:00');
            const previous = new Date('2025-01-01T09:30:00');
            expect(event.previousOccurrence(asOf)).toCalendarEqual(previous);
        });
    });
});
