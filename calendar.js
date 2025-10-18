class CalendarCache {
    constructor(storage, version) {
        this.cache = new Map();
        this.version = version;
        this.storage = storage;
        if (!this.version) this.storage.clear();
    }

    versionedKey(key) {
        if (!this.version) return null;
        return `${this.version}:${key}`;
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key, notFoundCallback) {
        if (notFoundCallback && !this.cache.has(key)) {
            this.set(key, notFoundCallback());
        }
        return this.cache.get(key);
    }

    clear(key) {
        this.cache.delete(key);
    }

    storageSet(key, value) {
        this.storage.setItem(key, value);
    }

    storageGet(key, foundCallback, notFoundCallback) {
        const value = this.storage.getItem(key);
        if (value) return foundCallback(value);
        return notFoundCallback();
    }
}

class CalendarBase extends HTMLElement {
    daysOfWeek(format) {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() - 1);

        const names = new Array(7);
        for (let i = 0; i < names.length; i++) {
            d.setDate(d.getDate() + 1);
            names[i] = d.toLocaleString(this.locale, {weekday: format});
        }
        return names;
    }

    monthsOfYear(format) {
        const d = new Date();
        const names = new Array(12);
        for (let i = 0; i < names.length; i++) {
            d.setMonth(i);
            names[i] = d.toLocaleString(this.locale, {month: format});
        }
        return names;
    }

    dayOfYear(date) {
        const start = Date.UTC(date.getFullYear(), 0, 0);
        const stop = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        return Math.floor((stop - start) / 86_400_000);
    }

    weekOfYear(date) {
        return Math.floor(this.dayOfYear(date) / 7);
    }

    isLastDayOfMonth(date) {
        return this.nextDay(date).getMonth() !== date.getMonth();
    }

    isWeekend(date) {
        return date.getDay() === 0 || date.getDay() === 6;
    }

    ym(d) {
        if (!d) return '';
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    ymd(d) {
        if (!d) return '';
        return `${this.ym(d)}-${d.getDate().toString().padStart(2, '0')}`;
    }

    startOfDayMs(d) {
        return d.getTime() - (d.getHours() * 3_600_000) - (d.getMinutes() * 60_000) - (d.getSeconds() * 1_000) - d.getMilliseconds();
    }

    endOfDayMs(d) {
        return this.startOfDayMs(d) + (23 * 3_600_000) + (59 * 60_000) + (59 * 1_000) + 999;
    }

    nextDay(date, count = 1) {
        const d = new Date(date.getTime());
        d.setDate(d.getDate() + count);
        return d;
    }

    previousDay(date, count = 1) {
        const d = new Date(date.getTime());
        d.setDate(d.getDate() - count);
        return d;
    }

    daysBetweenDates(d1, d2) {
        return Math.round(Math.abs(this.startOfDayMs(d1) - this.startOfDayMs(d2)) / (1000 * 60 * 60 * 24));
    }

    relativeDays(d1, d2) {
        const delta = this.daysBetweenDates(d1, d2);

        if (d1 < d2) {
            if (delta === 1) return 'tomorrow';
            if (delta > 0) return `in ${delta} days`;
        }

        if (d1 > d2) {
            if (delta === 1) return 'yesterday';
            if (delta > 0) return `${delta} days ago`;
        }
        return 'today';
    }

    constrainNavigation(firstDate, lastDate, begin, end) {
        if (begin && begin >= firstDate && begin <= lastDate) {
            document.body.classList.add('cannot-step-backward');
        } else {
            document.body.classList.remove('cannot-step-backward');
        }

        if (end && end >= firstDate && end <= lastDate) {
            document.body.classList.add('cannot-step-forward');
        } else {
            document.body.classList.remove('cannot-step-forward');
        }
    }

    enableForwardNavigation() {
        for (const el of document.querySelectorAll('.nav.next')) {
            el.classList.remove('disabled');
        }
    }

    disableForwardNavigation() {
        for (const el of document.querySelectorAll('.nav.next')) {
            el.classList.add('disabled');
        }
    }

    enableBackwardNavigation() {
        for (const el of document.querySelectorAll('.nav.previous')) {
            el.classList.remove('disabled');
        }
    }

    disableBackwardNavigation() {
        for (const el of document.querySelectorAll('.nav.previous')) {
            el.classList.add('disabled');
        }
    }

    * runExtras(date, config) {
        const extras = this.viewCache.get('extras', () => {
            const extras = [];
            for (const script of document.querySelectorAll('script')) {
                if (script.src.indexOf('extras/') === -1) continue;
                const name = script.src.split('/').pop();
                const func = name.split('.', 1).shift();
                extras.push(`run${func.charAt(0).toUpperCase()}${func.slice(1)}`);
            }
            return extras;
        });

        for (const extra of extras) {
            yield window[extra](date, config);
        }
    }

    tagSelector(tag) {
        return `[data-tags *= ${tag}] cal-event, cal-event[data-tags *= ${tag}]`;
    }

    tagSummary(tag) {
        const counts = {};
        const increment = (key, amount) => {
            if (!Object.hasOwn(counts, key)) counts[key] = 0;
            counts[key] += amount;
        }

        for (const event of document.querySelectorAll(this.tagSelector(tag))) {
            const start = new Date(event.start);
            const [elapsedDays, totalDays] = event.dayCount(this.date, this.date.getFullYear());
            const [_, totalDaysLastYear] = event.dayCount(this.date, this.date.getFullYear() - 1);

            if (event.start.getFullYear() === this.date.getFullYear() || event.end.getFullYear() === this.date.getFullYear()) {
                increment('year', totalDays);
                if (this.ymd(event.start) <= this.ymd(this.date)) increment('yearToDate', elapsedDays);
            }

            if (this.date.getFullYear() - event.start.getFullYear() === 1) {
                increment('lastYear', totalDaysLastYear);
            }
        }

        const statements = [];

        if (counts.yearToDate) {
            statements.push(`day ${counts.yearToDate} of ${counts.year} this year`);
        }

        if (counts.lastYear) {
            statements.push(`${counts.lastYear} last year`);
        }

        const span = document.createElement('span')
        span.classList.add('summary');
        span.innerText = statements.join(', ');
        return span;
    }

}

class CalendarView extends CalendarBase {
    static get observedAttributes() { return ['date']; }

    constructor(cache, config) {
        super();
        this.viewCache = cache;
        this.name = '';
        this.linkedTitleParts = [];
        this.emojiPattern = /\p{Emoji}/u;
        this.begin = config.begin;
        this.end = config.end;
    }

    connectedCallback() {
        this.classList.add('view');
        this.addEventListener('step', this);
        this.addEventListener('jump', this);
        this.addEventListener('today', this);
        this.addEventListener('swipe', this);
        this.addEventListener('clock', this);
        this.swipe = [0, 0];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name !== 'date') return;
        if (!newValue) return;

