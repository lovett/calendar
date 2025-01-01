const containerClass = 'calendar';

const patterns = {
    date: /(\d{4})-(\d{2})-(\d{2})/g,
    time: /(\d{1,2}):(\d{1,2})\s*([AP]M)?/,
    description: /,\s*(.*)/
}

class Entry {
    constructor(patterns, value) {
        this.patterns = patterns;
        this.start = null;
        this.end = null;
        this.description = null;
        this.hasStartTime = false;
        this.hasEndTime = false;
        this.parseDate(value);
        this.parseTime(value);
        this.parseDescription(value);
    }

    toString() {
        return this.start.toLocaleString('en-US', {timeStyle: 'short'});
    }

    occursOn(d) {
        if (!this.start) return false;
        return d >= this.startOfDay(this.start) && d <= this.endOfDay(this.end);
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

    parseDate(value) {
        for (const matches of value.matchAll(this.patterns.date)) {
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

        const matches = value.match(this.patterns.time);
        if (matches) {
            this.hasStartTime = true;
            let hour = parseInt(matches[1], 10);
            const minute = parseInt(matches[2], 10);
            const meridiem = matches[3] || '';
            hour += (meridiem.toLowerCase() === 'pm') ? 12 : 0;
            this.start.setHours(hour);
            this.start.setMinutes(minute);
        }
    }

    parseDescription(value) {
        let matches = value.match(this.patterns.description);
        if (matches) {
            this.description = matches[1];
        }
    }

    shortLine(d) {
        let result = '';

        if (d > this.start && d < this.end) return '→';
        if (d > this.start) return '↓';

        if (this.hasStartTime) {
            result = this.start.toLocaleString('en-US', {timeStyle: 'short'}) + ' ';
        }

        return result + this.description;
    }
}

function parseEntries() {
    const entries = new Map();

    document.querySelectorAll('BODY EVENT').forEach(node => {
        const entry = new Entry(patterns, node.innerHTML);
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
    const calendar = document.createElement('calendar');
    render(calendar, defaultStartDate());
    document.querySelector('body').prepend(calendar);
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

    parent.classList.add(containerClass);
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
            renderDateStep(child, -1);
            renderDateStep(child, 1);
            node.appendChild(child);
        }
    }

    parent.appendChild(node);
}

function renderYearMonth(parent, d) {
    const node = document.createElement('h1');
    node.innerText = d.toLocaleString('en-US', {month: 'long', year: 'numeric'});
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

    const node = document.createElement('a');
    node.classList.add('reset');
    node.href = '#';
    node.textContent = '⭯';
    parent.appendChild(node);
}

function renderDateStep(parent, step) {
    const a = document.createElement('a');
    a.classList.add('step');
    a.href = '#';
    a.innerText = (() => {
        switch (step) {
            case 1: return '⮞';
            case -1: return '⮜';
        }
    })();

    a.dataset.step = step;
    parent.appendChild(a);
}

function renderDayNames(parent, d) {
    const start = weekStart(d);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 7; i++) {
        const node = document.createElement('section');
        node.classList.add('daynames');
        const d = new Date(start.getTime() + 86400000 * i);
        node.innerText = d.toLocaleString('en-US', {weekday: 'short'});
        node.classList.add('heading');
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
        node.dataset.date = d.toISOString();
        node.classList.add('box');
        if (d < monthStart || d > monthEnd) {
            node.classList.add('inactive');
        }

        renderBoxLabel(node, d);
        renderBoxEntries(node, d);
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
            renderSingleEntry(parent, entry, d);
        }
    }
}

function renderSingleEntry(parent, entry, d) {
    const node = document.createElement('div');
    node.classList.add('entry');
    node.innerHTML = entry.shortLine(d);
    parent.appendChild(node);
}

function dateStep(d, step) {
    if (step > 0) {
        return dateStep(new Date(d.getFullYear(), d.getMonth(), 32), step - 1);
    }

    if (step < 0) {
        return dateStep(new Date(d.getFullYear(), d.getMonth(), 0), step + 1);
    }

    return d;
}

window.addEventListener('click', (e) => {
    if (e.target.matches('A.step')) {
        e.preventDefault();
        e.stopPropagation();
        const container = e.target.closest('.' + containerClass)
        const goal = dateStep(
            new Date(container.dataset.date),
            parseInt(e.target.dataset.step, 10)
        );
        render(container, goal);
    }

    if (e.target.matches('A.reset')) {
        e.preventDefault();
        e.stopPropagation();
        const container = e.target.closest('.' + containerClass);
        render(container, defaultStartDate());
    }
});

const entries = parseEntries();
setup();
