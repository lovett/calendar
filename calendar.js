class CalendarGrid extends HTMLElement {
    static get observedAttributes() { return ['date']; }

    connectedCallback() {
        this.renderSvgDefs();
        this.addEventListener('click', this.onClick);
        this.visit('default');
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    }

    attributeChangedCallback(name, _, newValue) {
        if (name === 'date') {
            const d = new Date(newValue);
            this.render(d);
        }
    }

    render(d) {
        this.date = d;
        const fragment = document.createDocumentFragment();
        this.renderHeader(fragment);
        this.renderDayNames(fragment);
        this.renderBoxes(fragment);

        if (this.replaceChildren) {
            this.replaceChildren(fragment);
        } else {
            this.innerHTML = '';
            this.appendChild(fragment);
        }
    }

    visit(dest) {
        this.setAttribute('date', (dest === 'default') ? this.defaultDate : dest)
    }

    onClick(e) {
        if (e.target.matches('A.step')) {
            e.preventDefault();
            this.visit(e.target.dataset.destination);
        }

        if (e.target.matches('A.reset')) {
            e.preventDefault();
            this.visit('default');
        }
    }

    get defaultDate() {
        const d = new Date();
        const meta = document.querySelector('HEAD META[name=start]');
        if (meta) {
            const [year, month] = meta.content.split('-').map(x => parseInt(x, 10));
            d.setFullYear(year);
            d.setMonth(month -1);
        }
        d.setDate(1);
        d.setHours(0);
        d.setMinutes(0);
        d.setMilliseconds(0);
        return d;
    }

    * eventFinder(d, start, end) {
        const selector = `c-e[datespan^="${this.yearmonth(start)}"],c-e[datespan^="${this.yearmonth(end)}"]`;
        for (const node of document.querySelectorAll(selector)) {
            if (node.occursOn(d)) yield node;
        }
    }

    yearmonth(d) {
        if (!d) return;
        return d.toLocaleString(this.locale, {year: 'numeric', month: '2-digit'});
    }

    yearmonthday(d) {
        if (!d) return;
        return d.toLocaleString(this.locale, {year: 'numeric', month: '2-digit', day: '2-digit'});
    }

    renderSvgDefs() {
        if (document.body.querySelector('svg')) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const defs = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'));
        defs.innerHTML = `
        <symbol id="arrow-left" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></symbol>
        <symbol id="arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></symbol>
        <symbol id="arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></symbol>
        <symbol id="reset" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></symbol>
        `;
        document.body.append(svg.appendChild(defs));
    }


    renderHeader(parent) {
        const node = document.createElement('header');

        for (let i=0; i < 2; i++) {
            if (i === 0) {
                this.renderTitle(node);
            }

            if (i === 1) {
                const div = document.createElement('div');
                this.renderResetButton(div);
                this.renderMonthStep(div, -1);
                this.renderMonthStep(div, 1);
                node.appendChild(div);
            }
        }

        parent.appendChild(node);
    }

    renderTitle(parent) {
        const node = document.createElement('h1');
        node.innerText = this.date.toLocaleString(this.locale, {month: 'long', year: 'numeric'});
        document.title = node.innerText;
        parent.appendChild(node);
    }

    renderResetButton(parent) {
        if (this.date - this.defaultDate === 0) return;

        const a = document.createElement('a');
        a.className = 'reset';
        a.href = '#';
        this.renderIcon(a, 'reset');
        parent.appendChild(a);
    }

    renderMonthStep(parent, count) {
        const a = document.createElement('a');
        a.className = 'step';
        a.href = '#';

        const destination = new Date(this.date);
        switch (count) {
        case 1:
            this.renderIcon(a, 'arrow-right');
            destination.setDate(32);
            break;
        case -1:
            this.renderIcon(a, 'arrow-left');
            destination.setDate(0);
            break;
        }
        a.dataset.destination = destination;
        parent.appendChild(a);
    }

    renderIcon(parent, id) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'icon');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
        svg.appendChild(use);
        parent.appendChild(svg);
    }

    renderDayNames(parent) {
        const weekStart = new Date(this.date.getTime() - this.date.getDay() * 86400000);

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < 7; i++) {
            const node = document.createElement('div');
            node.classList.add('day-of-week');
            const d = new Date(weekStart.getTime() + 86400000 * i);
            node.innerText = d.toLocaleString(this.locale, {weekday: 'short'});
            fragment.appendChild(node);
        }

        parent.appendChild(fragment);
    }

    renderEvents(parent, d, firstDay, lastDay) {
        for (const event of this.eventFinder(d, firstDay, lastDay)) {
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

    renderBoxes(parent) {
        const monthStart = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const firstDay = new Date(monthStart.getTime() - monthStart.getDay() * 86400000);
        const lastDay = new Date(monthEnd.getTime() + (7 - monthEnd.getDay()) * 86400000);
        const boxCount = (lastDay.getTime() - firstDay.getTime()) / 86400000;
        const fragment = document.createDocumentFragment();

        for (let i=0; i < boxCount; i++) {
            const d = new Date(firstDay.getTime() + 86400000 * i);
            const outer = document.createElement('div');
            const inner = document.createElement('div');
            outer.classList.add('box');
            if (d < monthStart || d > monthEnd) {
                outer.classList.add('diminished');
            }

            this.renderDayOfMonth(inner, d);
            this.renderEvents(inner, d, firstDay, lastDay);
            outer.appendChild(inner);
            fragment.appendChild(outer);
        }

        parent.appendChild(fragment);
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
        this.startTime = [0, 0];
        this.endTime = [0,0];
        this.parsingIndex = -1;
        this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    }

    connectedCallback() {
        this.parseDate();
        this.parseTime();
        this.datespan = `${this.yearmonth(this.start)} ${this.yearmonth(this.end)}`;
    }

    get description() {
        if (this.parsingIndex < 0) return '';
        return this.innerHTML.slice(this.parsingIndex);
    }

    set datespan(value) {
        this.setAttribute('datespan', value);
    }

    get datespan() {
        return this.getAttribute('datespan');
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
        for (const [i, match] of this.match(/(\d{4})-(\d{2})-(\d{2})\W*/g, 2)) {
            this.captureParsingIndex(match);
            const [_, year, month, day] = match.map(x => parseInt(x, 10));
            if (i === 0) {
                this.start = new Date(year, month - 1, day, 0, 0, 0);
            }
            this.end = new Date(year, month - 1, day, 23, 59, 59);
        }
    }

    yearmonth(d) {
        if (!d) return;
        return d.toLocaleString(this.locale, {year: 'numeric', month: '2-digit'});
    }

    parseTime() {
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
    }


    captureParsingIndex(match) {
        this.parsingIndex = Math.max(this.parsingIndex, match.index + match[0].length);
    }

    startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    endOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0);
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
    customElements.define("c-g", CalendarGrid);
    customElements.define("c-e", CalendarEvent);
    document.body.append(document.createElement('c-g'));
});
