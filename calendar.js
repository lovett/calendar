class CalendarBase extends HTMLElement {
    constructor() {
        super();
        this.cache = new Map();
        this.oneDay = 86_400_000;
    }

    cached(key, callback) {
        if (!this.cache.has(key)) this.cache.set(key, callback());
        return this.cache.get(key);
    }

    get dayNames() {
        return this.cached('day-names', () => {
            const daysBack = this.now.getDay() * this.oneDay;
            const start = new Date(this.now.getTime() - daysBack)

            const names = [];
            for (let i = 0; i < 7; i++) {
                names.push(this.nextDay(start, i).toLocaleString(this.locale, {weekday: 'short'}));
            }
            return names;
        });
    }

    get now() {
        return this.cached('now', () => new Date());
    }

    isToday(d) {
        if (d.getFullYear() !== this.now.getFullYear()) return false;
        if (d.getMonth() !== this.now.getMonth()) return false;
        if (d.getDate() !== this.now.getDate()) return false;
        return true;
    }

    isLastDayOfMonth(d) {
        const tomorrow = this.nextDay(d);
        return tomorrow.getMonth() !== d.getMonth();
    }

    ym(d) {
        if (!d) return '';
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    ymd(d) {
        if (!d) return '';
        return `${this.ym(d)}-${d.getDate().toString().padStart(2, '0')}`;
    }

    startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    endOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0);
    }

    nextDay(d, count = 1) {
        const date = new Date(d);
        date.setDate(d.getDate() + count);
        return date;
    }

    nextMonth(d, count = 1) {
        const date = new Date(d);
        date.setMonth(d.getMonth() + count);
        return date;
    }

    nextYear(d, count = 1) {
        const date = new Date(d);
        date.setFullYear(date.getFullYear() + count);
        return date;
    }

    previousDay(d, count = 1) {
        const date = new Date(d);
        date.setDate(d.getDate() - count);
        return date;
    }

    previousMonth(d, count = 1) {
        const date = new Date(d);
        date.setMonth(date.getMonth() - count);
        return date;
    }

    previousYear(d, count = 1) {
        const date = new Date(d);
        date.setFullYear(date.getFullYear() - count);
        return date;
    }

    * daysFromStartOfWeek(d) {
        for (let i = d.getDay(); i > 0; i--) {
            yield this.previousDay(d, i);
        }
    }

    * daysToEndOfWeek(d) {
        for (let i = 0; i < 6 - d.getDay(); i++) {
            yield this.nextDay(d, i + 1);
        }
    }
}

