class CalendarView extends HTMLElement {
    static get observedAttributes() { return ['date']; }
    connectedCallback() {
        this.renderShell();
        this.renderSubHeader();
        this.addEventListener('click', this.onClick);
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

    onKeyPress(e) {
        switch (e.key) {
        case 'n': this.querySelector('A.step.forward').click(); break;
        case 'p': this.querySelector('A.step.backward').click(); break;
        case 'r': this.visit('default');
        }
    }

    yearmonth(d) {
        if (!d) return '';
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    * daysOfWeek() {
        const now = new Date();
        const weekStart = new Date(now.getTime() - now.getDay() * 86400000);
        for (let i = 0; i < 7; i++) {
            const node = document.createElement('div');
            node.className = 'day-of-week';
            const d = new Date(weekStart.getTime() + 86400000 * i);
            node.textContent = d.toLocaleString(this.locale, {weekday: 'short'});
            yield node;
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
            <svg>
                <defs>
                    <symbol id="arrow-left" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></symbol>
                    <symbol id="arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></symbol>
                    <symbol id="arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></symbol>
                    <symbol id="reset" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></symbol>
                    <symbol id="grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </defs>
            </svg>
            <header>
            <h1></h1>
            <div class="toolbar">
                <a class="reset" title="Reset (r)" href="#"><svg class="icon"><use xlink:href="#reset" /></svg></a>
                <a class="step backward" data-step="-1" href="#"><svg class="icon"><use xlink:href="#arrow-left" /></svg></a>
                <a class="step forward" data-step="1" href="#"><svg class="icon"><use xlink:href="#arrow-right" /></svg></a>
            </div>
        </header>
        `;
    }

    startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    endOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0);
    }

    switchView(value) {
        let date, view;
        value = value.replace('#', '');
        this.replaceLocationHash(value);

        if (value.match(/^\d{4}-\d{2}$/)) {
            date = `${value}T00:00`;
            view = 'c-g';
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
        const now = this.startOfDay(new Date())
        let i, j;
        for (i = 0; i < 366; i++) {
            const day = new Date(this.date.getTime() + 86400000 * i);
            if (day.getFullYear() !== this.date.getFullYear()) continue;

            if (day.getDate() === 1) {
                const month = fragment.appendChild(document.createElement('div'));
                month.className = 'month';
                const title = month.appendChild(document.createElement('h2'));
                const link = title.appendChild(document.createElement('a'));
                link.className = 'switch-view';
                link.href = '#';
                link.hash = this.yearmonth(day);
                link.innerText = day.toLocaleString(this.locale, {month: 'long'});

                for (const dayOfWeek of this.daysOfWeek()) {
                    fragment.lastChild.appendChild(dayOfWeek);
                }

                for (j = day.getDay(); j > 0; j--) {
                    const div = fragment.lastChild.appendChild(document.createElement('div'));
                    div.className = 'day diminished';
                    const lining = div.appendChild(document.createElement('div'))
                    const d = new Date(day.getTime() - 86400000 * j);
                    lining.textContent = d.getDate();
                }
            }

            const div = fragment.lastChild.appendChild(document.createElement('day'));
            div.className = 'day';
            if (day.getTime() == now.getTime()) {
                div.innerHTML = `<div class="today">${day.getDate()}</div>`;
            } else {
                div.textContent = day.getDate();
            }

            const tomorrow = new Date(day.getTime() + 86400000);
            if (tomorrow.getMonth() !== day.getMonth()) {
                for (j = 1; j < 7 - day.getDay(); j++) {
                    const div = fragment.lastChild.appendChild(document.createElement('div'));
                    div.className = 'day diminished';
                    const inner = div.appendChild(document.createElement('div'))
                    const d = new Date(day.getTime() + 86400000 * j);
                    inner.textContent = d.getDate();
                }
            }
        }

        this.append(fragment);
    }

    onClick(e) {
        if (e.target.matches('A.step')) {
            e.preventDefault();
            this.visit('year-step', parseInt(e.target.dataset.step, 10));
        }

        if (e.target.matches('A.reset')) {
            this.visit('default');
        }

        if (e.target.matches('A.switch-view')) {
            this.switchView(e.target.hash);
        }
    }
}

class CalendarGrid extends CalendarView {
    renderSubHeader() {
        this.append(...this.daysOfWeek());
    }

    render() {
        const fragment = document.createDocumentFragment();
        const monthStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const firstDay = new Date(monthStart.getTime() - monthStart.getDay() * 86400000);
        const lastDay = new Date(monthEnd.getTime() + (6 - monthEnd.getDay()) * 86400000);
        const boxCount = (lastDay.getTime() - firstDay.getTime()) / 86400000;
        const events = this.eventFinder(firstDay, lastDay);

        const h1 = this.querySelector('header h1');
        h1.textContent = this.date.toLocaleString(this.locale, {month: 'long'});
        const link = h1.appendChild(document.createElement('a'));
        link.className = 'switch-view';
        link.href = '#';
        link.hash = this.date.getFullYear();
        link.innerText = this.date.getFullYear();
        document.title = h1.innerText;

        this.querySelectorAll('.box').forEach(node => node.remove());

        for (let i=0; i <= boxCount; i++) {
            const d = new Date(firstDay.getTime() + 86400000 * i);
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

    onClick(e) {
        if (e.target.matches('A.step')) {
            e.preventDefault();
            this.visit('month-step', parseInt(e.target.dataset.step, 10));
        }

        if (e.target.matches('A.reset')) {
            e.preventDefault();
            this.visit('default');
        }

        if (e.target.matches('A.switch-view')) {
            this.switchView(e.target.hash);
        }
    }

    eventFinder(start, end) {
        const d = new Date(start);
        const yearmonths = new Set();
        while (d <= end) {
            yearmonths.add(this.yearmonth(d));
            d.setDate(d.getDate() + 1);
        }

        const selectors = Array.from(yearmonths.values()).map(yearmonth => `c-e[group*="${yearmonth}"]`);
        const query = Array.from(selectors).join(',');
        return document.querySelectorAll(query);
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

class CalendarEvent extends HTMLElement {
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
        const yearmonths = new Set();
        yearmonths.add(this.startYearmonth);
        yearmonths.add(this.endYearmonth);
        this.group = Array.from(yearmonths.values()).join(' ');
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
        return this.end.getTime() - this.start > 86400000;
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

    yearmonth(d) {
        if (!d) return;
        return d.toLocaleString(this.locale, {year: 'numeric', month: '2-digit'});
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
    console.log('in domcontentloaded');
    customElements.define("c-g", CalendarGrid);
    customElements.define("c-y", CalendarYear);
    customElements.define("c-e", CalendarEvent);

    for (const element of ['c-g', 'c-y']) {
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

    if (start.length == 7) {
        const [year, month] = start.split('-').map(x => parseInt(x, 10));
        d.setYear(year);
        d.setMonth(month - 1);
        d.setDate(1);
        document.body.querySelector('c-g').setAttribute('date', d);
    }

    if (start.length == 4) {
        d.setYear(parseInt(start, 10));
        d.setMonth(0);
        d.setDate(1);
        document.body.querySelector('c-y').setAttribute('date', d);
    }
});
