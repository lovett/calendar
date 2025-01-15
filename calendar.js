class CalendarCache {
    constructor() {
        this.cache = new Map();
        this.cache.set('noevent', 'No events.');
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key, callback) {
        if (!this.cache.has(key)) this.cache.set(key, callback());
        return this.cache.get(key);
    }
}

class CalendarBase extends HTMLElement {
    isToday(d) {
        if (d.getFullYear() !== this.now.getFullYear()) return false;
        if (d.getMonth() !== this.now.getMonth()) return false;
        if (d.getDate() !== this.now.getDate()) return false;
        return true;
    }

    isLastDayOfMonth(date) {
        return this.nextDay(date).getMonth() !== date.getMonth();
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
}

class CalendarView extends CalendarBase {
    static get observedAttributes() { return ['date']; }

    constructor() {
        super();
        this.cache = null;
        this.classList.add('view');
        this.titleLinks = [];
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
        this.swipe = [0, 0];
        this.addEventListener('step', this);
        this.addEventListener('swipe', this);
    }

    connectedCallback() {
        this.renderShell();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'date' && newValue) {
            this.date = new Date(newValue);
            if (!this.defaultDate) this.defaultDate = this.date;
            this.render();
            this.populateTitle();
        }
    }

    handleEvent(e) {
        if (e.type === 'swipe' && e.detail.type === 'touchstart') {
            this.swipe = [e.detail.x, e.detail.y];
        }

        if (e.type === 'swipe' && e.detail.type === 'touchend') {
            const xDelta = e.detail.x - this.swipe[0];
            const yDelta = e.detail.y - this.swipe[1];
            const step = new CustomEvent('step', {detail: {to: null}});

            if (Math.abs(xDelta) < Math.abs(yDelta)) {
                if (yDelta < 0) step.detail.to = 'today';
            } else {
                if (xDelta > 0) step.detail.to = 'next';
                if (xDelta < 0) step.detail.to = 'previous';
            }

            if (step.detail.to) this.dispatchEvent(step);
            this.swipe = [0, 0];
        }

        if (e.type === 'step' && e.detail.to === 'today') {
            window.location.hash = this.hasher(this.now);
        }

        if (e.type === 'step' && e.detail.to === 'next') {
            window.location.hash = this.hasher(this.next);
        }

        if (e.type === 'step' && e.detail.to === 'previous') {
            window.location.hash = this.hasher(this.previous);
        }
    }

    get dayNames() {
        return this.cache.get('day-names', () => {
            const d = new Date(this.now.getTime());
            d.setDate(d.getDate() - d.getDay() - 1);

            const names = new Array(7);
            for (let i = 0; i < names.length; i++) {
                d.setDate(d.getDate() + 1);
                names[i] = d.toLocaleString(this.locale, {weekday: 'short'});
            }
            return names;
        });
    }

    get now() {
        return this.cache.get('now', () => new Date());
    }

    eventFinder(start, end) {
        const selectors = new Set();
        const d = new Date(start);
        while (d <= (end || start)) {
            selectors.add(`c-e[during*="${this.ym(d)}"]`);
            d.setDate(d.getDate() + 1);
        }

        let query = '';
        for (const selector of selectors.values()) {
            query += `${selector},`;
        }
        query = query.slice(0, -1);

        return this.cache.get(query, () => {
            return Array.from(document.querySelectorAll(query)).sort((a, b) => {
                a.parseTime();
                b.parseTime();
                if (a.start < b.start) return -1;
                if (a.start > b.start) return 1;
                return 0;
            });
        })
    }

    populateTitle() {
        const h1 = this.querySelector('.navigator h1');
        h1.textContent = this.date.toLocaleString(this.locale, this.titleFormat);
        document.title = h1.textContent;

        if (this.titleLinks.indexOf('year') > -1) {
            const year = document.createElement('a');
            year.href = '#';
            year.hash = this.date.getFullYear();
            year.textContent = this.date.toLocaleString(this.locale, { year: 'numeric' });
            h1.innerHTML = h1.innerHTML.replace(year.textContent, year.outerHTML);
        }

        if (this.titleLinks.indexOf('month') > -1) {
            const month = document.createElement('a');
            month.href = '#';
            month.hash = this.ym(this.date);
            month.textContent = this.date.toLocaleString(this.locale, {month: 'long'});
            h1.innerHTML  = h1.innerHTML.replace(month.textContent, month.outerHTML);
        }
    }