        this.date = new Date(newValue);
        if (!this.renderFromCache()) {
            this.renderShell();
            this.populateTitle();
            this.renderView();
            this.cachePage();
        }
        document.title = document.querySelector('.navigator h1').innerText;
        this.markToday();
    }

    cachePage() {
        const hash = this.hasher(this.date);
        const key = this.viewCache.versionedKey(hash);
        if (!key) return;
        this.viewCache.storageSet(key, this.innerHTML);
    }

    outOfBounds(d) {
        if (d < this.begin) return true;
        if (d > this.end) return true;
        return false;
    }

    dateWithinBoundary(d) {
        if (d < this.begin) return this.begin;
        if (d > this.end) return this.end;
        return d;
    }

    markToday() {
        for (const tag of this.querySelectorAll('.day.today')) {
            tag.classList.remove('today');
        }

        const tag = this.querySelector(`.day[data-ymd="${this.ymd(this.now)}"]`);
        if (tag) tag.classList.add('today');
    }

    highlight(el) {
        if (!el) return;
        el.classList.add('highlighted');
        setTimeout(() => {
            el.classList.remove('highlighted');
        }, 1000);
    }

    renderFromCache() {
        const hash = this.hasher(this.date);
        const key = this.viewCache.versionedKey(hash);
        return this.viewCache.storageGet(
            key,
            (value) => { this.innerHTML = value; return true },
            () => false
        );
    }

    handleEvent(e) {
        if (e.type === 'clock') {
            const now = new Date();
            if (now.getDate() !== this.now.getDate()) {
                this.viewCache.set('now', now);
                this.markToday();
            }
        }

        if (e.type === 'swipe' && e.detail.type === 'touchstart') {
            this.swipe = [e.detail.x, e.detail.y];
        }

        if (e.type === 'swipe' && e.detail.type === 'touchend') {
            const xDelta = e.detail.x - this.swipe[0];
            const yDelta = e.detail.y - this.swipe[1];
            const step = new CustomEvent('step', {detail: {to: null}});

            if (Math.abs(xDelta) > Math.abs(yDelta)) {
                if (xDelta > 0) step.detail.to = 'previous';
                if (xDelta < 0) step.detail.to = 'next';
            }

            if (step.detail.to) this.dispatchEvent(step);
            this.swipe = [0, 0];
        }

        if (e.type === 'step' && e.detail.to === 'today') {
            window.location.hash = this.hasher(this.now);
        }

        if (e.type === 'step' && e.detail.to === 'next') {
            if (document.body.classList.contains('cannot-step-forward')) return;
            window.location.hash = this.hasher(this.next);
        }

        if (e.type === 'step' && e.detail.to === 'previous') {
            if (document.body.classList.contains('cannot-step-backward')) return;
            window.location.hash = this.hasher(this.previous);
        }

        if (e.type === 'step' && e.detail.to === 'day') {
            window.location.hash = this.ymd(this.dateWithinBoundary(this.date));
        }

        if (e.type === 'step' && e.detail.to === 'month') {
            const capturedDate = this.viewCache.get('capturedDate');
            if (capturedDate) {
                window.location.hash = this.ym(capturedDate);
                this.viewCache.clear('capturedDate');
            } else {
                window.location.hash = this.ym(this.dateWithinBoundary(this.date));
            }
        }

        if (e.type === 'step' && e.detail.to === 'year') {
            this.viewCache.set('capturedDate', this.date);
            window.location.hash = this.date.getFullYear();
        }

        if (e.type === 'jump') {
            const promptDefault = this.dateWithinBoundary(this.date);
            const destination = prompt("Jump to:", this.hasher(promptDefault));
            if (destination) window.location.hash = destination;
        }

        if (e.type === 'today') {
            const today = this.ymd(new Date());
            window.location.hash = today;
        }
    }

    get dayNames() {
        return this.viewCache.get('day-names', () => {
            return this.daysOfWeek('short');
        });
    }

    get now() {
        return this.viewCache.get('now', () => {
            return new Date();
        });
    }

    eventFinder(start, end) {
        const selectors = new Set();
        selectors.add(`${CalendarEvent.tag}[data-repeat]`)
        const d = new Date(start);
        while (d <= (end || start)) {
            selectors.add(`${CalendarEvent.tag}[data-ym*="${this.ym(d)}"]`);
            d.setDate(d.getDate() + 1);
        }

        let query = '';
        for (const selector of selectors.values()) {
            query += `${selector},`;
        }
        query = query.slice(0, -1);

        return Array.from(document.querySelectorAll(query)).sort((a, b) => {
            a.parseTime();
            b.parseTime();
            if (a.start < b.start) return -1;
            if (a.start > b.start) return 1;
            if (a.isMultiDay() && !b.isMultiDay()) return -1;
            if (!a.isMultiDay() && b.isMultiDay()) return 1;
            return 0;
        });
    }

    populateTitle() {
        const formatter = new Intl.DateTimeFormat(this.locale, this.titleFormat);
        const prefix = (this.name)? [this.name, ' '] : [];

        if (prefix.length > 0) {
            const span = document.createElement('span');
            span.innerText = prefix[0];
            prefix[0] = span.outerHTML;
        }

        this.querySelector('.navigator h1').innerHTML = prefix.concat(
            formatter.formatToParts(this.date).map(({ type, value }) => {
                if (this.linkedTitleParts.indexOf(type) === -1) return value;
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = value;
                if (type === 'year') link.hash = this.date.getFullYear();
                if (type === 'month') link.hash = this.ym(this.date);
                return link.outerHTML;
            })
        ).join('');
    }

    relativeAge(d) {
        const formatter = this.viewCache.get('relativeTimeFormatter', () => {
            if (!window.Intl.RelativeTimeFormat) return null;
            return new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
        });

        if (!formatter) return '';
        const ms = d.getTime() - this.now.getTime();
        const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
        const months = Math.ceil(days / 30);
        const years = Math.ceil(days / 365);
        if (Math.abs(years) > 1) return formatter.format(years, 'year');
        if (Math.abs(months) > 3) return formatter.format(months, 'month');
        return formatter.format(days, 'day');
    }

    renderIcon(parent, id) {
        if (!id) return;

        let node;
        if (this.emojiPattern.test(id)) {
            node = document.createElement('span')
            node.classList.add('icon');
            node.innerText = id;
        }  else {
            node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            node.setAttribute('class', 'icon');
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
            node.appendChild(use);
        }
        parent.appendChild(node);
    }

    renderShell() {
        if (this.querySelector('.navigator')) return;
        this.innerHTML = `
        <header class="navigator">
            <h1></h1>
            <a href="#previous" class="nav previous"><svg class="icon"><use xlink:href="#arrow-left" /></svg></a>
            <a href="#jump" class="nav jump"><svg class="icon"><use xlink:href="#compass" /></svg></a>
            <a href="#today" class="nav today"><svg class="icon"><use xlink:href="#calendar-dot" /></svg></a>
            <a href="#next" class="nav next"><svg class="icon"><use xlink:href="#arrow-right" /></svg></a>
            <a href="#" class="nav toggle">
                <svg class="icon"><use class="up" xlink:href="#chevron-up" />
                <svg class="icon"><use class="down" xlink:href="#chevron-down" />
            </svg>
            </a>
            <div class="panel" hidden>
                <a href="#jump" class="nav jump"><svg class="icon"><use xlink:href="#compass" /></svg></a>
                <a href="#today" class="nav today"><svg class="icon"><use xlink:href="#calendar-dot" /></svg></a>
            </div>
        </header>
        `;
    }

    removeAll(selector) {
        for (const node of this.querySelectorAll(selector)) {
            node.remove();
        }
    }
}

class CalendarYear extends CalendarView {
    static get tag() { return 'cal-year' }

    constructor(cache, config) {
        super(cache, config);
        this.name = config.name;
        this.locale = config.locale;
        this.titleFormat = {year: 'numeric'}
    }

    get next() {
        const d = new Date(this.date);
        d.setFullYear(d.getFullYear() + 1);
        return d;
    }

    get previous() {
        const d = new Date(this.date);
        d.setFullYear(d.getFullYear() - 1);
        return d;
    }

    hasher(d) {
        return d.getFullYear();
    }