class CalendarView extends CalendarBase {
    static get observedAttributes() { return ['date']; }
    connectedCallback() {
        this.renderShell();
        this.renderSubHeader();
        this.addEventListener('step', this.onStep);
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'date' && newValue) {
            this.date = new Date(newValue);
            if (!this.defaultDate) this.defaultDate = this.date;
            if (newValue) this.render();
        }
    }

    eventFinder(start, end) {
        const set = new Set();
        set.add(this.ym(start));
        const d = new Date(start);
        while (d <= (end || start)) {
            set.add(this.ym(d));
            d.setDate(d.getDate() + 1);
        }

        const selectors = Array.from(set.values()).map(ym => `c-e[group*="${ym}"]`);
        const query = Array.from(selectors).join(',');
        return this.cached(query, () => document.querySelectorAll(query))
    }

    eventFinderSorted(start, end) {
        return Array.from(this.eventFinder(start, end)).sort((a, b) => {
            a.parseTime();
            b.parseTime();
            if (a.start < b.start) return -1;
            if (a.start > b.start) return 1;
            return 0;
        });
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
        <header>
            <h1></h1>
            <div class="toolbar">
                <a href="#previous"><svg class="icon"><use xlink:href="#arrow-left" /></svg></a>
                <a href="#today"><svg class="icon"><use xlink:href="#target" /></svg></a>
                <a href="#next"><svg class="icon"><use xlink:href="#arrow-right" /></svg></a>
            </div>
        </header>
        `;
    }
}

class CalendarYear extends CalendarView {
    renderSubHeader() {}

    render() {
        this.querySelectorAll('.month').forEach(node => node.remove());

        const h1 = this.querySelector('header h1');
        h1.textContent = this.date.getFullYear();
        document.title = h1.innerText;

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 365; i++) {
            const day = new Date(this.date.getTime() + this.oneDay * i);

            if (day.getDate() === 1) {
                const month = fragment.appendChild(document.createElement('div'));
                month.className = 'month';
                const title = month.appendChild(document.createElement('h2'));
                const link = title.appendChild(document.createElement('a'));
                link.href = '#';
                link.hash = this.ym(day);
                link.innerText = day.toLocaleString(this.locale, {month: 'long'});

                for (const day of this.dayNames) {
                    const div = document.createElement('div');
                    div.className = 'day-of-week';
                    div.innerText = day;
                    fragment.lastChild.append(div);
                }

                for (const d of this.daysFromStartOfWeek(day)) {
                    this.renderDay(fragment.lastChild, d, 'diminished');
                }
            }

            this.renderDay(fragment.lastChild, day);

            if (this.isLastDayOfMonth(day)) {
                for (const d of this.daysToEndOfWeek(day)) {
                    this.renderDay(fragment.lastChild, d, 'diminished');
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

        const dayNumber = lining.appendChild(document.createElement('a'));
        dayNumber.href = '#' + this.ymd(d);
        dayNumber.innerText = d.getDate();
        dayNumber.classList.add('day-number');

        if (this.isToday(d)) dayNumber.classList.add('today');

        if (this.hasEvents(d)) dayNumber.classList.add('has-events');
    }

    onStep(e) {
        if (e.detail.to === 'today') {
            window.location.hash = this.now.getFullYear();
        }

        if (e.detail.direction === 'next') {
            window.location.hash = this.nextYear(this.date).getFullYear();
        }

        if (e.detail.direction === 'previous') {
            window.location.hash = this.previousYear(this.date).getFullYear();
        }
    }

    hasEvents(d) {
        const ymd = this.ymd(d);
        for (const event of this.eventFinder(d, d)) {
            if (event.dayList.some(item => this.ymd(item) === ymd)) return true;
        }
        return false;
    }
}

class CalendarMonth extends CalendarView {
    renderSubHeader() {
        for (const day of this.dayNames) {
            const div = document.createElement('div');
            div.className = 'day-of-week';
            div.innerText = day;
            this.append(div);
        }
    }

    render() {
        const fragment = document.createDocumentFragment();
        const monthStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const firstDay = new Date(monthStart.getTime() - monthStart.getDay() * this.oneDay);
        const lastDay = new Date(monthEnd.getTime() + (6 - monthEnd.getDay()) * this.oneDay);
        const boxCount = (lastDay.getTime() - firstDay.getTime()) / this.oneDay;
        const events = this.eventFinder(firstDay, lastDay);

        const h1 = this.querySelector('header h1');
        h1.textContent = this.date.toLocaleString(this.locale, {month: 'long', year: 'numeric'});
        document.title = h1.textContent;

        const year = document.createElement('a');
        year.href = '#';
        year.hash = this.date.getFullYear();
        year.textContent = this.date.toLocaleString(this.locale, { year: 'numeric' });
        h1.innerHTML = h1.innerHTML.replace(year.textContent, year.outerHTML);

        this.querySelectorAll('.box').forEach(node => node.remove());

        for (let i=0; i <= boxCount; i++) {
            const d = new Date(firstDay.getTime() + this.oneDay * i);
            const outer = fragment.appendChild(document.createElement('div'));
            outer.classList.add('box');
            if (d < monthStart || d > monthEnd) {
                outer.classList.add('diminished');
            }
            const inner = outer.appendChild(document.createElement('div'));

            this.renderDayOfMonth(inner, d);
            this.renderEvents(inner, events, d);
        }

        this.append(fragment);
    }

    onStep(e) {
        if (e.detail.to === 'today') {
            window.location.hash = this.ym(this.now);
        }

        if (e.detail.direction === 'next') {
            window.location.hash = this.ym(this.nextMonth(this.date));
        }

        if (e.detail.direction === 'previous') {
            window.location.hash = this.ym(this.previousMonth(this.date));
        }
    }

    renderEvents(parent, events, d) {
        for (const event of events) {
            if (!event.occursOn(d)) continue;
            event.parseTime();
            const div = document.createElement('div');

            if (event.hasAttribute('style')) {
                div.setAttribute('style', event.getAttribute('style'));
            }

            div.classList.add(...event.classList(d));

            if (event.isMultiDayEnd(d)) this.renderIcon(div, 'arrow-down');
            if (event.isMultiDayContinuation(d)) this.renderIcon(div, 'arrow-right');
            if (!event.isMultiDay() || event.isMultiDayStart(d)) div.innerHTML = event.shortLine();

            parent.appendChild(div);
        }
    }

    renderDayOfMonth(parent, d) {
        const today = this.ymd(new Date());
        const node = document.createElement('a');
        node.href = '#' + this.ymd(d);

        node.classList.add('day-of-month');

        if (today == this.ymd(d)) {
            node.classList.add('today');
        }

        let label = '';
        if (d.getDate() === 1) {
            label = d.toLocaleString(this.locale, {month: 'short'}) + ' ';
        }

        node.textContent = label + d.getDate();
        parent.appendChild(node);
    }
}

class CalendarDay extends CalendarView {
    renderSubHeader() {}

    render() {
        this.querySelectorAll('.event').forEach(node => node.remove());

        const h1 = this.querySelector('header h1');
        h1.textContent = this.date.toLocaleString(this.locale, {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
        document.title = h1.textContent;

        const year = document.createElement('a');
        year.href = '#';
        year.hash = this.date.getFullYear();
        year.textContent = this.date.toLocaleString(this.locale, { year: 'numeric' });
        h1.innerHTML = h1.innerHTML.replace(year.textContent, year.outerHTML);

        const month = document.createElement('a');
        month.href = '#';
        month.hash = this.ym(this.date);
        month.textContent = this.date.toLocaleString(this.locale, {month: 'long'});
        h1.innerHTML  = h1.innerHTML.replace(month.textContent, month.outerHTML);

        // let month = h1.appendChild(document.createElement('a'));
        // month.href = '#';
        // month.hash = this.ym(this.date);
        // month.innerText = this.date.toLocaleString(this.locale, {month: 'long', day: 'numeric'});

        // let year = h1.appendChild(document.createElement('a'));
        // year.href = '#';
        // year.hash = year.innerText = this.date.getFullYear();
        // document.title = this.date.toLocaleString(this.locale, {month: 'long', weekday: 'long', day: 'numeric', year: 'numeric'});

        const fragment = document.createDocumentFragment();
        for (const event of this.eventFinderSorted(this.date)) {
            this.renderEvent(fragment, event);
        }

        // const d = new Date(this.date);
        // for (let i = 0; i < 24; i++) {
        //     d.setHours(i);
        //     this.renderHour(fragment, d, i);
        // }
        this.append(fragment);
    }

    renderEvent(parent, event) {
        if (!event.occursOn(this.date)) return;
        const container = document.createElement('div');
        container.classList.add(...event.classList(this.date));

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

        if (event.isMultiDay()) {
            this.renderIcon(time, 'star');
        }

        if (event.isAllDay()) {
            this.renderIcon(time, 'zap');
        }

        const h2 = container.appendChild(document.createElement('h2'));
        h2.innerHTML = event.description;


        container.appendChild(event.details);

        parent.appendChild(container);
    }

    onStep(e) {
        if (e.detail.to === 'today') {
            window.location.hash = this.ymd(this.now);
        }

        if (e.detail.direction === 'next') {
            window.location.hash = this.ymd(this.nextDay(this.date));
        }

        if (e.detail.direction === 'previous') {
            window.location.hash = this.ymd(this.previousDay(this.date));
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
        this.group = Array.from(set.values()).join(' ');

    }

    classList(d) {
        const candidates = [
            'event', true,
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

    set group(value) {
        if (value) this.setAttribute('group', value);
    }

    get group() {
        return this.getAttribute('group');
    }

    get dayList() {
        if (!this.start) return [];
        const days = [];
        for (let i=this.start.getTime(); i <= this.end.getTime(); i += this.oneDay) {
            days.push(new Date(i));
        }
        return days;
    }

    get startHour() {
        return this.startTime[0];
    }

    get startMinute() {
        return this.startTime[1];
    }

    hasStartTime() {
        const [h, m] = this.startTime;
        return h > 0 || m > 0;
    }

    hasEndTime() {
        const [h1, m1] = this.startTime;
        const [h2, m2 ] = this.endTime;
        return h1 !== h2 || m1 !== m2;
    }

    isAllDay() {
        return !this.hasStartTime() && !this.isMultiDay();
    }

    isMultiDay() {
        if (!this.start) return false;
        return this.end.getTime() - this.start > this.oneDay;
    }

    isMultiDayStart(d) {
        if (!this.isMultiDay()) return false;
        return this.startOfDay(d).getTime() == this.startOfDay(this.start).getTime();
    }

    isMultiDayEnd(d) {
        return this.isMultiDay() && this.startOfDay(d).getTime() == this.startOfDay(this.end).getTime();
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
            const [_, year, month, day] = match.map(x => parseInt(x, 10));
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

        for (const [i, match] of this.match(/(\d{1,2}):(\d{1,2})\s*([AP]M)?\W*/g, 2)) {
            this.captureParsingIndex(match);
            let [hour, minute] = match.slice(1, 3).map(x => parseInt(x, 10));
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
        return d >= this.startOfDay(this.start) && d <= this.endOfDay(this.end);
    }

    shortLine() {
        let result = '';

        if (this.hasStartTime()) {
            result = this.start.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'}) + ' ';
        }

        return result + this.description;
    }
}

window.addEventListener('keypress', (e) => {
    if (e.key === 'n') {
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {direction: 'next'}}));
    }
    if (e.key === 'p') {
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {direction: 'previous'}}));
    }

    if (e.key === 't') {
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'today'}}));
    }
});

window.addEventListener('click', (e) => {
    e.target.blur();
    if (e.target.matches('A[href$="next"]')) {
        e.preventDefault();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {direction: 'next'}}));
    }

    if (e.target.matches('A[href$="today"]')) {
        e.preventDefault();
        this.blur();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {to: 'today'}}));
    }


    if (e.target.matches('A[href$="previous"]')) {
        e.preventDefault();
        document.body.querySelector('.view[date]').dispatchEvent(new CustomEvent('step', {detail: {direction: 'previous'}}));
    }
});

window.addEventListener('hashchange', (e) => {
    let dest = window.location.hash.replace('#', '');
    if (!dest) {
        const meta = document.head.querySelector('META[name=start]');
        if (meta) dest = meta.content;
    }

    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);

    const [year, month, day] = dest.split('-').map(x => parseInt(x, 10));
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

    const views = new Map();
    for (const tag of ['c-y', 'c-m', 'c-d']) {
        const el = document.body.appendChild(document.createElement(tag));
        el.classList.add('view');
        views.set(tag, el);
    }

    let start = window.location.hash.replace('#', '');
    if (!start) {
        const meta = document.head.querySelector('META[name=start]');
        if (meta) start = meta.content;
    }

    const startDate = new Date();
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);

    let tag = 'c-m';

    const [y, m, d] = start.split('-').map(x => parseInt(x, 10));
    if (y) {
        startDate.setFullYear(y);
        startDate.setMonth(0);
        startDate.setDate(1);
        tag = 'c-y';
    }

    if (y && m) {
        startDate.setMonth(m - 1);
        tag = 'c-m';
    }

    if (y && m && d) {
        startDate.setDate(d);
        tag = 'c-d';
    }

    const svg = document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    svg.innerHTML = `<defs>
    <symbol id="arrow-left" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></symbol>
    <symbol id="arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></symbol>
    <symbol id="arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></symbol>
    <symbol id="target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></symbol>
    <symbol id="hash" viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></symbol>
    <symbol id="star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></symbol>
    <symbol id="zap" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></symbol>
    </defs>`;

    views.get(tag).setAttribute('date', startDate);
});
