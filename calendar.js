const patterns = {
    date: /(\d{4})-(\d{2})-(\d{2})\W*/g,
    time: /(\d{1,2}):(\d{1,2})\s*([AP]M)?\W*/
}

class Entry {
    constructor(patterns, node) {
        this.patterns = patterns;
        this.node = node;
        this.start = null;
        this.end = null;
        this.parsingIndex = -1;
        this.hasStartTime = false;
        this.hasEndTime = false;
        this.parseDate();
        this.parseTime();
    }

    toString() {
        return this.start.toLocaleString('en-US', {timeStyle: 'short'});
    }

    occursOn(d) {
        if (!this.start) return false;
        return d >= this.startOfDay(this.start) && d <= this.endOfDay(this.end);
    }

    isMultiDay() {
        if (!this.start) return false;
        return this.end.getTime() - this.start > 86400000;
    }

    isMultiDayStart(d) {
        return this.isMultiDay() && this.startOfDay(d).getTime() == this.startOfDay(this.start).getTime();
    }

    isMultiDayContinuation(d) {
        if (!this.isMultiDay()) return false;
        if (this.isMultiDayEnd()) return false;
        return d > this.start;
    }

    isMultiDayEnd(d) {
        return this.isMultiDay() && this.startOfDay(d).getTime() == this.startOfDay(this.end).getTime();
    }

    startOfDay(d) {
        const d2 = new Date(d);
        d2.setHours(0);
        d2.setMinutes(0);
        d2.setSeconds(0);
        d2.setMilliseconds(0);
        return d2;
    }

    endOfDay(d) {
        const d2 = new Date(d);
        d2.setHours(23);
        d2.setMinutes(59);
        d2.setSeconds(59);
        d2.setMilliseconds(0);
        return d2;
    }

    captureParsingIndex(match) {
        this.parsingIndex = Math.max(this.parsingIndex, match.index + match[0].length);
    }

    parseDate() {
        for (const matches of this.node.innerHTML.matchAll(this.patterns.date)) {
            this.captureParsingIndex(matches);
            const d = new Date(
                parseInt(matches[1], 10),
                parseInt(matches[2], 10) - 1,
                parseInt(matches[3], 10),
            );

            if (!this.start) {
                this.start = this.startOfDay(d);
            }

            this.end = this.endOfDay(d);
        }
    }

    parseTime(value) {
        if (!this.start) return;

        const matches = this.node.innerHTML.match(this.patterns.time);
        if (matches) {
            this.captureParsingIndex(matches);
            this.hasStartTime = true;
            let hour = parseInt(matches[1], 10);
            const minute = parseInt(matches[2], 10);
            const meridiem = matches[3] || '';
            hour += (meridiem.toLowerCase() === 'pm') ? 12 : 0;
            this.start.setHours(hour);
            this.start.setMinutes(minute);
        }
    }

    get description() {
        if (this.parsingIndex < 0) return '';
        return this.node.innerHTML.slice(this.parsingIndex);
    }

    shortLine(d) {
        let result = '';

        if (this.hasStartTime) {
            result = this.start.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric'}) + ' ';
        }

        return result + this.description;
    }
}

function parseEntries() {
    const entries = new Map();

    document.querySelectorAll('BODY EVENT').forEach(node => {
        const entry = new Entry(patterns, node);
        if (!entry.start) return;
        const key = yearmonth(entry.start);
        if (!entries.has(key)) {
            entries.set(key, []);
        }

        const collection = entries.get(key);
        collection.push(entry);
    });

    for (const collection of entries.values()) {
        collection.sort();
    }

    return entries;
}

function setup() {
    const container = document.createElement('calendar');
    document.body.dataset.calendarTag = container.nodeName;
    render(container, defaultStartDate());
    document.body.prepend(container);
    renderSvgDefs(document.body);
}

function defaultStartDate() {
    const meta = document.querySelector('HEAD META[name=calendar-start]');
    if (meta) {
        const [year, month] = meta.content.split('-').map(x => parseInt(x, 10));
        return new Date(year, month - 1, 1);
    }
    return new Date();
}

function render(parent, d) {
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);

    parent.dataset.date = d.toISOString();

    const fragment = document.createDocumentFragment();
    renderHeader(fragment, d);
    renderDayNames(fragment, d);
    renderBoxes(fragment, d);

    if (parent.replaceChildren) {
        parent.replaceChildren(fragment);
    } else {
        parent.innerHTML = '';
        parent.appendChild(fragment);
    }
}

function renderHeader(parent, d) {
    const node = document.createElement('header');

    for (let i=0; i < 2; i++) {
        if (i === 0) {
            renderYearMonth(node, d);
        }

        if (i === 1) {
            const child = document.createElement('div');
            renderDateReset(child, d);
            renderMonthStep(child, d, -1);
            renderMonthStep(child, d, 1);
            node.appendChild(child);
        }
    }

    parent.appendChild(node);
}

function renderYearMonth(parent, d) {
    const node = document.createElement('h1');
    node.innerText = d.toLocaleString('en-US', {month: 'long', year: 'numeric'});
    document.title = node.innerText;
    parent.appendChild(node);
}

