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
        this.date = new Date(2025, 4, 1);
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    });

    afterEach(function() {
        removeTestMetaTags();
        sunriseCache.clear();
    });

    describe("Configuration", function() {
        it("returns nulls if latitude and longitude meta tags are not present", function() {
            const result = runSunrise(this.date);
            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });

        it("returns nulls if latitude and longitude are not both present", function() {
            addTestMetaTag('latitude', 'test');

            const result = runSunrise(this.date);
            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });

        it("returns nulls if latitude or longitude are zero", function() {
            addTestMetaTag('latitude', 0);

            const result = runSunrise(this.date);
            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });
    });

    describe("Parsing", function() {
        it("parses meta tags once", function() {
            addTestMetaTag('latitude', 1);
            addTestMetaTag('longitude', 2);
            const result1 = runSunrise(this.date);

            for (const node of document.head.querySelectorAll('meta.test')) {
                node.remove();
            }

            addTestMetaTag('latitude', 3);
            addTestMetaTag('longitude', 4);

            const result2 = runSunrise(this.date);
            expect(result2[0]).toEqual(result1[0]);
            expect(result2[1]).toEqual(result1[1]);
        });
    });

    describe("Formatting", function() {
        const scenarios = [
            [0, {hours: 0, minutes: 0, seconds: 0}],
            [.5, {hours: 12, minutes: 0, seconds: 0}],
            [1, {hours: 0, minutes: 0, seconds: 0}],
            [0.246237380230012, {hours: 5, minutes: 54, seconds: 34}]
        ];

        for (scenario of scenarios) {
            it(`formats ${scenario[0]} to hms`, function() {
                const result = decimalDaysToHMS(scenario[0]);
                expect(result).toEqual(scenario[1]);
            });
        };
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
            this.result = calculateSunrise(this.date, 40.7128, -74.006);
        });

        it("Julian Day", function() {
            expect(this.result.julianDate).toBeCloseTo(2460796.67, 2);
        });

        it("Julian Century", function() {
            expect(this.result.julianCentury).toBeCloseTo(0.25329683, 8);
        });

        it("Geom Mean Long Sun (deg)", function() {
            expect(this.result.geomMeanLongSun).toBeCloseTo(39.3473065727212, 13);
        });

        it("Geom Mean Anom Sun (deg)", function() {
            expect(this.result.geomMeanAnomSun).toBeCloseTo(9475.9743732296, 10);
        });

        it("Eccent Earth Orbit", function() {
            expect(this.result.eccentEarthOrbit).toBeCloseTo(0.0166979780322326, 16);
        });

        it("Sun Eq of Ctr", function() {
            expect(this.result.sunEqOfCtr).toBeCloseTo(1.70432640933763, 14);
        });

        it("Sun True Long (deg)", function() {
            expect(this.result.sunTrueLong).toBeCloseTo(41.0516329820588, 13);
        });

        it("Sun True Anom (deg)", function() {
            expect(this.result.sunTrueAnom).toBeCloseTo(9477.67869963894, 11);
        });

        it("Sun Rad Vector (AUs)", function() {
            expect(this.result.sunRadVector).toBeCloseTo(1.00753708156284, 14);
        });

        it("Sun App Long (deg)", function() {
            expect(this.result.sunAppLong).toBeCloseTo(41.0463488240492, 13);
        });

        it("Mean Obliq Ecliptic (deg)", function() {
            expect(this.result.meanObliqEcliptic).toBeCloseTo(23.4359971946045, 13);
        });

        it("Obliq Corr (deg)", function() {
            expect(this.result.obliqCorr).toBeCloseTo(23.4385479507535, 13);
        });

        it("Sun Rt Ascen (deg)", function() {
            expect(this.result.sunRtAscen).toBeCloseTo(38.6200783999356, 13);
        });

        it("Sun Declin (deg)", function() {
            expect(this.result.sunDeclin).toBeCloseTo(15.1412922572854, 13);
        });

        it("var y", function() {
            expect(this.result.y).toBeCloseTo(0.0430317228092838, 16);
        });

        it("Eq of Time (minutes)", function() {
            expect(this.result.eqOfTime).toBeCloseTo(2.88750866108394, 14);
        });

        it("HA Sunrise (deg)", function() {
            expect(this.result.haSunrise).toBeCloseTo(104.638665951925, 12);
        });

        it("Solar Noon (LST)", function() {
            expect(this.result.solarNoonDecimalDays).toBeCloseTo(0.536900341207581, 15);
        });

        it("Sunrise Time (LST)", function() {
            expect(this.result.sunriseDecimalDays).toBeCloseTo(0.246237380230012, 15);
        });

        it("Sunset Time (LST)", function() {
            expect(this.result.sunsetDecimalDays).toBeCloseTo(0.827563302185149, 15);
        });

        it("Sunlight Duration (minutes)", function() {
            expect(this.result.sunlightDurationMinutes).toBeCloseTo(837.109327615397, 12);
        });

        it("Sunrise Date", function() {
            result = this.result.sunriseDate.toLocaleString(this.locale);
            expect(result).toBe('5/1/2025, 5:54:34 AM');
        });

        it("Sunset Date", function() {
            result = this.result.sunsetDate.toLocaleString(this.locale);
            expect(result).toBe('5/1/2025, 7:51:41 PM');
        });
    });

    describe("Daylight Calculation", function() {
        it("skipped for past and future dates", function() {
            const now = new Date();

            const scenarios = [
                new Date(now.getFullYear(), now.getMonth(), now.getDay() - 1),
                new Date(now.getFullYear(), now.getMonth(), now.getDay() + 1),
            ];

            for (const scenario of scenarios) {
                const sunriseResult = {date: scenario};
                const daylightResult = calculateDaylight(sunriseResult);
                expect(daylightResult).toBeNull();
            }
        });

        it("pre-sunrise values", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() + 1);
            fakeSunrise.setMinutes(now.getMinutes() + 1);

            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunrise).toEqual(1);
            expect(daylightResult.minutesUntilSunrise).toEqual(1);
            expect(daylightResult.hoursSinceSunrise).toEqual(0);
            expect(daylightResult.minutesSinceSunrise).toEqual(0);
            expect(daylightResult.isBeforeSunrise).toBe(true);
        });

        it("post-sunrise values", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() - 1);
            fakeSunrise.setMinutes(now.getMinutes() - 2);

            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunrise).toEqual(0);
            expect(daylightResult.minutesUntilSunrise).toEqual(0);
            expect(daylightResult.hoursSinceSunrise).toEqual(1);
            expect(daylightResult.minutesSinceSunrise).toEqual(2);
            expect(daylightResult.isBeforeSunrise).toBe(false);
        });

        it("at-sunrise values", function() {
            const now = new Date();
            const fakeSunrise = new Date();
            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunrise).toEqual(0);
            expect(daylightResult.minutesUntilSunrise).toEqual(0);
            expect(daylightResult.hoursSinceSunrise).toEqual(0);
            expect(daylightResult.minutesSinceSunrise).toEqual(0);
            expect(daylightResult.isBeforeSunrise).toBe(false);
        });

        it("pre-sunset values", function() {
            const now = new Date();
            const fakeSunrise = new Date();

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() + 2);
            fakeSunset.setMinutes(now.getMinutes() + 2);

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunset).toEqual(2);
            expect(daylightResult.minutesUntilSunset).toEqual(2);
            expect(daylightResult.hoursSinceSunset).toEqual(0);
            expect(daylightResult.minutesSinceSunset).toEqual(0);
            expect(daylightResult.isAfterSunset).toBe(false);
        });

        it("post-sunset values", function() {
            const now = new Date();
            const fakeSunrise = new Date();

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() - 3);
            fakeSunset.setMinutes(now.getMinutes() - 3);

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunset).toEqual(0);
            expect(daylightResult.minutesUntilSunset).toEqual(0);
            expect(daylightResult.hoursSinceSunset).toEqual(3);
            expect(daylightResult.minutesSinceSunset).toEqual(3);
            expect(daylightResult.isAfterSunset).toBe(true);
        });

        it("at-sunset values", function() {
            const now = new Date();
            const fakeSunrise = new Date();

            const fakeSunset = new Date();

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset};
            const daylightResult = calculateDaylight(sunriseResult);
            expect(daylightResult.hoursUntilSunset).toEqual(0);
            expect(daylightResult.minutesUntilSunset).toEqual(0);
            expect(daylightResult.hoursSinceSunset).toEqual(0);
            expect(daylightResult.minutesSinceSunset).toEqual(0);
            expect(daylightResult.isAfterSunset).toBe(false);
        });

        it("daylight spent plus remaining percent adds to 100", function() {
            const now = new Date();

            const fakeSunrise = new Date();
            fakeSunrise.setHours(now.getHours() - 1);

            const fakeSunset = new Date();
            fakeSunset.setHours(now.getHours() + 1);

            const sunriseResult = {date: now, sunriseDate: fakeSunrise, sunsetDate: fakeSunset, sunlightDurationMinutes: 120};
            const daylightResult = calculateDaylight(sunriseResult);

            expect(daylightResult.spentPercent).toBeGreaterThan(0);
            expect(daylightResult.remainingPercent).toBeLessThan(100);
            expect(daylightResult.spentPercent + daylightResult.remainingPercent).toEqual(100);
        });


        it("daylight spent plus remaining time matches total", function() {
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
                const daylightResult = calculateDaylight(sunriseResult);

                let spentPlusRemainingMinutes = (daylightResult.hoursSinceSunrise * 60) + daylightResult.minutesSinceSunrise +
                    (daylightResult.hoursUntilSunset * 60) + daylightResult.minutesUntilSunset;

                expect(spentPlusRemainingMinutes).toEqual(fakeSunlightDurationMinutes);
            }

        });
    });
});
