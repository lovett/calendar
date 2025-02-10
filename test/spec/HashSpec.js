describe('Location.hash', function() {
    const now = new Date();
    const rtf = new window.Intl.RelativeTimeFormat('en-US', { numeric: "auto" });
    beforeEach(function () {
        document.head.querySelectorAll('meta[name=locale]').forEach(node => node.remove());
    });

    describe("Default date", function() {
        it("can be in yyyy-mm-dd format", function () {
            const [y, m, d] = [1999, 1, 1];
            const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
            window.location.hash = `${y}-${m}-${d}`;
            window.dispatchEvent(new Event("DOMContentLoaded"));
            expect(CalendarDay).toHaveDefaultDate(dt);
            expect(CalendarDay).toBeTheActiveView();
        });

        it("can be in yyyy-mm format", function () {
            const [y, m] = [1998, 2];
            const dt = new Date(y, m - 1, 1, 0, 0, 0, 0);
            window.location.hash = `${y}-${m}`;
            window.dispatchEvent(new Event("DOMContentLoaded"));
            expect(CalendarMonth).toHaveDefaultDate(dt);
            expect(CalendarMonth).toBeTheActiveView();
        });

        it("can be in yyyy format", function () {
            const y = 1997;
            const dt = new Date(y, 0, 1, 0, 0, 0, 0);
            window.location.hash = `${y}`;
            window.dispatchEvent(new Event("DOMContentLoaded"));
            expect(CalendarYear).toHaveDefaultDate(dt);
            expect(CalendarYear).toBeTheActiveView();
        });

        it("can be the keyword 'today'", function () {
            const keyword = rtf.format(0, 'day');
            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            window.location.hash = keyword;
            window.dispatchEvent(new Event("DOMContentLoaded"));
            expect(CalendarDay).toHaveDefaultDate(dt);
            expect(CalendarDay).toBeTheActiveView();
        });

        it("can be the keyword 'yesterday'", function () {
            const keyword = rtf.format(-1, 'day');
            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            window.location.hash = keyword;
            window.dispatchEvent(new Event("DOMContentLoaded"));
            expect(CalendarDay).toHaveDefaultDate(dt);
            expect(CalendarDay).toBeTheActiveView();
        });
    });
});