function monthMenu() {
    const d = new Date();
    const container = document.createElement('select');
    for (let i = 0; i < 12; i++) {
        const option = document.createElement('option');
        d.setMonth(i);
        option.value = i + 1;
        option.text = d.toLocaleString('en-US', {month: 'long'});
        container.appendChild(option);
    }
    return container;
}

function renderDateReset(parent, d) {
    const start = defaultStartDate();
    if (yearmonth(start) === yearmonth(d)) return;

    const a = document.createElement('a');
    a.className = 'reset';
    a.href = '#';
    renderSvgIcon(a, 'reset');
    parent.appendChild(a);
}

function renderMonthStep(parent, d, count) {
    const a = document.createElement('a');
    a.className = 'step';
    a.href = '#';

    const destination = new Date(d);
    switch (count) {
        case 1:
            renderIcon(a, 'arrow-right');
            destination.setDate(32);
            break;
        case -1:
            renderIcon(a, 'arrow-left');
            destination.setDate(0);
            break;
    }
    a.dataset.destination = destination;
    parent.appendChild(a);
}

function renderIcon(parent, id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${id}`);
    svg.appendChild(use);
    parent.appendChild(svg);
}

function renderDayNames(parent, d) {
    const start = weekStart(d);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 7; i++) {
        const node = document.createElement('section');
        node.classList.add('daynames');
        const d = new Date(start.getTime() + 86400000 * i);
        node.innerText = d.toLocaleString('en-US', {weekday: 'short'});
        fragment.appendChild(node);
    }

    parent.appendChild(fragment);
}

function renderBoxes(parent, d) {
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const firstBox = new Date(monthStart.getTime() - monthStart.getDay() * 86400000);
    const lastBox = new Date(monthEnd.getTime() + (7 - monthEnd.getDay()) * 86400000);
    const boxCount = (lastBox.getTime() - firstBox.getTime()) / 86400000;
    const fragment = document.createDocumentFragment();

    for (let i=0; i < boxCount; i++) {
        const d = new Date(firstBox.getTime() + 86400000 * i);
        const node = document.createElement('div');
        const inner = document.createElement('div');
        node.dataset.date = d.toISOString();
        node.classList.add('box');
        if (d < monthStart || d > monthEnd) {
            node.classList.add('inactive');
        }

        renderBoxLabel(inner, d);
        renderBoxEntries(inner, d);
        node.appendChild(inner);
        fragment.appendChild(node);
    }

    parent.appendChild(fragment);
}

function weekStart(d) {
    return new Date(d.getTime() - d.getDay() * 86400000);
}

function renderBoxLabel(parent, d) {
    const node = document.createElement('div');
    node.classList.add('day');

    let label = '';
    if (d.getDate() === 1) {
        label = d.toLocaleString('en-US', {month: 'short'}) + ' ';
    }

    node.textContent = label + d.getDate();
    parent.appendChild(node);
}

function yearmonth(d) {
    if (!d) return null;
    return d.toLocaleString('en-US', {year: 'numeric', month: '2-digit'});
}

function renderBoxEntries(parent, d) {
    const key = yearmonth(d);
    const collection = entries.get(key);
    if (!collection) return;

    for (entry of collection) {
        if (entry.occursOn(d)) {
            renderEntry(parent, entry, d);
        }
    }
}

function renderEntry(parent, entry, d) {
    const node = document.createElement('div');
    node.classList.add('entry');
    node.setAttribute('style', entry.node.getAttribute('style'));

    if (!entry.hasStartTime && !entry.isMultiDay()) {
        node.classList.add('all-day');
    }

    if (entry.isMultiDay()) {
        node.classList.add('multi-day');
        if (entry.isMultiDayStart(d)) {
            node.classList.add('multi-day-start');
        }

        if (entry.isMultiDayContinuation(d)) {
            node.classList.add('multi-day-continuation');
        }
        if (entry.isMultiDayEnd(d)) {
            node.classList.add('multi-day-end');
        }

    }

    for (const token of entry.node.classList) {
        node.classList.add(token);
    }

    if (entry.isMultiDayEnd(d)) {
        renderIcon(node, 'arrow-down');
    } else if (entry.isMultiDayContinuation(d)) {
        renderIcon(node, 'arrow-right');
    } else {
        node.innerHTML = entry.shortLine(d);

    }

    parent.appendChild(node);
}

function renderSvgDefs(parent) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
    <symbol id="arrow-left" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></symbol>
    <symbol id="arrow-right" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></symbol>
    <symbol id="arrow-down" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></symbol>
    <symbol id="reset" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></symbol>
    `;
    svg.appendChild(defs);
    parent.appendChild(svg);
}

window.addEventListener('click', (e) => {
    const container = e.target.closest(document.body.dataset.calendarTag);
    if (!container) return;

    if (e.target.matches('A.step')) {
        e.preventDefault();
        const d = new Date(e.target.dataset.destination);
        render(container, d);
    }

    if (e.target.matches('A.reset')) {
        e.preventDefault();
        render(container, defaultStartDate());
    }
});

const entries = parseEntries();
setup();
