const containerClass = 'calendar'

class Entry {
    static datePattern = /(\d{4})-(\d{2})-(\d{2})/g;
    static timePattern = /(\d{1,2}):(\d{1,2})\s*([AP]M)?/;
    static descriptionPattern = /,\s*(.*)/;
    start = null;
    end = null;
    description = null;
    hasStartTime = false;
    hasEndTime = false;

    constructor(value) {
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
        for (const matches of value.matchAll(Entry.datePattern)) {
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

        const matches = value.match(Entry.timePattern);
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
        let matches = value.match(Entry.descriptionPattern);
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
        const entry = new Entry(node.innerHTML);
        const key = yearmonth(entry.start);
        if (!entries.has(key)) {
            entries.set(key, []);
        }

        const collection = entries.get(key);
        collection.push(entry);
    });

    return entries;
}

const entries = parseEntries();

function setup() {
    const body = document.querySelector('BODY');
    const calendar = document.createElement('CALENDAR');
    body.prepend(calendar);
    render();
}

setup();


function render() {
    let parent, container, d;
    if (arguments.length === 0) {
        parent = document.querySelector('CALENDAR');
        d = new Date();
        d.setDate(1);
    }

    if (arguments.length === 3) {
        parent = arguments[0];
        d = new Date(arguments[1], arguments[2]);
    }

    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);

    container = document.createElement('div');
    container.classList.add(containerClass);
    container.dataset.date = d.toISOString();

    renderNav(container, d);
    renderHeaders(container, d);
    renderBoxes(container, d);
    parent.replaceChildren(container);
}


function renderNav(parent, d) {
    const nav = document.createElement('nav');
    renderDatePicker(nav, d);
    parent.appendChild(nav);
    //container.appendChild(datePicker(d));
    //return container;
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

function renderDatePicker(parent, d) {
    const node = document.createElement('div');
    node.classList.add('datepicker');
    renderDatePickerButton(node, -12);
    renderDatePickerButton(node, -1);
    renderDatePickerText(node, d);
    renderDatePickerButton(node, 1);
    renderDatePickerButton(node, 12);
    parent.appendChild(node);
}

function renderDatePickerText(parent, d) {
    const node = document.createElement('time');
    node.setAttribute('datetime',  d.toISOString());
    node.innerText = d.toLocaleString('en-US', {month: 'long', year: 'numeric'});
    parent.appendChild(node);
}

function renderDatePickerButton(parent, step) {
    const node = document.createElement('button');
    node.innerText = step < 0 ? '<' : '>';
    node.dataset.step = step;
    parent.appendChild(node);
}

function renderHeaders(parent, d) {
    const start = weekStart(d);

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 7; i++) {
        const node = document.createElement('div');
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

    for (entry of collection.toSorted()) {
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

function displayedDate(container) {
    const node = container.querySelector('.datepicker time');
    return new Date(node.getAttribute('datetime'));
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
    if (e.target.nodeName == 'BUTTON' && e.target.closest('.datepicker')) {
        e.preventDefault();
        e.stopPropagation();
        const container = e.target.closest('.' + containerClass)
        const step = parseInt(e.target.dataset.step, 10);
        const now = displayedDate(container);
        const goal = dateStep(now, step);
        render(container.parentNode, goal.getFullYear(), goal.getMonth());
    }
});
