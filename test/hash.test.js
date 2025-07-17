import {test, expect, describe, beforeEach} from "bun:test";

describe('Location.hash', function() {
    const now = new Date();
    const rtf = new window.Intl.RelativeTimeFormat('en-US', { numeric: "auto" });

    describe("Default date as date", function() {
        const cases = [
            ["yyyy-mm-dd", "1999-01-01", "cal-day"],
            ["yyyy-mm", "1998-02", "cal-month"],
            ["yyyy", "1997", "cal-year"],
        ];

        test.each(cases)("as %p", (format, value, tag) => {
            let dt;
            const parts = value.split('-').map(x => Number.parseInt(x, 10));
            if (parts.length === 1) dt = new Date(parts[0], 0, 1, 0, 0, 0, 0);
            if (parts.length === 2) dt = new Date(parts[0], parts[1] - 1, 1, 0, 0, 0, 0);
            if (parts.length === 3) dt = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);

            window.location.href = `#${value}`; // more reliable in happy-dom than window.location.hash
            window.dispatchEvent(new Event("DOMContentLoaded"));
            const activeViews = document.querySelectorAll('.view[date]');
            expect(activeViews.length).toEqual(1);
            expect(activeViews[0].tagName.toLowerCase()).toEqual(tag);
            expect(activeViews[0].date.getTime()).toEqual(dt.getTime());
        });
    });

    describe("Default date as keyword", function() {
        const cases = [
            ['today', new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0), 'cal-day'],
            ['yesterday', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0), 'cal-day'],
            ['tomorrow', new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0), 'cal-day'],
            ['this-month', new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), 'cal-month'],
            ['last-month', new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0), 'cal-month'],
            ['next-month', new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0), 'cal-month'],
            ['this-year', new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), 'cal-year'],
            ['last-year', new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0), 'cal-year'],
            ['next-year', new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0), 'cal-year'],
        ];

        test.each(cases)("%p", (keyword, dt, tag) => {
            window.location.href = `#${keyword}`; // more reliable in happy-dom than window.location.hash
            window.dispatchEvent(new Event("DOMContentLoaded"));
            const activeViews = document.querySelectorAll('.view[date]');
            expect(activeViews.length).toEqual(1);
            expect(activeViews[0].tagName.toLowerCase()).toEqual(tag);
            expect(activeViews[0].date.getTime()).toEqual(dt.getTime());
        });
    });
});
