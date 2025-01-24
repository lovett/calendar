describe('Config', function() {
    beforeEach(function () {
        document.head.querySelectorAll('meta[name=locale]').forEach(node => node.remove());
    });

    describe("Locale", function() {
        it("defaults to browser", function () {
            window.dispatchEvent(new Event("DOMContentLoaded"));
            const view = document.body.querySelector(CalendarMonth.tag);
            expect(view.locale).toBe(Intl.DateTimeFormat().resolvedOptions().locale);
        });

        it("can be overridden by meta tag", function () {
            const meta = document.head.appendChild(document.createElement('meta'));
            meta.name = 'locale';
            meta.content = 'fr-FR';
            window.dispatchEvent(new Event("DOMContentLoaded"));

            const view = document.body.querySelector(CalendarMonth.tag);
            expect(view.locale).toBe(meta.content);
        });
    });

});