    renderView() {
        this.removeAll('.month');

        const fragment = document.createDocumentFragment();
        const d = this.previousDay(this.date);
        const firstDate = new Date(d.getTime() + 86_400_000);
        const lastDate = new Date(firstDate.getTime() + 86_400_000 * 364);
        this.constrainNavigation(firstDate, lastDate, this.begin, this.end);

        for (let i = 0; i <= 365; i++) {
            d.setDate(d.getDate() + 1);

            if (this.begin && d.getFullYear() < this.begin.getFullYear()) {
                continue;
            }

            if (this.end && d.getFullYear() < this.begin.getFullYear()) {
                continue;
            }

            if (this.begin && d.getMonth() < this.begin.getMonth()) {
                continue;
            }

            if (this.end && d.getMonth() > this.end.getMonth()) {
                break;
            }

            if (d.getFullYear() > this.date.getFullYear()) break;

            if (d.getDate() === 1) {
                const month = fragment.appendChild(document.createElement('div'));
                month.classList.add('month');
                month.id = this.ym(d);
                const title = month.appendChild(document.createElement('h2'));
                const link = title.appendChild(document.createElement('a'));
                link.href = '#';
                link.hash = this.ym(d);
                link.innerText = d.toLocaleString(this.locale, {month: 'long'});

                for (const day of this.dayNames) {
                    const div = document.createElement('div');
                    div.classList.add('day-of-week');
                    div.innerText = day;
                    fragment.lastChild.append(div);
                }

                if (d.getDay() > 0) {
                    const temp = new Date(d.getTime());
                    for (let i = 0; i < d.getDay(); i++) {
                        temp.setDate(temp.getDate() - temp.getDay() + i);
                        this.renderDay(fragment.lastChild, temp, 'diminished');
                    }
                }
            }

            this.renderDay(fragment.lastChild, d);

            if (this.isLastDayOfMonth(d)) {
                const temp = new Date(d.getTime());
                for (let i = temp.getDay(); i < 6; i++) {
                    temp.setDate(temp.getDate() + 1);
                    this.renderDay(fragment.lastChild, temp, 'diminished');
                }
            }
        }

        this.append(fragment);

        let ym = this.ym(this.now);
        const capturedDate = this.viewCache.get('capturedDate');
        if (capturedDate) {
            ym = this.ym(capturedDate);
        }

        const el = document.getElementById(ym);
        if (el && window.scrollY === 0) {
            document.addEventListener('scrollend', (e) => {
                this.highlight(el);
            }, {'once': true});
            el.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }

    renderDay(parent, d, ...classes) {
        const hasEvents = this.hasEvents(d);
        const container = parent.appendChild(document.createElement('div'));
        container.classList.add(...['day'].concat(classes));

        if (this.outOfBounds(d)) {
            container.classList.add('out-of-bounds');
        }

        container.setAttribute('title', this.relativeAge(d));

        container.dataset.ymd = this.ymd(d);

        const lining = container.appendChild(document.createElement('div'))
        lining.classList.add('lining');

        const dayNumber = lining.appendChild(document.createElement('a'));
        dayNumber.href = '#';
        dayNumber.hash = this.ymd(d);
        dayNumber.textContent = d.getDate();
        dayNumber.classList.add('day-number');
        if (hasEvents) dayNumber.classList.add('has-events');
    }

    hasEvents(d) {
        for (const event of this.eventFinder(d)) {
            if (event.repeatsOn(d)) return true;
            if (d.getTime() < this.startOfDayMs(event.start)) continue;
            if (d.getTime() > this.endOfDayMs(event.end)) continue;
            return true;
        }
        return false;
    }
}

class CalendarMonth extends CalendarView {
    static get tag() { return 'cal-month' }

    constructor(cache, config) {
        super(cache, config);
        this.name = config.name;
        this.locale = config.locale;
        this.linkedTitleParts = ['year'];
        this.titleFormat = {month: 'long', year: 'numeric'}
    }

    get next() {
        const d = new Date(this.date);
        d.setMonth(d.getMonth() + 1);
        return d;
    }

    get previous() {
        const d = new Date(this.date);
        d.setMonth(d.getMonth() - 1);
        return d;
    }

    hasher(d) {
        return this.ym(d);
    }

    renderView() {
        this.removeAll('.day');

        const firstDay = new Date(this.date.getFullYear(), this.date.getMonth(), 1, 0, 0, 0, 0);
        firstDay.setDate(1 - firstDay.getDay());

        const lastDay = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0, 0, 0, 0, 0);
        lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

        this.constrainNavigation(firstDay, lastDay, this.begin, this.end);

        const events = this.eventFinder(firstDay, lastDay);

        const fragment = document.createDocumentFragment();

        if (!this.querySelector('.day-of-week')) {
            for (const day of this.dayNames) {
                const div = document.createElement('div');
                div.classList.add('day-of-week');
                div.textContent = day;
                fragment.append(div);
            }
        }

        const d = new Date(firstDay);

        while (d <= lastDay) {
            const eventSubset = [];
            for (const event of events) {
                if (!event.occursOn(d) && !event.repeatsOn(d)) continue;
                if (!event.isMultiDay()) continue;
                eventSubset.push(event);

                if (eventSubset.length === 1) continue;
                event.displayIndex = eventSubset[eventSubset.length - 2].displayIndex + 1;
            }

            for (const event of events) {
                if (!event.occursOn(d) && !event.repeatsOn(d)) continue;
                if (event.isMultiDay()) continue;
                eventSubset.push(event);
                if (eventSubset.length === 1) continue;
                event.displayIndex = eventSubset[eventSubset.length - 2].displayIndex + 1;
            }

            const day = fragment.appendChild(document.createElement('div'));
            day.classList.add('day');

            day.dataset.ymd = this.ymd(d);

            if (this.outOfBounds(d)) {
                day.classList.add('out-of-bounds');
            }

            if (eventSubset.length > 0) {
                day.classList.add('has-events');
            }

            if (d.getMonth() !== this.date.getMonth()) {
                day.classList.add('diminished');
            }

            const lining = day.appendChild(document.createElement('div'));
            lining.classList.add('lining');
            this.renderDayNumber(lining, d, eventSubset.length > 0);
            this.renderEventCount(lining, eventSubset);
            this.renderEvents(lining, eventSubset, d);

            d.setDate(d.getDate() + 1);
        }

        this.append(fragment);
    }

    renderEventCount(parent, events) {
        if (events.length === 0) return;
        const div = parent.appendChild(document.createElement('div'));
        div.classList.add('event-count');
        div.textContent = events.length;
        this.renderIcon(div, 'calendar');
    }

    renderEvents(parent, events, d) {
        for (const event of events) {
            event.parseTime();

            const div = document.createElement('div');
            const sleeve = document.createElement('div');
            sleeve.classList.add('sleeve');

            if (event.hasAttribute('style')) {
                div.setAttribute('style', event.getAttribute('style'));
            }

            div.classList.add('event', ...event.classes(d));
            div.dataset.displayIndex = event.displayIndex;

            this.renderIcon(sleeve, event.icon(d));
            if (!event.isMultiDay() || event.isMultiDayStart(d) || event.isMultiDayPostSkip(d)) {
                sleeve.innerHTML += event.shortLine(this.locale);
            }

            this.renderIcon(sleeve, event.postTitleIcon(d));

            div.appendChild(sleeve);
            parent.appendChild(div);
        }
    }

