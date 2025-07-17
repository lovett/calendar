import {test, expect, describe, beforeAll, beforeEach, afterEach} from "bun:test";

process.env.TZ = "America/New_York";

require('../extras/sunrise.js');

let date;
let locale;
let result;

function addTestMetaTag(name, content) {
    const meta = document.head.appendChild(document.createElement('meta'));
    meta.name = name;
    meta.content = content;
    meta.classList.add('sunrise-spec-test');
}

function removeTestMetaTags() {
    for (const node of document.head.querySelectorAll('meta.sunrise-spec-test')) {
        node.remove();
    }
}

describe('Sunrise', function() {
    beforeAll(function() {
        date = new Date(2025, 4, 1);
        locale = Intl.DateTimeFormat().resolvedOptions().locale;
    });

    afterEach(function() {
        removeTestMetaTags();
        window.sunriseCache.clear();
    });

    describe("Configuration", function() {
        test("returns nulls if latitude and longitude meta tags are not present", function() {
            const result = runSunrise(date);
            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });

        test("returns nulls if latitude and longitude are not both present", function() {
            addTestMetaTag('latitude', 'test');

            const result = runSunrise(date);
            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });

        test("returns nulls if latitude or longitude are zero", function() {
            addTestMetaTag('latitude', 0);

            const result = runSunrise(date);
            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });
    });

    describe("Parsing", function() {
        test("parses meta tags once", function() {
            addTestMetaTag('latitude', 1);
            addTestMetaTag('longitude', 2);
            const result1 = runSunrise(date);

            for (const node of document.head.querySelectorAll('meta.test')) {
                node.remove();
            }

            addTestMetaTag('latitude', 3);
            addTestMetaTag('longitude', 4);

            const result2 = runSunrise(date);
            expect(result2[0]).toEqual(result1[0]);
            expect(result2[1]).toEqual(result1[1]);
        });
    });

    describe("Formatting", function() {
        const cases = [
            [0, {hours: 0, minutes: 0, seconds: 0}],
            [.5, {hours: 12, minutes: 0, seconds: 0}],
            [1, {hours: 0, minutes: 0, seconds: 0}],
            [0.246237380230012, {hours: 5, minutes: 54, seconds: 34}]
        ];

        test.each(cases)("%p", (decimal, obj) => {
            const result = decimalDaysToHMS(decimal);
            expect(result).toEqual(obj);
        });
    });

    /**
     * The calculate method's return object models the NOAA
     * spreadsheet.  Each property is an incremental value that isn't
     * especially useful in isolation but gets treated that way here
     * for incremental verification.
     *
     * To match the spreadsheet, the "Time (hrs past local midnight)" column
     * was set to "0:00".
     */
    describe("Sunrise Calculation", function() {
        beforeEach(function() {
            result = window.calculateSunrise(date, 40.7128, -74.006);
        });

        test("Julian Day", function() {
            expect(result.julianDate).toBeCloseTo(2460796.67, 2);
        });

        test("Julian Century", function() {
            expect(result.julianCentury).toBeCloseTo(0.25329683, 8);
        });

        test("Geom Mean Long Sun (deg)", function() {
            expect(result.geomMeanLongSun).toBeCloseTo(39.3473065727212, 13);
        });

        test("Geom Mean Anom Sun (deg)", function() {
            expect(result.geomMeanAnomSun).toBeCloseTo(9475.9743732296, 10);
        });

        test("Eccent Earth Orbit", function() {
            expect(result.eccentEarthOrbit).toBeCloseTo(0.0166979780322326, 16);
        });

        test("Sun Eq of Ctr", function() {
            expect(result.sunEqOfCtr).toBeCloseTo(1.70432640933763, 14);
        });

        test("Sun True Long (deg)", function() {
            expect(result.sunTrueLong).toBeCloseTo(41.0516329820588, 13);
        });

        test("Sun True Anom (deg)", function() {
            expect(result.sunTrueAnom).toBeCloseTo(9477.6786996389, 10);
        });

        test("Sun Rad Vector (AUs)", function() {
            expect(result.sunRadVector).toBeCloseTo(1.00753708156284, 14);
        });

        test("Sun App Long (deg)", function() {
            expect(result.sunAppLong).toBeCloseTo(41.0463488240492, 13);
        });

        test("Mean Obliq Ecliptic (deg)", function() {
            expect(result.meanObliqEcliptic).toBeCloseTo(23.4359971946045, 13);
        });

        test("Obliq Corr (deg)", function() {
            expect(result.obliqCorr).toBeCloseTo(23.4385479507535, 13);
        });

        test("Sun Rt Ascen (deg)", function() {
            expect(result.sunRtAscen).toBeCloseTo(38.6200783999356, 13);
        });

        test("Sun Declin (deg)", function() {
            expect(result.sunDeclin).toBeCloseTo(15.1412922572854, 13);
        });

        test("var y", function() {
            expect(result.y).toBeCloseTo(0.0430317228092838, 16);
        });

        test("Eq of Time (minutes)", function() {
            expect(result.eqOfTime).toBeCloseTo(2.88750866108394, 14);
        });

        test("HA Sunrise (deg)", function() {
            expect(result.haSunrise).toBeCloseTo(104.638665951925, 12);
        });

        test("Solar Noon (LST)", function() {
            expect(result.solarNoonDecimalDays).toBeCloseTo(0.536900341207581, 15);
        });

        test("Sunrise Time (LST)", function() {
            expect(result.sunriseDecimalDays).toBeCloseTo(0.246237380230012, 15);
        });

        test("Sunset Time (LST)", function() {
            expect(result.sunsetDecimalDays).toBeCloseTo(0.827563302185149, 15);
        });

        test("Sunlight Duration (minutes)", function() {
            expect(result.sunlightDurationMinutes).toBeCloseTo(837.109327615397, 12);
        });

        test("Sunrise Date", function() {
            result = result.sunriseDate.toLocaleString(locale);
            expect(result).toBe('5/1/2025, 5:54:34 AM');
        });

        test("Sunset Date", function() {
            result = result.sunsetDate.toLocaleString(locale);
            expect(result).toBe('5/1/2025, 7:51:41 PM');
        });
    });

    describe("Daylight Calculation", function() {
        test("skipped for past and future dates", function() {
            const now = new Date();

            const scenarios = [
                new Date(now.getFullYear(), now.getMonth(), now.getDay() - 1),
                new Date(now.getFullYear(), now.getMonth(), now.getDay() + 1),
            ];

            for (const scenario of scenarios) {
                const sunriseResult = {date: scenario};
                const daylightResult = window.calculateDaylight(sunriseResult);
                expect(daylightResult).toBeNull();
            }
        });

        test("pre-sunrise values", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() + 1);
            fakeSunrise.setMinutes(now.getMinutes() + 1);

            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = window.calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunrise).toEqual(1);
            expect(daylightResult.minutesUntilSunrise).toEqual(1);
            expect(daylightResult.hoursSinceSunrise).toEqual(0);
            expect(daylightResult.minutesSinceSunrise).toEqual(0);
            expect(daylightResult.isBeforeSunrise).toBe(true);
        });

        test("post-sunrise values", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() - 1);
            fakeSunrise.setMinutes(now.getMinutes() - 2);

            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = window.calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunrise).toEqual(0);
            expect(daylightResult.minutesUntilSunrise).toEqual(0);
            expect(daylightResult.hoursSinceSunrise).toEqual(1);
            expect(daylightResult.minutesSinceSunrise).toEqual(2);
            expect(daylightResult.isBeforeSunrise).toBe(false);
        });

        test("at-sunrise values", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = window.calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunrise).toEqual(0);
            expect(daylightResult.minutesUntilSunrise).toEqual(0);
            expect(daylightResult.hoursSinceSunrise).toEqual(0);
            expect(daylightResult.minutesSinceSunrise).toEqual(0);
            expect(daylightResult.isBeforeSunrise).toBe(false);
        });

        test("pre-sunset values", function() {
            const now = new Date();
            const fakeSunrise = new Date();

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() + 2);
            fakeSunset.setMinutes(now.getMinutes() + 2);

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = window.calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunset).toEqual(2);
            expect(daylightResult.minutesUntilSunset).toEqual(2);
            expect(daylightResult.hoursSinceSunset).toEqual(0);
            expect(daylightResult.minutesSinceSunset).toEqual(0);
            expect(daylightResult.isAfterSunset).toBe(false);
        });

        test("post-sunset values", function() {
            const now = new Date();
            const fakeSunrise = new Date();

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() - 3);
            fakeSunset.setMinutes(now.getMinutes() - 3);

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = window.calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunset).toEqual(0);
            expect(daylightResult.minutesUntilSunset).toEqual(0);
            expect(daylightResult.hoursSinceSunset).toEqual(3);
            expect(daylightResult.minutesSinceSunset).toEqual(3);
            expect(daylightResult.isAfterSunset).toBe(true);
        });

        test("at-sunset values", function() {
            const now = new Date();
            const fakeSunrise = new Date();

            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = window.calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunset).toEqual(0);
            expect(daylightResult.minutesUntilSunset).toEqual(0);
            expect(daylightResult.hoursSinceSunset).toEqual(0);
            expect(daylightResult.minutesSinceSunset).toEqual(0);
            expect(daylightResult.isAfterSunset).toBe(false);
        });

        test("daylight spent plus remaining percent adds to 100", function() {
            const now = new Date();

            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() - 1);

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() + 1);

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset, sunlightDurationMinutes: 120};
            const daylightResult = window.calculateDaylight(sunriseResult);

            expect(daylightResult.spentPercent).toBeGreaterThan(0);
            expect(daylightResult.remainingPercent).toBeLessThan(100);
            expect(daylightResult.spentPercent + daylightResult.remainingPercent).toEqual(100);
        });


        test("daylight spent plus remaining time matches total", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() - 1);

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() + 1);

            for (let i = 0; i < 59; i++) {
                now.setMinutes(i);
                fakeSunrise.setMinutes(i);
                fakeSunset.setMinutes(i);

                const fakeSunlightDurationMinutes = (fakeSunset.getTime() - fakeSunrise.getTime()) / 60_000;
                const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset, sunlightDurationMinutes: fakeSunlightDurationMinutes };
                const daylightResult = window.calculateDaylight(sunriseResult);

                let spentPlusRemainingMinutes = (daylightResult.hoursSinceSunrise * 60) + daylightResult.minutesSinceSunrise +
                    (daylightResult.hoursUntilSunset * 60) + daylightResult.minutesUntilSunset;

                expect(spentPlusRemainingMinutes).toEqual(fakeSunlightDurationMinutes);
            }

        });
    });
});