    renderIcon(parent, id) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
        svg.appendChild(use);
        parent.appendChild(svg);
    }

    renderShell() {
        this.innerHTML = `
        <header class="navigator">
            <h1></h1>
            <div class="subtitle"></div>
            <a href="#previous" class="nav previous"><svg class="icon"><use xlink:href="#arrow-left" /></svg></a>
            <a href="#next" class="nav next"><svg class="icon"><use xlink:href="#arrow-right" /></svg></a>
            <a href="#today" class="nav today"><svg class="icon"><use xlink:href="#reset" /></svg></a>
            <a href="#" class="nav toggle">
                <svg class="icon"><use class="up" xlink:href="#chevron-up" />
                <svg class="icon"><use class="down" xlink:href="#chevron-down" />
            </svg>
            </a>
            <div class="panel" hidden>
                <a href="#today" class="nav"><svg class="icon"><use xlink:href="#reset" /></svg></a>
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
    constructor(cache) {
        super();
        this.cache = cache;
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

    titleLinker(node) {
        return node;
    }

    render() {
        this.removeAll('.month');

        const fragment = document.createDocumentFragment();
        const d = this.previousDay(this.date);
        for (let i = 0; i <= 365; i++) {
            d.setDate(d.getDate() + 1);
            if (d.getFullYear() > this.date.getFullYear()) break;

            if (d.getDate() === 1) {
                const month = fragment.appendChild(document.createElement('div'));
                month.className = 'month';
                const title = month.appendChild(document.createElement('h2'));
                const link = title.appendChild(document.createElement('a'));
                link.href = '#';
                link.hash = this.ym(d);
                link.innerText = d.toLocaleString(this.locale, {month: 'long'});

                for (const day of this.dayNames) {
                    const div = document.createElement('div');
                    div.className = 'day-of-week';
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
    }

    renderDay(parent, d, ...classes) {
        const container = parent.appendChild(document.createElement('div'));
        container.classList.add(...['day'].concat(classes));

        const lining = container.appendChild(document.createElement('div'))
        lining.classList.add('lining');

        const tag = (this.hasEvents(d))? 'a' : 'div';
        const dayNumber = lining.appendChild(document.createElement(tag));
        if (tag === 'a') {
            dayNumber.href = '#';
            dayNumber.hash = this.ymd(d);
        }
        dayNumber.innerText = d.getDate();
        dayNumber.classList.add('day-number');
        if (this.isToday(d)) dayNumber.classList.add('today');
        if (this.hasEvents(d)) dayNumber.classList.add('has-events');
    }

    hasEvents(d) {
        for (const event of this.eventFinder(d)) {
            if (d.getTime() < this.startOfDayMs(event.start)) continue;
            if (d.getTime() > this.endOfDayMs(event.end)) continue;
            return true;
        }
        return false;
    }
}

class CalendarMonth extends CalendarView {
    constructor(cache) {
        super();
        this.cache = cache;
        this.titleLinks = ['year'];
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

    titleLinker(node) {

    }

    render() {
        this.removeAll('.day');

        const firstDay = new Date(this.date);
        firstDay.setDate(1 - firstDay.getDay());

        const lastDay = new Date(this.date);
        lastDay.setMonth(lastDay.getMonth() + 1);
        lastDay.setDate(lastDay.getDate() - 1);
        lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

        const events = this.eventFinder(firstDay, lastDay);

        const fragment = document.createDocumentFragment();

        if (!this.querySelector('.day-of-week')) {
            for (const day of this.dayNames) {
                const div = document.createElement('div');
                div.className = 'day-of-week';
                div.innerText = day;
                fragment.append(div);
            }
        }

        const d = new Date(firstDay);
        while (d <= lastDay) {
            const eventSubset = [];
            for (const event of events) {
                if (event.occursOn(d)) eventSubset.push(event);
            }

            const day = fragment.appendChild(document.createElement('div'));
            day.classList.add('day');
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
        div.innerText = events.length;
        this.renderIcon(div, 'bookmark');
    }

    renderEvents(parent, events, d) {
        for (const event of events) {
            event.parseTime();
            const div = document.createElement('div');

            if (event.hasAttribute('style')) {
                div.setAttribute('style', event.getAttribute('style'));
            }

            div.classList.add('event', ...event.classList(d));

            if (event.isMultiDayStart(d)) this.renderIcon(div, 'star');
            if (event.isAllDay()) this.renderIcon(div, 'zap');
            if (event.isMultiDayEnd(d)) this.renderIcon(div, 'arrow-down');
            if (event.isMultiDayContinuation(d)) this.renderIcon(div, 'arrow-right');
            if (!event.isMultiDay() || event.isMultiDayStart(d)) div.innerHTML += event.shortLine();

            parent.appendChild(div);
        }
    }

    renderDayNumber(parent, d, hasEvents = false) {
        const today = this.ymd(this.now);
        const tag = (hasEvents)? 'a' : 'div';
        const dayNumber = parent.appendChild(document.createElement(tag));
        if (tag === 'a') {
            dayNumber.href = '#';
            dayNumber.hash = this.ymd(d);
        }

        dayNumber.classList.add('day-number');

        if (this.isToday(d)) {
            dayNumber.classList.add('today');
        }

        let label = '';
        if (d.getDate() === 1) {
            label = d.toLocaleString(this.locale, {month: 'short'});
            label += ' ';
        }

        dayNumber.innerText = label + d.getDate();
    }
}

class CalendarDay extends CalendarView {
    constructor(cache) {
        super();
        this.cache = cache;
        this.titleLinks = ['year', 'month'];
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

    render() {
        let counter = 0;
        this.removeAll('.event');

        const day = this.date.toLocaleString(this.locale, {weekday: 'long'});
        this.querySelector('.navigator .subtitle').innerText = day;

        for (const event of this.eventFinder(this.date)) {
            if (!event.occursOn(this.date)) continue;
            counter++;
            const container = this.appendChild(document.createElement('div'));
            container.classList.add('event', ...event.classList(this.date));

            const time = container.appendChild(document.createElement('time'));
            if (event.hasStartTime()) {
                const div = time.appendChild(document.createElement('div'));
                div.innerText = event.start.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'});
            }

            if (event.hasEndTime()) {
                this.renderIcon(time, 'arrow-down');
                const div = time.appendChild(document.createElement('div'));
                div.innerText = event.end.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'});
            }

            if (event.isMultiDay()) this.renderIcon(time, 'star');
            if (event.isAllDay()) this.renderIcon(time, 'zap');

            const h2 = container.appendChild(document.createElement('h2'));
            h2.innerHTML = event.description;

            container.appendChild(event.details);
        }

        if (counter === 0) {
            const container = this.appendChild(document.createElement('div'));
            container.classList.add('event', 'empty');
            const time = container.appendChild(document.createElement('time'));
            this.renderIcon(time, 'slash');
            const h2 = container.appendChild(document.createElement('h2'));
            h2.innerHTML = this.cache.get('noevent');
        }
    }
}

class CalendarEvent extends CalendarBase {
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
    }

    connectedCallback() {
        this.parseDate();
        const set = new Set();
        set.add(this.ym(this.start));
        set.add(this.ym(this.end));
        this.setAttribute('during', Array.from(set.values()).join(' '));
    }

    classList(d) {
        const candidates = [
            'all-day', this.isAllDay(),
            'multi-day', this.isMultiDay(),
            'multi-day-start', this.isMultiDayStart(d),
            'multi-day-continuation', this.isMultiDayContinuation(d),
            'multi-day-end', this.isMultiDayEnd(d),
            this.className, this.hasAttribute('class'),
        ];

        const classes = [];
        for (let i=0; i < candidates.length; i = i + 2) {
            if (candidates[i+1]) {
                classes.push(candidates[i]);
            }
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
        if (details) return details.cloneNode(true);
        return document.createTextNode('');
    }

    hasStartTime() {
        const [h, m] = this.startTime;
        return h > 0 || m > 0;
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

    isMultiDay() {
        if (!this.start) return false;
        if (this.start.getMonth() !== this.end.getMonth()) return true;
        if (this.start.getDay() !== this.end.getDay()) return true;
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
        return d > this.start;
    }

    * match(pattern, limit) {
        const iterator = this.innerHTML.matchAll(pattern);
        for (let i=0; i < limit; i++) {
            const result = iterator.next();
            if (result.done) return;
            yield [i, result.value];
        }
    }

    parseDate() {
        if (this.parsedDate) return;
        for (const [i, match] of this.match(/(\d{4})-(\d{2})-(\d{2})\W*/g, 2)) {
            this.captureParsingIndex(match);
            const [_, year, month, day] = match.map(x => Number.parseInt(x, 10));
            if (i === 0) {
                this.start = new Date(year, month - 1, day, 0, 0, 0);
            }
            this.end = new Date(year, month - 1, day, 23, 59, 59);
        }
        this.parsedDate = true;
    }

    parseTime() {
        if (this.parsedTime) return;
        if (!this.start) return;

        for (const [i, match] of this.match(/(\d{1,2}):(\d{1,2})\s*([AP]M)?\s*/g, 2)) {
            this.captureParsingIndex(match);
            let [hour, minute] = match.slice(1, 3).map(x => Number.parseInt(x, 10));
            hour += (match[3].toLowerCase() === 'pm') ? 12 : 0;

            if (this.start && i === 0) {
                this.start.setHours(hour);
                this.start.setMinutes(minute);
                this.startTime = [hour, minute];
            }

            if (this.end) {
                this.end.setHours(hour);
                this.end.setMinutes(minute);
                this.endTime = [hour, minute];
            }
        }
        this.parsedTime = true;
    }

    captureParsingIndex(match) {
        this.parsingIndex = Math.max(this.parsingIndex, match.index + match[0].length);
    }

    toString() {
        return this.start.toLocaleString(this.locale, {timeStyle: 'short'});
    }

    occursOn(d) {
        if (!this.start) return false;
        if (d.getTime() < this.startOfDayMs(this.start)) return false;
        if (d.getTime() > this.endOfDayMs(this.end)) return false;
        return true;
    }

    shortLine() {
        let result = '';

        if (this.hasStartTime()) {
            result = this.start.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'});
            result += ' ';
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
    if (e.key === 'n') {
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'next'}}));
    }
    if (e.key === 'p') {
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'previous'}}));
    }

    if (e.key === 't') {
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'today'}}));
    }
});

window.addEventListener('click', (e) => {
    if (e.target.nodeName === 'A') e.target.blur();

    if (e.target.matches('A.next')) {
        e.preventDefault();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'next'}}));
    }

    if (e.target.matches('A.today')) {
        e.preventDefault();
        this.blur();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'today'}}));
    }


    if (e.target.matches('A.previous')) {
        e.preventDefault();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'previous'}}));
    }

    if (e.target.matches('A.toggle')) {
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

    let tag = 'c-m';

    if (year) {
        d.setFullYear(year);
        d.setMonth(0);
        d.setDate(1);
        tag = 'c-y';
    }

    if (year && month) {
        d.setMonth(month - 1);
        tag = 'c-m';
    }

    if (year && month && day) {
        d.setDate(day);
        tag = 'c-d';
    }

    document.body.querySelector('.view[date]').removeAttribute('date');
    document.body.querySelector(tag).setAttribute('date', d);
});

window.addEventListener('DOMContentLoaded', (e) => {
    customElements.define("c-m", CalendarMonth);
    customElements.define("c-y", CalendarYear);
    customElements.define("c-d", CalendarDay);
    customElements.define("c-e", CalendarEvent);

    let defaultView = CalendarMonth;

    const defaultDate = new Date();
    defaultDate.setHours(0);
    defaultDate.setMinutes(0);
    defaultDate.setSeconds(0);
    defaultDate.setMilliseconds(0);

    let startDate = window.location.hash.replace('#', '');
    if (!startDate) {
        const meta = document.head.querySelector('META[name=startDate]');
        if (meta) startDate = meta.content;
    }

    const [y, m, d] = startDate.split('-').map(x => Number.parseInt(x, 10));
    if (y) {
        defaultDate.setFullYear(y);
        defaultDate.setMonth(0);
        defaultDate.setDate(1);
        defaultView = CalendarYear;
    }

    if (y && m) {
        defaultDate.setMonth(m - 1);
        defaultView = CalendarMonth;
    }

    if (y && m && d) {
        defaultDate.setDate(d);
        defaultView = CalendarDay;
    }

    const div  = document.body.appendChild(document.createElement('div'));
    div.hidden = true;

    const svg = div.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.innerHTML = `<defs>
    <symbol id="arrow-left" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></symbol>
    <symbol id="arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></symbol>
    <symbol id="arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></symbol>
    <symbol id="reset" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></symbol>
    <symbol id="hash" viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></symbol>
    <symbol id="slash" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></symbol>
    <symbol id="star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></symbol>
    <symbol id="zap" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></symbol>
    <symbol id="bookmark" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></symbol>
    <symbol id="chevron-up" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></symbol>
    <symbol id="chevron-down" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></symbol>
    </defs>`;

    const cache = new CalendarCache();
    const views = [
        document.body.appendChild(new CalendarDay(cache)),
        document.body.appendChild(new CalendarMonth(cache)),
        document.body.appendChild(new CalendarYear(cache))
    ];

    for (const view of views) {
        if (view.constructor.name === defaultView.name) {
            view.setAttribute('date', defaultDate);
            break;
        }
    }
});