    renderDayNumber(parent, d) {
        const dayNumber = parent.appendChild(document.createElement('a'));
        dayNumber.href = '#';
        dayNumber.hash = this.ymd(d);

        dayNumber.classList.add('day-number');
        dayNumber.setAttribute('title', this.relativeAge(d));

        let label = '';
        if (d.getDate() === 1) {
            label = d.toLocaleString(this.locale, {month: 'short'});
            label += ' ';
        }

        dayNumber.textContent = label + d.getDate();
    }
}

class CalendarDay extends CalendarView {
    static get tag() { return 'cal-day' }

    constructor(cache, config) {
        super(cache, config);
        this.name = config.name;
        this.locale = config.locale;
        this.linkedTitleParts = ['year', 'month'];
        this.titleFormat = {month: 'long', day: 'numeric', year: 'numeric'}
    }

    get next() {
        return this.nextDay(this.date);
    }

    get previous() {
        return this.previousDay(this.date);
    }

    hasher(d) {
        return this.ymd(d);
    }

    renderView() {
        let counter = 0;
        this.removeAll('.event, .day-of-week, .extras');

        this.constrainNavigation(this.date, this.date, this.begin, this.end);


        const extras = this.appendChild(document.createElement('ul'));
        extras.classList.add('extras');

        const li = extras.appendChild(document.createElement('li'));
        li.classList.add('day-of-week');
        li.innerHTML = `<span>${this.date.toLocaleString(this.locale, {weekday: 'long'})}</span><span>${this.relativeAge(this.date)}</span>`;

        for (const values of this.runExtras(this.date)) {
            for (const [value, icon] of values) {
                const li = extras.appendChild(document.createElement('li'));
                this.renderIcon(li, icon);
                const span = li.appendChild(document.createElement('span'));
                span.textContent = value;
            }
        }

        for (const event of this.eventFinder(this.date)) {
            if (!event.occursOn(this.date) && !event.repeatsOn(this.date)) continue;
            if (event.canSkipWeekend() && this.isWeekend(this.date)) continue;
            counter++;
            const container = this.appendChild(document.createElement('div'));
            container.classList.add('event', ...event.classes(this.date));

            if (event.hasAttribute('style')) {
                container.setAttribute('style', event.getAttribute('style'));
            }

            const time = container.appendChild(document.createElement('time'));
            if (event.canShowStartTime(this.date)) {
                const div = time.appendChild(document.createElement('div'));
                div.textContent = event.start.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'});
            }

            if (event.canShowEndTime(this.date)) {
                this.renderIcon(time, 'arrow-down');
                const div = time.appendChild(document.createElement('div'));
                div.textContent = event.end.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'});
            }

            if (!event.canShowStartTime(this.date) && !event.canShowEndTime(this.date)) {
                this.renderIcon(time, event.icon(this.date));
            }

            const h2 = container.appendChild(document.createElement('h2'));
            if (event.canShowStartTime(this.date) || event.canShowEndTime(this.date)) {
                if (!event.isMultiDay()) this.renderIcon(h2, event.icon(this.date));
            }
            h2.innerHTML += event.description;

            if (event.isMultiDay()) {
                const [elapsedDays, totalDays] = event.dayCount(this.date);
                const span = h2.appendChild(document.createElement('span'));
                span.classList.add('day-count');
                span.textContent = ` — Day ${elapsedDays} of ${totalDays}`;
            }

            const details = container.appendChild(document.createElement('div'));
            details.classList.add('details');
            details.innerHTML = event.details;

            const tags = event.tags();
            if (tags) {
                const ul = details.appendChild(document.createElement('ul'));
                ul.classList.add('tags');
                for (const tag of tags) {
                    const li = ul.appendChild(document.createElement('li'));
                    li.classList.add('tag');
                    this.renderIcon(li, 'tag');
                    li.appendChild(document.createTextNode(tag));
                    li.appendChild(this.tagSummary(tag));
                }
            }

            const recurrence = (label, d) => {
                if (!d) return;
                const p = details.appendChild(document.createElement('p'));
                p.classList.add('recurrence');
                p.innerHTML = label;

                const link = p.appendChild(document.createElement('a'));
                link.href = `#${this.ymd(d)}`;
                link.textContent = d.toLocaleString(this.locale, {month: 'long', day: 'numeric', year: 'numeric'});

                const interval = this.relativeDays(this.date, d);
                const skip = event.canSkipWeekend() ? ', skipping weekend' : '';
                p.appendChild(document.createTextNode(` (${interval}${skip})`));
            }

            const repetitionCount = event.repetitionCount(this.date);
            if (repetitionCount > 0) {
                const p = details.appendChild(document.createElement('p'));
                p.classList.add('occurrence-count');
                if (repetitionCount === 1) p.textContent = 'First occurrence';
                if (repetitionCount > 0) p.textContent = `Occurrence #${repetitionCount}`;
            }



            for (const occurrence of event.previousOccurrence(this.date)) {
                if (occurrence.length === 1) recurrence('Previously occurred on ', occurrence[0]);
                if (occurrence.length === 2) recurrence(`Previous <span class="tag"><svg class="icon"><use xlink:href="#tag"></use></svg>${occurrence[1]}</span> was `, occurrence[0]);
            }

            for (const occurrence of event.nextOccurrence(this.date)) {
                if (occurrence.length === 1) recurrence('Next occurs on ', occurrence[0]);
                if (occurrence.length === 2) recurrence(`Next <span class="tag"><svg class="icon"><use xlink:href="#tag"></use></svg>${occurrence[1]}</span> is `, occurrence[0]);
            }
        }

        if (counter === 0) {
            const container = this.appendChild(document.createElement('div'));
            container.classList.add('event', 'empty');
            const time = container.appendChild(document.createElement('time'));
            this.renderIcon(time, 'calendar-x');
            const h2 = container.appendChild(document.createElement('h2'));
            h2.textContent = 'No events';
        }
    }
}

class CalendarEvent extends CalendarBase {
    static get tag() { return 'cal-event' }

    constructor() {
        super();
        this.start = null;
        this.end = null;
        this.startTime = [0, 0];
        this.endTime = [0,0];
        this.parsingIndex = -1;
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
        this.parsedDate = false;
        this.parsedTime = false;
        this.displayIndex = 0;
        this.repetition = {};
    }

    connectedCallback() {
        this.parseDate();
        this.parseRepetition();
        const start = this.ym(this.start);
        const end = this.ym(this.end);
        this.dataset.ym = (start === end) ? start : `${start} ${end}`;

        for (const parent of this.parents()) {
            if (this.dataset.icon !== undefined) continue;
            if (parent.dataset.icon === undefined) continue;
            this.dataset.icon = parent.dataset.icon;
            break;
        }
    }

    * parents() {
        let parent = this.parentElement;
        while (parent) {
            yield parent;
            parent = parent.parentElement;
        }
    }

    tags() {
        const splitter = (node) => {
            return node.dataset.tags ? node.dataset.tags.split(/,\s*/) : [];
        }

        const tags = splitter(this);
        for (const parent of this.parents()) {
            tags.push(...splitter(parent));
        }

        return tags;
    }

    icon(d) {
        if (this.isMultiDayEnd(d) && !this.isMultiDayPostSkip(d)) return 'arrow-down';
        if (this.isMultiDayContinuation(d)) return 'arrow-right';
        if (this.dataset.icon) return this.dataset.icon;
        if (this.hasStartTime()) return null;
        if (this.repeatsOn(d)) return 'repeat';
        return 'calendar';
    }

    postTitleIcon(d) {
        if (this.isMultiDayEnd(d) && this.isMultiDayPostSkip(d)) return 'arrow-down';
        if (this.isMultiDayStart(d) && this.isMultiDayPreSkip(d)) return 'arrow-right';
        return null;
    }

