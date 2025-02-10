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
        }
  });
});

afterAll(function () {
    document.title = defaultPageTitle;
});
