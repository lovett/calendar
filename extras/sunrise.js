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
        `Sunrise at ${result.sunriseDate.toLocaleString(locale, timeFormat)}`,
        `Sunset at ${result.sunsetDate.toLocaleString(locale, timeFormat)}`,
        `${durationHours}h ${durationMinutes}m daylight`,
    ];

    const daylight = calculateDaylight(result);
    if (daylight && daylight.isBeforeSunrise) {
        results.push(`${daylight.hoursUntilSunrise}h ${daylight.minutesUntilSunrise}m until sunrise`);
    }

    if (daylight && daylight.isAfterSunset) {
        results.push(`${daylight.hoursSinceSunset}h ${daylight.minutesSinceSunset}m since sunset`);
    }

    if (daylight && !daylight.isBeforeSunrise && !daylight.isAfterSunset) {
        results.push(`${daylight.hoursSinceSunrise}h ${daylight.minutesSinceSunrise}m daylight spent (${daylight.spentPercent}%)`);
        results.push(`${daylight.hoursUntilSunset}h ${daylight.hoursUntilSunset}m daylight remaining (${daylight.remainingPercent}%)`);
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

    let hoursSinceSunrise = 0;
    let minutesSinceSunrise = 0;
    let hoursUntilSunrise = 0;
    let minutesUntilSunrise = 0;
    let spentPercent = 0;
    let isBeforeSunrise = now.getTime() < sunriseResult.sunriseDate.getTime();
    const sunriseDelta = Math.abs((sunriseResult.sunriseDate.getTime() - now.getTime()) / 60_000);
    if (isBeforeSunrise) {
        hoursUntilSunrise = Math.trunc(sunriseDelta / 60);
        minutesUntilSunrise = Math.floor(sunriseDelta % 60);
    } else {
        hoursSinceSunrise = Math.trunc(sunriseDelta / 60);
        minutesSinceSunrise = Math.floor(sunriseDelta % 60);
        spentPercent = Math.floor(sunriseDelta / sunriseResult.sunlightDurationMinutes * 100);
    }

    let hoursSinceSunset = 0;
    let minutesSinceSunset = 0;
    let hoursUntilSunset = 0;
    let minutesUntilSunset = 0;
    let remainingPercent = 0;
    let isAfterSunset = now.getTime() > sunriseResult.sunsetDate.getTime();
    const sunsetDelta = Math.abs((now.getTime() - sunriseResult.sunsetDate.getTime()) / 60_000)
    if (isAfterSunset) {
        hoursSinceSunset = Math.trunc(sunsetDelta / 60);
        minutesSinceSunset = Math.ceil(sunsetDelta % 60);
    } else {
        hoursUntilSunset = Math.trunc(sunsetDelta / 60);
        minutesUntilSunset = Math.ceil(sunsetDelta % 60);
        remainingPercent = Math.ceil(sunsetDelta / sunriseResult.sunlightDurationMinutes * 100);
    }

    return {
        isBeforeSunrise,
        isAfterSunset,
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