    classes(d) {
        const classes = [];
        const candidates = [
            'all-day', this.isAllDay(),
            'at-time', this.canShowStartTime(d) || this.canShowEndTime(d),
            'multi-day', this.isMultiDay(),
            'multi-day-start', this.isMultiDayStart(d),
            'multi-day-continuation', this.isMultiDayContinuation(d),
            'multi-day-skip', this.canSkipWeekend() && this.isWeekend(d),
            'multi-day-pre-skip', this.isMultiDayPreSkip(d) && this.isMultiDayStart(d),
            'multi-day-post-skip', this.isMultiDayPostSkip(d),
            'multi-day-end', this.isMultiDayEnd(d),
            this.className, this.hasAttribute('class'),
        ];

        for (let i=0; i < candidates.length; i = i + 2) {
            if (candidates[i+1]) {
                classes.push(candidates[i]);
            }
        }

        for (const parent of this.parents()) {
            classes.push(...parent.classList.values());
        }

        return classes;
    }

    get description() {
        if (this.parsingIndex < 0) return '';
        const initialSlice = this.innerHTML.slice(this.parsingIndex);
        const detailsIndex = initialSlice.indexOf('<details');
        if (detailsIndex > -1) return initialSlice.slice(0, detailsIndex);
        return initialSlice;
    }

    get details() {
        const details = this.querySelector('details');
        if (details) return details.innerHTML;
        return '';
    }

    hasStartTime() {
        const [h, m] = this.startTime;
        return h > 0 || m > 0;
    }

    canShowStartTime(d) {
        if (!this.hasStartTime()) return false;
        if (this.isMultiDay() && !this.isMultiDayStart(d)) return false;
        return true;
    }

    canShowEndTime(d) {
        if (!this.hasEndTime()) return false;
        if (this.isMultiDay() && !this.isMultiDayEnd(d)) return false;
        return true;
    }

    hasEndTime() {
        if (this.startTime[0] !== this.endTime[0]) return true;
        if (this.startTime[1] !== this.endTime[1]) return true;
        return false;
    }

    isAllDay() {
        if (this.hasStartTime()) return false;
        if (this.isMultiDay()) return false;
        return true;
    }

    canSkipWeekend() {
        return this.dataset.skipWeekend !== undefined;
    }

    isMultiDay() {
        if (!this.start) return false;
        if (this.start.getMonth() !== this.end.getMonth()) return true;
        if (this.start.getDate() !== this.end.getDate()) return true;
        return false;
    }

    isMultiDayStart(d) {
        if (!this.isMultiDay()) return false;
        return this.startOfDayMs(d) === this.startOfDayMs(this.start);
    }

    isMultiDayEnd(d) {
        if (!this.isMultiDay()) return false;
        return this.startOfDayMs(d) === this.startOfDayMs(this.end);
    }

    isMultiDayContinuation(d) {
        if (!this.isMultiDay()) return false;
        if (this.isMultiDayEnd(d)) return false;
        if (this.isMultiDayPostSkip(d)) return false;
        return d > this.start;
    }

    isMultiDayPostSkip(d) {
        return this.canSkipWeekend() && d.getDay() === 1;
    }

    isMultiDayPreSkip(d) {
        return this.canSkipWeekend() && d.getDay() === 5;
    }

    * days() {
        let d = new Date(this.startOfDayMs(this.start));
        while (d <= this.end) {
            yield new Date(d);
            d.setDate(d.getDate() + 1);
        }
    }

    dayCount(asOf, year) {
        if (!this.isMultiDay()) return [1, 1];

        const d = new Date(this.startOfDayMs(this.start));
        let totalDays = 0;
        let elapsedDays = 0;
        while (d < this.end) {
            if (!(this.canSkipWeekend() && this.isWeekend(d))) {
                if (d <= asOf && (!year || d.getFullYear() === year)) elapsedDays++;
                if (!year || d.getFullYear() === year) totalDays++;
            }
            d.setDate(d.getDate() + 1);
        }
        return [elapsedDays, totalDays];
    }

    * match(pattern, limit) {
        let haystack = this.innerHTML;
        const markupStart = haystack.indexOf('<');
        if (markupStart > -1) haystack = haystack.slice(0, markupStart);
        const iterator = haystack.matchAll(pattern);
        for (let i=0; i < limit; i++) {
            const result = iterator.next();
            if (result.done) return;
            yield [i, result.value];
        }
    }

    parseDate() {
        if (this.parsedDate) return;
        for (const [i, match] of this.match(/(\d{4})-(\d{2})-(\d{2})\s*/g, 2)) {
            if (i > 0) {
                const wordsSinceLastMatch = this.innerHTML.slice(this.parsingIndex, match.index);
                if (wordsSinceLastMatch.indexOf('&lt;') > -1) continue;
            }
            this.captureParsingIndex(match);
            const [_, year, month, day] = match.map(x => Number.parseInt(x, 10));
            if (i === 0) {
                this.start = new Date(year, month - 1, day, 0, 0, 0, 0);
            }

            this.end = new Date(year, month - 1, day, 23, 59, 59, 999);

        }
        this.parsedDate = true;
    }

    parseTime() {
        if (this.parsedTime) return;
        if (!this.start) return;

        for (const [i, match] of this.match(/(\d{1,2}):(\d{1,2})\s*([AP]M)?\s*/gi, 2)) {
            if (i > 0) {
                const wordsSinceLastMatch = this.innerHTML.slice(this.parsingIndex, match.index)
                    .trim()
                    .split(/\s+/);
                if (wordsSinceLastMatch.length > 1) continue;
            }
            this.captureParsingIndex(match);

            let [hour, minute] = match.slice(1, 3).map(x => Number.parseInt(x, 10));
            hour += (hour < 12 && match[3] && match[3].toLowerCase() === 'pm') ? 12 : 0;

            if (this.start && i === 0) {
                this.start.setHours(hour);
                this.start.setMinutes(minute);
                this.startTime = [hour, minute];
            }

            this.end.setHours(hour);
            this.end.setMinutes(minute);
            this.end.setSeconds(0);
            this.end.setMilliseconds(0);
            this.endTime = [hour, minute];
        }
        this.parsedTime = true;
    }

