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

    yearmonth(d) {
        if (!d) return '';
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    ymd(d) {
        if (!d) return '';
        return `${this.yearmonth(d)}-${d.getDate().toString().padStart(2, '0')}`;
    }

    startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    endOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0);
    }

    startOfWeek(d) {
        return new Date(d.getTime() - d.getDay() * this.oneDay);
    }

    nextDay(d, count = 1) {
        return new Date(d.getTime() + this.oneDay * count);
    }

    previousDay(d, count = 1) {
        return new Date(d.getTime() - this.oneDay * count);
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
        this.addEventListener('click', this.onClick);
        window.addEventListener('hashchange', this.onHashChange.bind(this));
        window.addEventListener('keypress', this.onKeyPress.bind(this));
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'date') {
            const d = new Date(newValue);
            this.date = d;
            if (!oldValue && !this.defaultDate) this.defaultDate = d;
            if (newValue) this.render();
        }
    }

    eventFinder(start, end) {
        const set = new Set();
        set.add(this.yearmonth(start));
        const d = new Date(start);
        while (d <= (end || start)) {
            set.add(this.yearmonth(d));
            d.setDate(d.getDate() + 1);
        }

        const selectors = Array.from(set.values()).map(yearmonth => `c-e[group*="${yearmonth}"]`);
        const query = Array.from(selectors).join(',');
        return this.cached(query, () => document.querySelectorAll(query))
    }

    onHashChange(e) {
        this.switchView(e.newURL.substring(e.newURL.indexOf('#')));
    }

    onKeyPress(e) {
        switch (e.key) {
        case 'n': this.querySelector('A.step.forward').click(); break;
        case 'p': this.querySelector('A.step.backward').click(); break;
        case 'r': this.visit('default');
        }
    }

    daysOfWeek() {
        const days = this.cached('days-of-week', () => {
            const weekStart = this.startOfWeek(this.now);
            const days = []
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStart.getTime() + this.oneDay * i);
                days.push(d.toLocaleString(this.locale, {weekday: 'short'}));
            }
            return days;
        });

        return days.map(day => {
            const div = document.createElement('div');
            div.className = 'day-of-week';
            div.textContent = day;
            return div;
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
            <svg>
                <defs>
                    <symbol id="arrow-left" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></symbol>
                    <symbol id="arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></symbol>
                    <symbol id="arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></symbol>
                    <symbol id="grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </defs>
            </svg>
            <header>
            <h1></h1>
            <div class="toolbar">
                <a class="step backward" data-step="-1" href="#"><svg class="icon"><use xlink:href="#arrow-left" /></svg></a>
                <a class="step forward" data-step="1" href="#"><svg class="icon"><use xlink:href="#arrow-right" /></svg></a>
            </div>
        </header>
        `;
    }

    switchView(value) {
        let date, view;
        value = value.replace('#', '');
        this.replaceLocationHash(value);

        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = `${value}T00:00`;
            view = 'c-d';
        }

        if (value.match(/^\d{4}-\d{2}$/)) {
            date = `${value}T00:00`;
            view = 'c-m';
        }

        if (value.match(/^\d{4}$/)) {
            date = `${value}-01-01T00:00`;
            view = 'c-y';
        }

        if (!view) return;

        document.body.querySelector('.calendar-view[date]').removeAttribute('date');
        document.body.querySelector(view).setAttribute('date', date);
    }

    visit(unit, quantity) {
        let destination = this.defaultDate;
        let hash = '';
        if (unit === 'day-step') {
            destination = new Date(this.date);
            destination.setDate(destination.getDate() + quantity);
            hash = this.ymd(destination);
        }
        if (unit === 'month-step') {
            destination = new Date(this.date);
            destination.setMonth(destination.getMonth() + quantity);
            hash = this.yearmonth(destination);
        }
        if (unit === 'year-step') {
            destination = new Date(this.date);
            destination.setYear(destination.getFullYear() + quantity);
            hash = destination.getFullYear();
        }

        this.setAttribute('date', destination);

        this.replaceLocationHash(hash);
    }

    replaceLocationHash(value) {
        const location = window.location.href.split('#')[0];
        history.replaceState({}, "", `${location}#${value}`);
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
                link.hash = this.yearmonth(day);
                link.innerText = day.toLocaleString(this.locale, {month: 'long'});

                fragment.lastChild.append(...this.daysOfWeek());

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
        const container = parent.appendChild(document.createElement('a'));
        container.classList.add('switch-view');
        container.href = '#' + this.ymd(d);
        container.classList.add(...['day'].concat(classes));

        const lining = container.appendChild(document.createElement('div'))
        lining.classList.add('lining');

        const dayNumber = lining.appendChild(document.createElement('div'));
        dayNumber.innerText = d.getDate();
        dayNumber.classList.add('day-number');

        if (this.isToday(d)) dayNumber.classList.add('today');

        if (this.hasEvents(d)) dayNumber.classList.add('has-events');
    }

    onClick(e) {
        if (e.target.matches('A.step')) {
            e.preventDefault();
            this.visit('year-step', parseInt(e.target.dataset.step, 10));
        }

        if (e.target.matches('A.switch-view')) {
            this.switchView(e.target.hash);
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
        this.append(...this.daysOfWeek());
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
        h1.textContent = this.date.toLocaleString(this.locale, {month: 'long'});
        const link = h1.appendChild(document.createElement('a'));
        link.className = 'switch-view';
        link.href = '#';
        link.hash = this.date.getFullYear();
        link.innerText = this.date.getFullYear();
        document.title = `${h1.firstChild.textContent} ${link.firstChild.textContent}`;

        this.querySelectorAll('.box').forEach(node => node.remove());

        for (let i=0; i <= boxCount; i++) {
            const d = new Date(firstDay.getTime() + this.oneDay * i);
            const outer = fragment.appendChild(document.createElement('a'));
            outer.href = '#' + this.ymd(d);
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

    onClick(e) {
        if (e.target.matches('A.step')) {
            e.preventDefault();
            this.visit('month-step', parseInt(e.target.dataset.step, 10));
        }

        if (e.target.matches('A.switch-view')) {
            this.switchView(e.target.hash);
        }
    }

    yearmonthday(d) {
        if (!d) return;
        return d.toLocaleString(this.locale, {year: 'numeric', month: '2-digit', day: '2-digit'});
    }

    renderEvents(parent, events, d) {
        for (const event of events) {
            if (!event.occursOn(d)) continue;
            event.parseTime();
            const div = document.createElement('div');

            if (event.hasAttribute('style')) {
                div.setAttribute('style', event.getAttribute('style'));
            }

            const classes = [
                'event', true,
                'all-day', event.isAllDay(),
                'multi-day', event.isMultiDay(),
                'multi-day-start', event.isMultiDayStart(d),
                'multi-day-continuation', event.isMultiDayContinuation(d),
                'multi-day-end', event.isMultiDayEnd(d),
                event.className, event.hasAttribute('class'),
            ].reduce((accumulator, value, index) => {
                if (typeof value === 'string') accumulator.push(value);
                if (value === false) accumulator.pop();
                return accumulator;
            }, []);

            div.classList.add(...classes);

            if (event.isMultiDayEnd(d)) this.renderIcon(div, 'arrow-down');
            if (event.isMultiDayContinuation(d)) this.renderIcon(div, 'arrow-right');
            if (!event.isMultiDay() || event.isMultiDayStart(d)) div.innerHTML = event.shortLine(d);

            parent.appendChild(div);
        }
    }

    renderDayOfMonth(parent, d) {
        const today = this.yearmonthday(new Date());
        const node = document.createElement('div');
        node.classList.add('day-of-month');

        if (today == this.yearmonthday(d)) {
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
        this.querySelectorAll('.hour').forEach(node => node.remove());

        const h1 = this.querySelector('header h1');
        h1.textContent = this.date.toLocaleString(this.locale, {weekday: 'long'});
        let month = h1.appendChild(document.createElement('a'));
        month.className = 'switch-view';
        month.href = '#';
        month.hash = this.yearmonth(this.date);
        month.innerText = this.date.toLocaleString(this.locale, {month: 'long', day: 'numeric'});

        let year = h1.appendChild(document.createElement('a'));
        year.className = 'switch-view';
        year.href = '#';
        year.hash = year.innerText = this.date.getFullYear();
        document.title = `${h1.firstChild.textContent} ${year.firstChild.textContent}`;

        const fragment = document.createDocumentFragment();
        const d = new Date(this.date);
        for (let i = 0; i < 24; i++) {
            d.setHours(i);
            this.renderHour(fragment, d, i);
        }
        this.append(fragment);
    }

    renderHour(parent, d, hour) {
        const container = parent.appendChild(document.createElement('div'));
        container.className = 'hour';

        const label = container.appendChild(document.createElement('div'))
        label.className = 'label';

        label.textContent = d.toLocaleString(this.locale, {hour: 'numeric'});

        const events = this.eventFinder(d);

        for (let i = 0; i < 4; i++) {
            const segment = container.appendChild(document.createElement('div'))
            segment.className = 'segment' + (i + 1);

            for (const event of events) {
                if (!event.occursOn(d)) continue;
                event.parseTime();
                if (event.startHour !== hour) continue;
                if (Math.round(event.startMinute / 15) !== i) continue;
                const entry = segment.appendChild(document.createElement('div'))
                entry.className = 'event';
                entry.innerHTML = event.shortLine();
            }
        }
    }

    onClick(e) {
        if (e.target.matches('A.step')) {
            e.preventDefault();
            this.visit('day-step', parseInt(e.target.dataset.step, 10));
        }

        if (e.target.matches('A.switch-view')) {
            this.switchView(e.target.hash);
        }
    }

}

class CalendarEvent extends CalendarBase {
    constructor() {
        super();
        this.start = null;
        this.end = null;
        this.startYearmonth = null;
        this.endYearmonth = null;
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
        set.add(this.startYearmonth);
        set.add(this.endYearmonth);
        this.group = Array.from(set.values()).join(' ');
    }

    get description() {
        if (this.parsingIndex < 0) return '';
        return this.innerHTML.slice(this.parsingIndex);
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
                this.startYearmonth = this.yearmonth(this.start);
            }
            this.end = new Date(year, month - 1, day, 23, 59, 59);
            this.endYearmonth = this.yearmonth(this.end);
        }
        this.parseDate = true;
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

    shortLine(d) {
        let result = '';

        if (this.hasStartTime()) {
            result = this.start.toLocaleString(this.locale, {hour: 'numeric', minute: 'numeric'}) + ' ';
        }

        return result + this.description;
    }
}

window.addEventListener('DOMContentLoaded', (e) => {
    customElements.define("c-m", CalendarMonth);
    customElements.define("c-y", CalendarYear);
    customElements.define("c-d", CalendarDay);
    customElements.define("c-e", CalendarEvent);

    for (const element of ['c-y', 'c-m', 'c-d']) {
        const node = document.body.appendChild(document.createElement(element));
        node.className = 'calendar-view';
    }

    let start = window.location.hash.replace('#', '');
    if (!start) {
        const meta = document.querySelector('HEAD META[name=start]');
        if (meta) start = meta.content;
    }

    const d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);

    if (start.length == 10) {
        const [year, month, day] = start.split('-').map(x => parseInt(x, 10));
        d.setYear(year);
        d.setMonth(month - 1);
        d.setDate(day);
        document.body.querySelector('c-d').setAttribute('date', d);
    }

    if (start.length == 7) {
        const [year, month] = start.split('-').map(x => parseInt(x, 10));
        d.setYear(year);
        d.setMonth(month - 1);
        d.setDate(1);
        document.body.querySelector('c-m').setAttribute('date', d);
    }

    if (start.length == 4) {
        d.setYear(parseInt(start, 10));
        d.setMonth(0);
        d.setDate(1);
        document.body.querySelector('c-y').setAttribute('date', d);
    }
});
