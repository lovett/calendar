# Calendar

A calendar from an HTML file.

## Why
Desktop and web-based calendar applications are often social and business-y. They help you wrangle attendees, set up video conferencing, reserve a conference room, and block out your busyness across the days. All things I have no use for 99% of the time.

Calendar UIs also tend to need a lot of clicking around to get anything done. The standard thing is to have a form-based interaction that necessarily constrains what you can do. Copy-and-paste? Maybe. Search-and-replace? Probably not.

Calendar applications are ultimately specialized databases. The premise of this one is that a modern but ordinary HTML document can act like a database if the conditions are right.

Certain things are missing—there's no syncing, sharing, or inviting. It's an approach that won't work for everyone, but it can work.

## How
1. Make a copy of `calendar-template.html`. Give it a cool name.
2. Add `<cal-event>` tags to that file. See below for details.
3. View that file in a browser.

Viewing the HTML file locally should work fine. Or host them as static files. It's very much a DIY situation. Other than the HTML file, the entirety of the application is in `calendar.js` and the styling is in `calendar.css`. No transpiling, no framework, no package.json, no chaff.

## Events

A custom HTML tag `<cal-event>` is used to define the events that are shown on the calendar. Dates, times, and descriptions go into the text of the tag and the application figures out the rest. For example:

```
<cal-event>1999-12-31 Prepare for Y2K</cal-event>
```

This is an all-day event. The only recognized date format is yyyy-mm-dd.

```
<cal-event>2000-01-01 to 2000-01-07 Rebuild society following Y2K</cal-event>
```

An event with two dates is treated as a multi-day event. The separator (the word "to" in this example) doesn't matter.

```
<cal-event>2000-01-08 9:00 AM Reassess</cal-event>
```

Events that occur at specific times can be expressed in 12- or 24-hour formats. If found, the first one is treated as the start and the second as the end.

The rest of the tag content is treated as the event title and description. Its structure is open-ended. Do whatever.

```
<cal event>
    2000-01-09 10:00 AM to 10:30 AM
    <a href="http://example.com">Brainstorming session</a>
    <details>This part only shows up on the day view.</details>
</cal-event>
```

Although `cal-event` is a custom tag, it inherits behavior from standard HTML tags. You can define CSS classes or inline styles in your HTML file to jazz up an event's presentation. There's also a special `data-icon` attribute that can be used to set a custom Emoji as the icon for an event. You can also reference SVG symbols if you've added an SVG `<defs>` tag to the page.

## Customization
A couple things can be customized by adding special meta tags to the HTML document:

*Name*: displayed in the header:
```
<meta name="name" content="Name of My Calendar" />
```

*Locale*: normally determined by the browser, but able to be overridden:
```
<meta name="locale" content="FR_fr" />
```

*Latitude* and *Longitude*: Used to show sunrise and sunset times on the day view. If this is something you want, add an additional script tag to your HTML file that loads `extras/sunrise.js`:

``
<meta name="latitude" content="40.7128" />
<meta name="longitude" content="-74.006" />
<script defer src="extras/sunrise.js"></script>
```

*Start*: A date in `yyyy-mm-dd` format that should be shown by default instead of the current date:

```
<meta name="date" content="1999-12-31" />
```

*Version*: when set, turns on caching for a slight speedup. The cache only lasts while the browser window is open. Ideally, the version is changed whenever events are added or changed.

```
<meta name="version" content="anything" />
```

## Linking
A calendar's default date can be set from the URL hash. If present, it takes precedence over the date meta tag.

The URL hash can be a date or a localized keyword phrase:
  - yyyy-mm-dd
  - yyyy-mm
  - yyyy
  - today
  - yesterday
  - tomorrow
  - this-month
  - last-month
  - next-month
  - this-year
  - last-year
  - next-year


## Acknowledgements

This project uses icons from:

* [Feather icons](https://feathericons.com)
* [Phosphor icons](https://github.com/phosphor-icons/core)
