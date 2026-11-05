const sunriseCache = new Map();

function minutesToDuration(minutes, label, locale) {
    if (!sunriseCache.has('durationFormatter')) {
        const formatter = new Intl.DurationFormat(locale, {
            style: "narrow",
            minutesDisplay: "always"
        });
        sunriseCache.set('durationFormatter', formatter);
    }

    const duration = {
        hours: Math.trunc(Math.abs(minutes) / 60),
        minutes: Math.trunc(Math.abs(minutes) % 60)
    }

    const result = sunriseCache.get('durationFormatter').format(duration);
    return `${result} ${label}`;
}

function runSunrise(date) {
    const now = new Date();
    const extras = [];

    if (!sunriseCache.has('latlong')) {
        for (const meta of document.head.querySelectorAll('meta')) {
            if (meta.name === 'latitude') {
                sunriseCache.set('latitude', parseFloat(meta.content) || 0);
            }

            if (meta.name === 'longitude') {
                sunriseCache.set('longitude', parseFloat(meta.content) || 0);
            }
        }
        sunriseCache.set('latlong', true);
    }

    if (!sunriseCache.has('locale')) {
        sunriseCache.set('locale', Intl.DateTimeFormat().resolvedOptions().locale);
    }

    if (!sunriseCache.has('timeformat')) {
        sunriseCache.set('timeformat', { hour: 'numeric', minute: 'numeric' });
    }

    const latitude = sunriseCache.get('latitude');
    const longitude = sunriseCache.get('longitude');
    if (!latitude || !longitude) return [];

    const locale = sunriseCache.get('locale');
    const timeFormat = sunriseCache.get('timeformat');

    const solarFacts = calculateSolarFacts(date, latitude, longitude);

    extras.push([
        `${solarFacts.sunriseDate.toLocaleString(locale, timeFormat)} sunrise`,
        'icon-sunrise'
    ]);

    extras.push([
        `${solarFacts.sunsetDate.toLocaleString(locale, timeFormat)} sunset`,
        'icon-sunset'
    ]);

    const daylightDuration = minutesToDuration(solarFacts.sunlightDurationMinutes, 'daylight', locale);
    extras.push([daylightDuration, 'icon-sun']);

    const daylightFacts = calculateDaylightFacts(now, solarFacts);

    if (daylightFacts?.sunIsUp) {
        const spent = minutesToDuration(daylightFacts.sinceSunriseMinutes, `daylight spent (${daylightFacts.spentPercent}%)`);
        extras.push([spent, 'icon-sun']);
        const remaining = minutesToDuration(daylightFacts.remainingMinutes, `daylight remaining (${daylightFacts.remainingPercent}%)`);
        extras.push([remaining, 'icon-sun']);
    }

    if (daylightFacts?.afterSunset) {
        const since = minutesToDuration(daylightFacts.sinceSunsetMinutes, 'since sunset');
        extras.push([since, 'icon-sunset']);
    }

    return extras;
}

/**
 * A JS translation of the NOAA Solar Calculator year spreadsheet.
 *
 * See: https://gml.noaa.gov/grad/solcalc/
 * See: https://gml.noaa.gov/grad/solcalc/calcdetails.html
 */
