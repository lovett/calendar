import {test, expect, describe, beforeAll, beforeEach, afterEach, setSystemTime} from "bun:test";

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

function addStandardLatLong() {
    addTestMetaTag('latitude', 40.7128);
    addTestMetaTag('longitude', -74.006);
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
        setSystemTime();
    });

    describe("Configuration", function() {
        test("returns nulls if latitude and longitude meta tags are not present", function() {
            const result = runSunrise(date);
            expect(result).toHaveLength(0);
        });

        test("returns nulls if latitude and longitude are not both present", function() {
            addTestMetaTag('latitude', 'test');
            const result = runSunrise(date);
            expect(result).toHaveLength(0);
        });

        test("returns nulls if latitude or longitude are zero", function() {
            addTestMetaTag('latitude', 0);
            const result = runSunrise(date);
            expect(result).toHaveLength(0);
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

    describe("decimalDaysToHMS()", function() {
        const cases = [
            [0, { hours: 0, minutes: 0, seconds: 0 }],
            [.5, { hours: 12, minutes: 0, seconds: 0 }],
            [1, { hours: 0, minutes: 0, seconds: 0 }],
            [0.246237380230012, { hours: 5, minutes: 54, seconds: 34 }]
        ];

        test.each(cases)("%p", (decimal, obj) => {
            const result = decimalDaysToHMS(decimal);
            expect(result).toEqual(obj);
        });
    });

    test("minutesToDuration()", function() {
        const locale = "en";
        const label = "mylabel";
        let expected;
        for (let i = -61; i <= 61; i++) {
            const h = Math.trunc(Math.abs(i) / 60);
            const m = Math.trunc(Math.abs(i) % 60);

            if (h == 0) {
                expected = `${m}m ${label}`;
            } else {
                expected = `${h}h ${m}m ${label}`;
            }
            const result = minutesToDuration(i, label, locale);
            expect(result).toEqual(expected);
            expect(result.indexOf('60m')).toBe(-1);
        }
    });

    /**
     * The calculate method's return object models the NOAA
     * spreadsheet.  Each property is an incrementgal value that isn't
     * especially useful in isolation but gets treated that way here
     * for incremental verification.
     *
     * To match the spreadsheet, the "Time (hrs past local midnight)" column
     * was set to "0:00".
     */
    describe("Sunrise Calculation", function() {
        beforeEach(function() {
            result = window.calculateSolarFacts(date, 40.7128, -74.006);
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
            now.setHours(12);

            const sunrise = new Date(now);
            sunrise.setHours(now.getHours() - 1);

            for (let i = -1; i <= 1; i++) {
                const d = new Date(now);
                d.setHours(now.getHours() + i * 24);
                const sunriseResult = {date: d, sunriseDate: sunrise};
                const daylightResult = window.calculateDaylightFacts(d, sunriseResult);

                if (i == 0) {
                    expect(daylightResult).toBeObject();
                } else {
                    expect(daylightResult).toBeNull();
                }
            }
        });

        test("sunrise/sunset delta", function() {
            const now = new Date();
            now.setHours(12);

            const sunrise = new Date(now);
            sunrise.setHours(now.getHours() - 1);

            const sunset = new Date(now);
            sunset.setHours(now.getHours() + 1);

            const daylightMinutes = (sunset - sunrise) / 1000 / 60;

            // 1-minute increments from before sunrise to after sunset
            // starting from sunrise
            for (let i = daylightMinutes * -1; i <= daylightMinutes; i++) {
                const d = new Date(sunrise);
                d.setMinutes(sunrise.getMinutes() + i);

                const sunriseResult = {
                    date: d,
                    sunriseDate: sunrise,
                    sunsetDate: sunset,
                    sunlightDurationMinutes: daylightMinutes,
                };

                const daylightResult = window.calculateDaylightFacts(d, sunriseResult);

                expect(daylightResult.sunriseDeltaMS).toEqual(i * 60 * 1000);

                if (d < sunrise) {
                    expect(daylightResult.sinceSunriseMinutes).toBe(null);
                    expect(daylightResult.sinceSunsetMinutes).toBe(null);
                    expect(daylightResult.remainingMinutes).toEqual(daylightMinutes);
                    expect(daylightResult.spentPercent).toEqual(0);
                    expect(daylightResult.remainingPercent).toEqual(100);
                    expect(daylightResult.spentPercent).toEqual(0);
                }

                if (d >= sunrise && d < sunset) {
                    const minutesSpent = (d - sunrise) / 1000 / 60;
                    const minutesSpentPercent = Math.ceil(minutesSpent / daylightMinutes * 100);
                    expect(daylightResult.sinceSunriseMinutes).toBe(minutesSpent);
                    expect(daylightResult.sinceSunsetMinutes).toBe(null);
                    expect(daylightResult.spentPercent).toEqual(minutesSpentPercent);
                    expect(daylightResult.remainingMinutes).toEqual(daylightMinutes - minutesSpent);
                    expect(daylightResult.remainingPercent).toEqual(100 - minutesSpentPercent);
                }

                if (d >= sunset) {
                    expect(daylightResult.sinceSunriseMinutes).toBe((d - sunrise) / 1000 / 60);
                    expect(daylightResult.sinceSunsetMinutes).toBe((d - sunset) / 1000 / 60);
                    expect(daylightResult.spentPercent).toEqual(100);
                    expect(daylightResult.remainingMinutes).toEqual(0);
                    expect(daylightResult.remainingPercent).toEqual(0);
                }
            }
        });

        test("total daylight rounding", function() {
            addStandardLatLong();
            const d = new Date('2026-06-07T00:00:00');

            let matched = false
            for (let [value, _icon] of runSunrise(d)) {
                if (!value.endsWith('daylight')) continue;
                matched = true;
                expect(value).toEqual('14h 59m daylight');
            }

            expect(matched).toBe(true);
        });

        test("after sunrise rounding", function() {
            const now = "2026-06-07T05:26:00";
            setSystemTime(new Date(now));
            addStandardLatLong();

            const d = new Date()

            let matched = false
            for (let [value, _icon] of runSunrise(d)) {
                if (value.indexOf('daylight spent') === -1) continue;
                matched = true;
                expect(value).toEqual('1m daylight spent (1%)');
            }

            expect(matched).toBe(true);

            matched = false
            for (let [value, _icon] of runSunrise(d)) {
                if (value.indexOf('daylight remaining') === -1) continue;
                matched = true;
                expect(value).toEqual('14h 58m daylight remaining (99%)');
            }

            expect(matched).toBe(true);
        });

    });
});
