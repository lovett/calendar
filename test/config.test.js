import {test, expect, describe, afterEach} from "bun:test";

describe("Config", () => {
    describe("Locale", () => {
        afterEach(function () {
            const nodes = document.head.querySelectorAll('meta[name=locale]');
            nodes.forEach(node => node.remove());
        });

        test("defaults to browser", () => {
            window.dispatchEvent(new Event("DOMContentLoaded"));
            const view = document.body.querySelector("cal-month");
            const locale = Intl.DateTimeFormat().resolvedOptions().locale
            expect(view.locale).toBe(locale);
        });

        test("can be overridden by meta tag", () => {
            const meta = document.head.appendChild(document.createElement("meta"));
            meta.name = 'locale';
            meta.content = 'fr-FR';
            window.dispatchEvent(new Event("DOMContentLoaded"));
            const view = document.body.querySelector('cal-month');
            expect(view.locale).toBe(meta.content);
        });
    });
});