    parseRepetition() {
        if (!this.start) return;

        let interval = this.dataset.repeat;
        if (!interval) return;

        this.repetition.since = this.start;

        interval = interval.toLowerCase().trim();
        interval = interval.replaceAll('every other week', 'biweekly');
        interval = interval.replaceAll('every other month', 'bimonthly');
        interval = interval.replaceAll('fortnightly', 'biweekly');

        const words = interval.replace(/[^\w- ]/g, ' ').split(/\s+/);

        const wordAfter = (word) => words.at(words.indexOf(word) + 1);

        const hasWord = (word) => words.indexOf(word.toLowerCase()) > -1;

        const includeDay = (index) => {
            if (!this.repetition.days) this.repetition.days = new Set();
            this.repetition.days.add(index);
        };

        const includeMonth = (index) => {
            if (!this.repetition.months) this.repetition.months = new Set();
            this.repetition.months.add(index);
        }

        for (const [index, dayOfWeek] of this.daysOfWeek('long').entries()) {
            if (hasWord(dayOfWeek)) includeDay(index);
        }

        for (const [index, dayOfWeek] of this.daysOfWeek('short').entries()) {
            if (hasWord(dayOfWeek)) includeDay(index);
        }

        if (hasWord('daily') && !this.repetition.days) {
            for (let i = 0; i < 7; i++) includeDay(i);
        }

        if (hasWord('weekly') && !this.repetition.days) {
            includeDay(this.start.getDay());
            this.repetition.dayStep = 7;
        }

        if (hasWord('biweekly') && !this.repetition.days) {
            includeDay(this.start.getDay());
            this.repetition.dayStep = 14;
        }

        if (hasWord('weekdays') && !this.repetition.days) {
            for (let i = 1; i < 6; i++) includeDay(i);
        }

        for (const [index, monthOfYear] of this.monthsOfYear('long').entries()) {
            if (hasWord(monthOfYear)) includeMonth(index);
        }

        for (const [index, monthOfYear] of this.monthsOfYear('short').entries()) {
            if (hasWord(monthOfYear)) includeMonth(index);
        }

        if (hasWord('monthly') && !this.repetition.months) {
            this.repetition.date = this.start.getDate();
            for (let i = 0; i < 12; i++) includeMonth(i);
        }

        if (hasWord('bimonthly') && !this.repetition.months) {
            this.repetition.date = this.start.getDate();
            const start = (this.start.getMonth() + 1) % 2 === 0 ? 1: 0;
            for (let i = start; i < 12; i += 2) includeMonth(i);
        }

        if (interval === 'yearly' && !this.repetition.months) {
            this.repetition.date = this.start.getDate();
            includeMonth(this.start.getMonth());
        }

        if (hasWord('until')) {
            const cutoff = wordAfter('until');
            if (cutoff) {
                this.repetition.until = new Date(`${cutoff}T00:00:00`);
            }
        }

        if (hasWord('first')) this.repetition.ordinal = 1;
        if (hasWord('second')) this.repetition.ordinal = 2;
        if (hasWord('third')) this.repetition.ordinal = 3;
        if (hasWord('fourth')) this.repetition.ordinal = 4;
        if (hasWord('fifth')) this.repetition.ordinal = 5;
        if (hasWord('sixth')) this.repetition.ordinal = 6;
        if (hasWord('last')) this.repetition.ordinal = -1;
    }

    captureParsingIndex(match) {
        this.parsingIndex = Math.max(this.parsingIndex, match.index + match[0].length);
    }

    occursOn(d) {
        if (!this.start) return false;
        if (d.getTime() < this.startOfDayMs(this.start)) return false;
        if (d.getTime() > this.endOfDayMs(this.end)) return false;
        return true;
    }

    previousOccurrence(asOfDate) {
        return this.occurrenceByTag(asOfDate, -1).concat(this.occurrenceBySequence(asOfDate, -1));
    }

    nextOccurrence(asOfDate) {
        return this.occurrenceByTag(asOfDate, 1).concat(this.occurrenceBySequence(asOfDate, 1));
    }

    occurrenceByTag(asOfDate, step) {
        for (const tag of this.tags()) {
            let matches = [];
            for (const node of document.querySelectorAll(this.tagSelector(tag))) {
                for (const day of node.days()) {
                    if (this.canSkipWeekend && this.isWeekend(day)) continue;
                    if (this.ymd(day) === this.ymd(asOfDate)) continue;
                    if (step === 1 && day < asOfDate) continue;
                    if (step === -1 && day > asOfDate) continue;
                    matches.push(day);
                }
            }

            matches.sort((a, b) => (step === 1) ? a - b : b - a);

            return [[matches[0], tag]];
        }

        return [];
    }

    occurrenceBySequence(asOfDate, step) {
        if (!this.repetition) return [];
        if (!this.repetition.since) return [];

        const d = new Date(asOfDate ? asOfDate : this.start);
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);

        if (this.repetition.dayStep) {
            d.setDate(d.getDate() + this.repetition.dayStep * step);
            if (this.repeatsOn(d)) return [[d]];
            return [];
        }

        for (let i = 0; i <= 365; i++) {
            d.setDate(d.getDate() + 1 * step);
            if (this.repeatsOn(d)) return [[d]];
        }

        return [];
    }

    repetitionCount(d) {
        if (!('count' in this.dataset)) return 0;
        if (!this.repeatsOn(d)) return 0;
        let day = new Date(this.start);
        let counter = 1;

        while (day < d) {
            counter++;
            const nextOccurrence = this.occurrenceBySequence(day, 1);
            const daysAway = this.daysBetweenDates(day, nextOccurrence[0][0]);
            day.setDate(day.getDate() + daysAway);
        }

        return counter;
    }

    repeatsOn(d) {
        if (!this.repetition) return false;
        if (!this.repetition.since) return false;
        if (d < this.start) return false;
        const date = this.repetition.date;
        const days = this.repetition.days || null;
        const months = this.repetition.months || null;
        const ordinal = this.repetition.ordinal || null;
        const until = this.repetition.until || null;
        const dayStep = this.repetition.dayStep || 0;
        //const monthRestriction = this.repetition.monthRestriction || ((x) => true);

        if (until && d > until) return false;
        if (date && date !== d.getDate()) return false;
        if (days && !days.has(d.getDay())) return false;
        if (months && !months.has(d.getMonth())) return false;
        if (ordinal && days) {
            const between = (value, min, max) => value >= min && value <= max;
            if (ordinal === 1 && !between(d.getDate(), 1, 7)) return false;
            if (ordinal === 2 && !between(d.getDate(), 8, 14)) return false;
            if (ordinal === 3 && !between(d.getDate(), 15, 21)) return false;
            if (ordinal === 4 && !between(d.getDate(), 22, 28)) return false;
            if (ordinal === 5 && !between(d.getDate(), 29, 31)) return false;
            if (ordinal === -1 && !between(d.getDate(), 25, 31)) return false;
        }

        if (dayStep > 0) {
            const matchDate = new Date(d);
            while (true) {
                if (matchDate < this.repetition.since) return false;
                if (matchDate.getTime() === this.repetition.since.getTime()) break;
                matchDate.setDate(matchDate.getDate() - dayStep);
            }
        }

        return true;
    }

    shortLine(locale) {
        let result = '';

        if (this.hasStartTime()) {
            const t = document.createElement('time');
            t.innerHTML = this.start.toLocaleString(locale, {hour: 'numeric', minute: 'numeric'});
            result += `${t.outerHTML} `;
        }

        return result + this.description;
    }
}

document.addEventListener('touchstart', (e) => {
    if (e.target.nodeName === 'A') return;
    if (e.touches && e.touches.length > 1) return;
    if (!e.changedTouches || e.changedTouches.length !== 1) return;

    document.body.querySelector('.view[date]')
        .dispatchEvent(new CustomEvent('swipe', {
            detail: {
                type: e.type,
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            }
        }));
});

document.addEventListener('touchend', (e) => {
    if (e.target.nodeName === 'A') return;
    if (e.touches && e.touches.length > 0) return;
    if (!e.changedTouches || e.changedTouches.length !== 1) return;

    document.body.querySelector('.view[date]')
        .dispatchEvent(new CustomEvent('swipe', {
            detail: {
                type: e.type,
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            }
        }));
});

window.addEventListener('keypress', (e) => {
    let event;
    let to;
    if (e.key === 'n') to = 'next';
    if (e.key === 'p') to = 'previous';
    if (e.key === 't') to = 'today';
    if (e.key === 'd') to = 'day';
    if (e.key === 'm') to = 'month';
    if (e.key === 'y') to = 'year';
    if (e.key === 'g') event = new CustomEvent('jump');
    if (to) event = new CustomEvent('step', {detail: {to: to}});
    if (event) document.body.querySelector('.view[date]').dispatchEvent(event);
});

