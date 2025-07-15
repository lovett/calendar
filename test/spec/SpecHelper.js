const defaultPageTitle = document.title;

beforeEach(function () {
    jasmine.addMatchers({
        toHaveDefaultDate: function (matchersUtil) {
            return {
                compare: function (viewClass, expectedDate) {
                    const view = document.querySelector(viewClass.tag);

                    return {
                        pass: view.date.getTime() == expectedDate.getTime(),
                        message: `Expected default date to be ${expectedDate}, got ${view.date}`
                    }
                }
            }
        },

        toBeTheActiveView: function (matchersUtil) {
            return {
                compare: function (viewClass) {
                    const views = document.querySelectorAll('.view[date]');
                    if (views.length > 1) {
                        return {
                            pass: false,
                            message: 'Found more than one active view.'
                        }
                    }

                    if (views.length === 0) {
                        return {
                            pass: false,
                            message: 'No active view.'
                        }
                    }

                    return {
                        pass: views[0].tagName.toLowerCase() === viewClass.tag,
                        message: "Expected " + viewClass.tag + " to be the active view."
                    }
                }
            }
        },

        toCalendarEqual: function (matchersUtil) {
            return {
                compare: function(d1, d2) {
                    if (d1 === null) {
                        return {
                            pass: false,
                            message: 'Got null rather than a date'
                        }
                    }

                    return {
                        pass: d1.getDate() == d2.getDate(),
                        message: `Expected ${d2.getDate()}, got ${d1.getDate()}`
                    }
                }
            }
        }
    });
});

afterAll(function () {
    document.title = defaultPageTitle;
});
