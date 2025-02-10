describe('Location.hash', function() {
    const now = new Date();
    const rtf = new window.Intl.RelativeTimeFormat('en-US', { numeric: "auto" });
    beforeEach(function () {
        document.head.querySelectorAll('meta[name=locale]').forEach(node => node.remove());
    });

    describe("Default date", function() {
        it("can be a date", function() {
            const scenarios = [
                ["1999-01-01", CalendarDay],
                ["1998-02", CalendarMonth],
                ["1997", CalendarYear],
            ];

            for (const [scenario, view] of scenarios) {
                let dt;
                const parts = scenario.split('-').map(x => Number.parseInt(x, 10));
                if (parts.length === 1) dt = new Date(parts[0], 0, 1, 0, 0, 0, 0);
                if (parts.length === 2) dt = new Date(parts[0], parts[1] - 1, 1, 0, 0, 0, 0);
                if (parts.length === 3) dt = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);

                window.location.hash = scenario;
                window.dispatchEvent(new Event("DOMContentLoaded"));
                expect(view).toHaveDefaultDate(dt);
                expect(view).toBeTheActiveView();
            }
        });

        it("can be a keyword", function () {
            const scenarios = [
                ['today', new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0), CalendarDay],
                ['yesterday', new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0), CalendarDay],
                ['tomorrow', new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0), CalendarDay],
                ['this-month', new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), CalendarMonth],
                ['last-month', new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0), CalendarMonth],
                ['next-month', new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0), CalendarMonth],
                ['this-year', new Date(now.getFullYear(), 1, 1, 0, 0, 0, 0), CalendarYear],
                ['last-year', new Date(now.getFullYear() - 1, 1, 1, 0, 0, 0, 0), CalendarYear],
                ['next-year', new Date(now.getFullYear() + 1, 1, 1, 0, 0, 0, 0), CalendarYear],
            ];

            for (const [keyword, dt, view] of scenarios) {
                window.location.hash = keyword;
                window.dispatchEvent(new Event("DOMContentLoaded"));
                expect(view).toHaveDefaultDate(dt);
                expect(view).toBeTheActiveView();
            }
        });
    });
});