window.addEventListener('click', (e) => {
    if (e.target.nodeName === 'A') e.target.blur();

    const stepTo = (keyword) => {
        const event = new CustomEvent('step', {detail: {to: keyword}});
        document.body.querySelector('.view[date]').dispatchEvent(event);
    }

    if (e.target.matches('.nav.next')) {
        e.preventDefault();
        stepTo('next');
    }

    if (e.target.matches('.nav.today')) {
        e.preventDefault();
        stepTo('today');
    }

    if (e.target.matches('.nav.jump')) {
        e.preventDefault();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('jump'));
    }

    if (e.target.matches('.nav.previous')) {
        e.preventDefault();
        stepTo('previous');
    }

    if (e.target.matches('.nav.toggle')) {
        e.preventDefault();
        e.target.parentElement.classList.toggle('open');
    }
});

window.addEventListener('hashchange', (e) => {
    let dest = window.location.hash.replace('#', '');
    if (!dest) {
        const meta = document.head.querySelector('META[name=start]');
        if (meta) dest = meta.content;
    }
    const [year, month, day] = dest.split('-').map(x => Number.parseInt(x, 10));

    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);

    let view = CalendarMonth;

    if (year) {
        d.setFullYear(year);
        d.setMonth(0);
        d.setDate(1);
        view = CalendarYear;
    }

    if (year && month) {
        d.setMonth(month - 1);
        view = CalendarMonth;
    }

    if (year && month && day) {
        d.setDate(day);
        view = CalendarDay;
    }

    document.body.querySelector('.view[date]').removeAttribute('date');
    document.body.querySelector(view.tag).setAttribute('date', d);
});

