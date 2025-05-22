const sunriseCache = new Map();

function runSunrise(date) {
    if (!sunriseCache.has('filled')) {
        for (const meta of document.head.querySelectorAll('meta')) {
            if (meta.name === 'latitude') {
                sunriseCache.set('latitude', parseFloat(meta.content) || 0);
            }

            if (meta.name === 'longitude') {
                sunriseCache.set('longitude', parseFloat(meta.content) || 0);
            }
        }
        sunriseCache.set('filled', true);
    }

    if (!(sunriseCache.has('latitude') && sunriseCache.has('longitude'))) return [null, null];


    const latitude = sunriseCache.get('latitude');
    const longitude = sunriseCache.get('longitude');
    const result = calculateSunrise(date, latitude, longitude);
    const timeFormat = {hour: 'numeric', minute: 'numeric'};
    const durationHours = Math.trunc(result.sunlightDurationMinutes / 60);
    const durationMinutes = Math.ceil(result.sunlightDurationMinutes % 60);
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;

    const results = [
        `Sunrise: ${result.sunriseDate.toLocaleString(locale, timeFormat)}`,
        `Sunset: ${result.sunsetDate.toLocaleString(locale, timeFormat)}`,
        `Daylight: ${durationHours}h ${durationMinutes}m`,
    ];

    const daylight = calculateDaylight(result);
    if (daylight && daylight.isBeforeSunrise) {
        results.push(`Until sunrise: ${daylight.hoursUntilSunrise}h ${daylight.minutesUntilSunrise}m`);
    }

    if (daylight && daylight.isAfterSunset) {
        results.push(`Since sunset: ${daylight.hoursSinceSunset}h ${daylight.minutesSinceSunset}m`);
    }

    if (daylight && !daylight.isBeforeSunrise && !daylight.isAfterSunset) {
        results.push(`Daylight spent: ${daylight.hoursSinceSunrise}h ${daylight.minutesSinceSunrise}m, ${daylight.spentPercent}%`);
        results.push(`Daylight remaining: ${daylight.hoursUntilSunset}h ${daylight.hoursUntilSunset}m, ${daylight.remainingPercent}%`);
    }
    return results;
}

/**
 * A JS translation of the NOAA Solar Calculator year spreadsheet.
 *
 * See: https://gml.noaa.gov/grad/solcalc/
 * See: https://gml.noaa.gov/grad/solcalc/calcdetails.html
 */
function calculateSunrise(date, latitude, longitude) {
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

function calculateDaylight(sunriseResult) {
    const now = new Date();

    const dateIsToday = now.getFullYear() === sunriseResult.date.getFullYear() &&
        now.getMonth() === sunriseResult.date.getMonth() &&
        now.getDate() === sunriseResult.date.getDate();

    if (!dateIsToday) return null;

    const sunriseDeltaMinutes = now.getHours() * 60 + now.getMinutes() -
        sunriseResult.sunriseDate.getHours() * 60 - sunriseResult.sunriseDate.getMinutes();

    const sunsetDeltaMinutes = sunriseResult.sunsetDate.getHours() * 60 + sunriseResult.sunsetDate.getMinutes() -
        now.getHours() * 60 - now.getMinutes();

    let hoursSinceSunrise = Math.trunc(sunriseDeltaMinutes / 60);
    let minutesSinceSunrise = Math.ceil(sunriseDeltaMinutes % 60);
    let hoursUntilSunrise = 0;
    let minutesUntilSunrise = 0;
    let spentPercent = Math.ceil((sunriseDeltaMinutes / sunriseResult.sunlightDurationMinutes) * 100);

    if (sunriseDeltaMinutes < 0) {
        hoursSinceSunrise = 0;
        minutesSinceSunrise = 0;
        hoursUntilSunrise = Math.trunc(Math.abs(sunriseDeltaMinutes) / 60);
        minutesUntilSunrise = Math.trunc(Math.abs(sunriseDeltaMinutes) % 60);
        spentPercent = 0;
    }

    let hoursSinceSunset = 0;
    let minutesSinceSunset = 0;
    let hoursUntilSunset = Math.trunc(sunsetDeltaMinutes / 60);
    let minutesUntilSunset = Math.trunc(sunsetDeltaMinutes % 60);
    let remainingPercent = Math.ceil((sunsetDeltaMinutes / sunriseResult.sunlightDurationMinutes) * 100);

    if (sunsetDeltaMinutes < 0) {
        hoursSinceSunset = Math.trunc(Math.abs(sunsetDeltaMinutes) / 60);
        minutesSinceSunset = Math.trunc(Math.abs(sunsetDeltaMinutes) % 60);
        hoursUntilSunset = 0;
        minutesUntilSunset = 0;
        remainingPercent = 0;
    }

    return {
        isBeforeSunrise: sunriseDeltaMinutes < 0,
        isAfterSunset: sunsetDeltaMinutes < 0,
        hoursUntilSunrise,
        minutesUntilSunrise,
        hoursSinceSunrise,
        minutesSinceSunrise,
        hoursUntilSunset,
        minutesUntilSunset,
        hoursSinceSunset,
        minutesSinceSunset,
        spentPercent,
        remainingPercent,
    }
}