function calculateSolarFacts(date, latitude, longitude) {
    const radians = (degrees) => degrees * (Math.PI / 180);
    const degrees = (radians) => radians * (180 / Math.PI);

    const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const julianDate = localMidnight.getTime()/86_400_000 + 2440587.5;
    const julianCentury = (julianDate - 2451545.0) / 36525;
    const geomMeanLongSun = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) % 360;
    const geomMeanAnomSun = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury)
    const eccentEarthOrbit = 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury)
    const sunEqOfCtr = Math.sin(radians(geomMeanAnomSun)) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) + Math.sin(radians(2 * geomMeanAnomSun)) * (0.019993-0.000101 * julianCentury) + Math.sin(radians(3 * geomMeanAnomSun)) * 0.000289;
    const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
    const sunTrueAnom = geomMeanAnomSun + sunEqOfCtr;
    const sunRadVector = (1.000001018 * (1 - eccentEarthOrbit * eccentEarthOrbit))/(1 + eccentEarthOrbit * Math.cos(radians(sunTrueAnom)));
    const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(radians(125.04 - 1934.136 * julianCentury));
    const meanObliqEcliptic = 23 + (26 + ((21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813)))) / 60)/ 60;
    const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos(radians(125.04 - 1934.136 * julianCentury));

    // WARNING: Math.atan2() arg order is y,x not x,y
    const sunRtAscen = degrees(Math.atan2(Math.cos(radians(obliqCorr)) * Math.sin(radians(sunAppLong)), Math.cos(radians(sunAppLong))));

    const sunDeclin = degrees(Math.asin(Math.sin(radians(obliqCorr)) * Math.sin(radians(sunAppLong))));
    const y = Math.tan(radians(obliqCorr/2)) * Math.tan(radians(obliqCorr/2));
    const eqOfTime = 4 * degrees(y * Math.sin(2 * radians(geomMeanLongSun)) - 2 * eccentEarthOrbit * Math.sin(radians(geomMeanAnomSun)) + 4 * eccentEarthOrbit * y * Math.sin(radians(geomMeanAnomSun)) * Math.cos(2 * radians(geomMeanLongSun)) - 0.5 * y * y * Math.sin(4 * radians(geomMeanLongSun)) - 1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * radians(geomMeanAnomSun)));
    const haSunrise = degrees(Math.acos(Math.cos(radians(90.833)) / (Math.cos(radians(latitude)) * Math.cos(radians(sunDeclin))) - Math.tan(radians(latitude)) * Math.tan(radians(sunDeclin))));
    const solarNoonDecimalDays = (720 - (4 * longitude) - eqOfTime - localMidnight.getTimezoneOffset())/1440;
    const sunriseDecimalDays = (solarNoonDecimalDays * 1440-haSunrise * 4) / 1440;
    const sunsetDecimalDays = (solarNoonDecimalDays * 1440+haSunrise * 4) / 1440;
    const sunlightDurationMinutes = 8 * haSunrise;

    const sunriseHMS = decimalDaysToHMS(sunriseDecimalDays);
    const sunsetHMS = decimalDaysToHMS(sunsetDecimalDays);

    return {
        date,
        julianDate,
        julianCentury,
        geomMeanLongSun,
        geomMeanAnomSun,
        eccentEarthOrbit,
        sunEqOfCtr,
        sunTrueLong,
        sunTrueAnom,
        sunRadVector,
        sunAppLong,
        meanObliqEcliptic,
        obliqCorr,
        sunRtAscen,
        sunDeclin,
        y,
        eqOfTime,
        haSunrise,
        solarNoonDecimalDays,
        sunriseDecimalDays,
        sunsetDecimalDays,
        sunlightDurationMinutes,
        sunriseDate: new Date(
            localMidnight.getFullYear(), localMidnight.getMonth(), localMidnight.getDate(),
            sunriseHMS.hours, sunriseHMS.minutes, sunriseHMS.seconds),
        sunsetDate: new Date(
            localMidnight.getFullYear(), localMidnight.getMonth(), localMidnight.getDate(),
            sunsetHMS.hours, sunsetHMS.minutes, sunsetHMS.seconds),
    }
}

function decimalDaysToHMS(value) {
    if (value === 0 || value === 1) return {hours: 0, minutes: 0, seconds: 0};
    let remainder = 0;
    const hours = Math.trunc(value * 24);
    remainder = (value * 24) - hours;
    const minutes = Math.trunc(remainder * 60);
    remainder = (remainder * 60) - minutes;
    const seconds = Math.trunc(remainder * 60);
    return { hours, minutes, seconds };
}

function calculateDaylightFacts(now, solarFacts) {
    const nowYMD = now.toLocaleDateString();
    const sunriseYMD = solarFacts.sunriseDate.toLocaleDateString();
    if (nowYMD !== sunriseYMD) {
        return null;
    }

    const beforeSunrise = now < solarFacts.sunriseDate;
    const afterSunrise = now >= solarFacts.sunriseDate;
    const afterSunset = now >= solarFacts.sunsetDate;
    const sunIsUp = now >= solarFacts.sunriseDate && now < solarFacts.sunsetDate;

    const sunriseDeltaMS = now - solarFacts.sunriseDate;
    const sunsetDeltaMS = now - solarFacts.sunsetDate;

    let sinceSunriseMinutes, sinceSunsetMinutes, remainingMinutes, spentPercent, remainingPercent;
    if (beforeSunrise) {
        sinceSunriseMinutes = null;
        sinceSunsetMinutes = null;
        remainingMinutes = solarFacts.sunlightDurationMinutes;
        spentPercent = 0;
        remainingPercent = 100
    } else if (afterSunset) {
        sinceSunriseMinutes = sunriseDeltaMS / 1000 / 60;
        sinceSunsetMinutes = sunsetDeltaMS / 1000 / 60;
        remainingMinutes = 0;
        spentPercent = 100;
        remainingPercent = 0;
    } else {
        sinceSunriseMinutes = Math.ceil(sunriseDeltaMS / 1000 / 60);
        sinceSunsetMinutes = null;
        remainingMinutes = solarFacts.sunlightDurationMinutes - sinceSunriseMinutes;
        spentPercent = Math.ceil(sinceSunriseMinutes / solarFacts.sunlightDurationMinutes * 100);
        remainingPercent = 100 - spentPercent;
    }

    return {
        beforeSunrise,
        afterSunrise,
        afterSunset,
        sunIsUp,
        sunriseDeltaMS,
        sunsetDeltaMS,
        spentPercent,
        remainingMinutes,
        remainingPercent,
        sinceSunriseMinutes,
        sinceSunsetMinutes,
    }
}

window.runSunrise = runSunrise;
window.calculateDaylightFacts = calculateDaylightFacts;
window.calculateSolarFacts = calculateSolarFacts;
window.decimalDaysToHMS = decimalDaysToHMS;
window.minutesToDuration = minutesToDuration;
window.sunriseCache = sunriseCache;
