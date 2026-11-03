import { test, expect, describe, beforeEach } from "bun:test";

describe('CalendarBase', function() {
    beforeEach(function() {
        document.body.querySelectorAll('cal-event').forEach(node => node.remove());
    });

    test("ym", function() {
        const event = document.createElement('cal-event');
        const d = new Date('2000-01-01T12:13:14-00:00');
        expect(event.ym(d)).toBe('2000-01');
        expect(event.ym()).toBe('');
    });

    test("ymd", function() {
        const event = document.createElement('cal-event');
        const d = new Date('2000-01-01T12:13:14-00:00');
        expect(event.ymd(d)).toBe('2000-01-01');
        expect(event.ymd()).toBe('');
    });
});