window.addEventListener('DOMContentLoaded', (e) => {
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    const config = {
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        name: '',
        version: '',
        appVersion: '!dev!',
        start: today,
        defaultView: CalendarMonth,
    };

    for (const meta of document.head.querySelectorAll('meta')) {
        if (!meta.content) continue;

        switch (meta.name) {
        case 'begin':
            config[meta.name] = new Date(`${meta.content}T00:00:00`);
            break;
        case 'end':
            config[meta.name] = new Date(`${meta.content}T00:00:00`);
            break;
        default:
            config[meta.name] = meta.content;
        }
    }

    const hashDate = window.location.hash.replace('#', '');
    if (hashDate) {
        config.start = hashDate;
    }

    if (typeof config.start === 'string') {
        let start;
        const [y, m, d] = config.start.split('-').map(x => Number.parseInt(x, 10));
        if (Number.isInteger(y)) {
            start = new Date(today);
            start.setFullYear(y);
            start.setMonth(0);
            start.setDate(1);
            config.defaultView = CalendarYear;
        }

        if (Number.isInteger(m)) {
            start.setMonth(m - 1);
            config.defaultView = CalendarMonth;
        }

        if (Number.isInteger(d)) {
            start.setDate(d);
            config.defaultView = CalendarDay;
        }

        if (!start && window.Intl.RelativeTimeFormat) {
            start = new Date(today);
            const rtf = new window.Intl.RelativeTimeFormat(config.locale, { numeric: "auto" });
            const format = (quantity, unit) => rtf.format(quantity, unit).replace(' ', '-');

            if (config.start === format(0, 'day')) {
                config.defaultView = CalendarDay;
            }

            if (config.start === format(-1, 'day')) {
                start.setDate(start.getDate() - 1);
                config.defaultView = CalendarDay;
            }

            if (config.start === format(1, 'day')) {
                start.setDate(start.getDate() + 1);
                config.defaultView = CalendarDay;
            }

            if (config.start === format(0, 'month')) {
                start.setDate(1);
                config.defaultView = CalendarMonth;
            }

            if (config.start === format(-1, 'month')) {
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                config.defaultView = CalendarMonth;
            }

            if (config.start === format(1, 'month')) {
                start.setMonth(start.getMonth() + 1);
                start.setDate(1);
                config.defaultView = CalendarMonth;
            }

            if (config.start === format(0, 'year')) {
                start.setMonth(0);
                start.setDate(1);
                config.defaultView = CalendarYear;
            }

            if (config.start === format(-1, 'year')) {
                start.setFullYear(start.getFullYear() - 1);
                start.setMonth(0);
                start.setDate(1);
                config.defaultView = CalendarYear;
            }

            if (config.start === format(1, 'year')) {
                start.setFullYear(start.getFullYear() + 1);
                start.setMonth(0);
                start.setDate(1);
                config.defaultView = CalendarYear;
            }
        }

        config.start = start;

    }

    if (config.start < config.begin) config.start = config.begin;
    if (config.start > config.end) config.start = config.end;

    const svg = document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.innerHTML = `<defs>
    <symbol class="default-icon" id="arrow-left" data-original-id="ph--arrow-left-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M228 128a12 12 0 0 1-12 12H69l51.52 51.51a12 12 0 0 1-17 17l-72-72a12 12 0 0 1 0-17l72-72a12 12 0 0 1 17 17L69 116h147a12 12 0 0 1 12 12"/></symbol>
    <symbol class="default-icon" id="arrow-right" data-original-id="ph--arrow-right-bold" viewBox="0 0 256 256"><path fill="currentColor" d="m224.49 136.49l-72 72a12 12 0 0 1-17-17L187 140H40a12 12 0 0 1 0-24h147l-51.49-51.52a12 12 0 0 1 17-17l72 72a12 12 0 0 1-.02 17.01"/></symbol>
    <symbol class="default-icon" id="arrow-down" data-original-id="ph--arrow-down-bold" viewBox="0 0 256 256"><path fill="currentColor" d="m208.49 152.49l-72 72a12 12 0 0 1-17 0l-72-72a12 12 0 0 1 17-17L116 187V40a12 12 0 0 1 24 0v147l51.51-51.52a12 12 0 0 1 17 17Z"/></symbol>
    <symbol class="default-icon" id="calendar" data-original-id="ph--calendar-dot-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M148 152a20 20 0 1 1-20-20a20 20 0 0 1 20 20m80-104v160a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20V48a20 20 0 0 1 20-20h20v-4a12 12 0 0 1 24 0v4h72v-4a12 12 0 0 1 24 0v4h20a20 20 0 0 1 20 20M52 52v24h152V52h-16a12 12 0 0 1-24 0H92a12 12 0 0 1-24 0Zm152 152V100H52v104Z"/></symbol>
    <symbol class="default-icon" id="compass" data-original-id="ph--compass-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M128 20a108 108 0 1 0 108 108A108.12 108.12 0 0 0 128 20m0 192a84 84 0 1 1 84-84a84.09 84.09 0 0 1-84 84m35.27-135l-56 24a12 12 0 0 0-6.3 6.3l-24 56A12 12 0 0 0 92.73 179l56-24a12 12 0 0 0 6.3-6.3l24-56A12 12 0 0 0 163.27 77m-28.41 57.89l-24 10.29l10.29-24l24-10.29Z"/></symbol>
    <symbol class="default-icon" id="chevron-up" data-original-id="ph--caret-up-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M216.49 168.49a12 12 0 0 1-17 0L128 97l-71.51 71.49a12 12 0 0 1-17-17l80-80a12 12 0 0 1 17 0l80 80a12 12 0 0 1 0 17"/></symbol>
    <symbol class="default-icon" id="chevron-down" data-original-id="ph--caret-down-bold" viewBox="0 0 256 256"><path fill="currentColor" d="m216.49 104.49l-80 80a12 12 0 0 1-17 0l-80-80a12 12 0 0 1 17-17L128 159l71.51-71.52a12 12 0 0 1 17 17Z"/></symbol>
    <symbol class="default-icon" id="repeat" data-original-id="ph--repeat-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M20 128a76.08 76.08 0 0 1 76-76h99l-3.52-3.51a12 12 0 1 1 17-17l24 24a12 12 0 0 1 0 17l-24 24a12 12 0 0 1-17-17L195 76H96a52.06 52.06 0 0 0-52 52a12 12 0 0 1-24 0m204-12a12 12 0 0 0-12 12a52.06 52.06 0 0 1-52 52H61l3.52-3.51a12 12 0 1 0-17-17l-24 24a12 12 0 0 0 0 17l24 24a12 12 0 1 0 17-17L61 204h99a76.08 76.08 0 0 0 76-76a12 12 0 0 0-12-12"/></symbol>
    <symbol class="default-icon" id="icon-sunrise" data-original-id="ph--sun-horizon-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M240 148h-36.11c.07-1.33.11-2.66.11-4a76 76 0 0 0-152 0c0 1.34 0 2.67.11 4H16a12 12 0 0 0 0 24h224a12 12 0 0 0 0-24m-164-4a52 52 0 0 1 104 0c0 1.34-.07 2.67-.17 4H76.17c-.1-1.33-.17-2.66-.17-4m144 56a12 12 0 0 1-12 12H48a12 12 0 0 1 0-24h160a12 12 0 0 1 12 12M12.62 92.21a12 12 0 0 1 15.17-7.59l12 4a12 12 0 1 1-7.58 22.77l-12-4a12 12 0 0 1-7.59-15.18m56-48.41a12 12 0 1 1 22.76-7.59l4 12a12 12 0 1 1-22.76 7.59Zm140 60a12 12 0 0 1 7.59-15.18l12-4a12 12 0 0 1 7.58 22.77l-12 4a12 12 0 0 1-15.17-7.59m-48-55.59l4-12a12 12 0 1 1 22.76 7.59l-4 12a12 12 0 1 1-22.76-7.59"/></symbol>
    <symbol class="default-icon" id="icon-sunset" data-original-id="ph--sun-horizon-fill" viewBox="0 0 256 256"><path fill="currentColor" d="M248 160a8 8 0 0 1-8 8H16a8 8 0 0 1 0-16h40.45a74 74 0 0 1-.45-8a72 72 0 0 1 144 0a74 74 0 0 1-.45 8H240a8 8 0 0 1 8 8m-40 32H48a8 8 0 0 0 0 16h160a8 8 0 0 0 0-16M80.84 59.58a8 8 0 0 0 14.32-7.16l-8-16a8 8 0 0 0-14.32 7.16Zm-60.42 43.58l16 8a8 8 0 1 0 7.16-14.31l-16-8a8 8 0 1 0-7.16 14.31M216 112a8 8 0 0 0 3.57-.84l16-8a8 8 0 1 0-7.16-14.31l-16 8A8 8 0 0 0 216 112m-51.58-48.84a8 8 0 0 0 10.74-3.58l8-16a8 8 0 0 0-14.32-7.16l-8 16a8 8 0 0 0 3.58 10.74"/></symbol>
    <symbol class="default-icon" id="icon-sun" data-original-id="ph--sun-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M116 36V20a12 12 0 0 1 24 0v16a12 12 0 0 1-24 0m80 92a68 68 0 1 1-68-68a68.07 68.07 0 0 1 68 68m-24 0a44 44 0 1 0-44 44a44.05 44.05 0 0 0 44-44M51.51 68.49a12 12 0 1 0 17-17l-12-12a12 12 0 0 0-17 17Zm0 119l-12 12a12 12 0 0 0 17 17l12-12a12 12 0 1 0-17-17M196 72a12 12 0 0 0 8.49-3.51l12-12a12 12 0 0 0-17-17l-12 12A12 12 0 0 0 196 72m8.49 115.51a12 12 0 0 0-17 17l12 12a12 12 0 0 0 17-17ZM48 128a12 12 0 0 0-12-12H20a12 12 0 0 0 0 24h16a12 12 0 0 0 12-12m80 80a12 12 0 0 0-12 12v16a12 12 0 0 0 24 0v-16a12 12 0 0 0-12-12m108-92h-16a12 12 0 0 0 0 24h16a12 12 0 0 0 0-24"/></symbol>
    <symbol class="default-icon" id="calendar-dot" data-original-id="ph--calendar-dot-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M148 152a20 20 0 1 1-20-20a20 20 0 0 1 20 20m80-104v160a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20V48a20 20 0 0 1 20-20h20v-4a12 12 0 0 1 24 0v4h72v-4a12 12 0 0 1 24 0v4h20a20 20 0 0 1 20 20M52 52v24h152V52h-16a12 12 0 0 1-24 0H92a12 12 0 0 1-24 0Zm152 152V100H52v104Z"/></symbol>
    <symbol class="default-icon" id="calendar-x" data-original-id="ph--calendar-x-bold" viewBox="0 0 256 256"><path fill="currentColor" d="M160.49 136.49L145 152l15.52 15.51a12 12 0 0 1-17 17L128 169l-15.51 15.52a12 12 0 0 1-17-17L111 152l-15.49-15.51a12 12 0 1 1 17-17L128 135l15.51-15.52a12 12 0 1 1 17 17ZM228 48v160a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20V48a20 20 0 0 1 20-20h20v-4a12 12 0 0 1 24 0v4h72v-4a12 12 0 0 1 24 0v4h20a20 20 0 0 1 20 20M52 52v24h152V52h-16a12 12 0 0 1-24 0H92a12 12 0 0 1-24 0Zm152 152V100H52v104Z"/></symbol>
    <symbol class="default-icon" id="tag" data-original-id="ph--tag-chevron-duotone" viewBox="0 0 256 256"><g fill="currentColor"><path d="m240 128l-45.62 68.44a8 8 0 0 1-6.66 3.56H32l48-72l-48-72h155.72a8 8 0 0 1 6.66 3.56Z" opacity="0.2"/><path d="M246.66 123.56L201 55.12A16 16 0 0 0 187.72 48H32a8 8 0 0 0-6.66 12.44L70.39 128l-45 67.56A8 8 0 0 0 32 208h155.72a16 16 0 0 0 13.28-7.12l45.63-68.44a8 8 0 0 0 .03-8.88M187.72 192H47l39.71-59.56a8 8 0 0 0 0-8.88L47 64h140.72l42.67 64Z"/></g></symbol>
    </defs>`;

    const appVersionMeta = document.head.appendChild(document.createElement('META'));
    appVersionMeta.name = 'app-version';
    appVersionMeta.content = config.appVersion;

    const cache = new CalendarCache(window.sessionStorage, config.version);

    for (const viewClass of [CalendarMonth, CalendarYear, CalendarDay]) {
        for (const node of document.body.querySelectorAll(viewClass.tag)) node.remove();
        const view = document.body.appendChild(new viewClass(cache, config));
        if (viewClass === config.defaultView) view.setAttribute('date', config.start);
    }


    const clockCallback = () => {
        document.body.querySelector('.view[date]')
            .dispatchEvent(new CustomEvent('clock'));
    }

    clockCallback();
    window.setInterval(clockCallback, 5000);
    document.documentElement.classList.add('loaded');
});

if (!window.customElements || !window.customElements.define) {
    alert('Cannot display the calendar in this browser.');
} else {
    customElements.define(CalendarMonth.tag, CalendarMonth);
    customElements.define(CalendarDay.tag, CalendarDay);
    customElements.define(CalendarYear.tag, CalendarYear);
    customElements.define(CalendarEvent.tag, CalendarEvent);
}
