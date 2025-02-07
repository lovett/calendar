const defaultPageTitle = document.title;

beforeEach(function () {
  jasmine.addMatchers({
  });
});

afterAll(function () {
    document.title = defaultPageTitle;
});
