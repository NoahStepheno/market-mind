import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Home Page", () => {
  test("home page loads correctly @P1", async ({ page }) => {
    // Given: user navigates to the home page
    await page.goto("/");

    // When: the page has finished loading

    // Then: the home title is visible
    await expect(page.locator(selectors.home.title)).toBeVisible();
  });

  test("navigation elements are visible @P1", async ({ page }) => {
    // Given: user is on the home page
    await page.goto("/");

    // When: the page has finished loading

    // Then: header and navigation links are present
    await expect(page.locator(selectors.nav.header)).toBeVisible();
    await expect(page.locator(selectors.nav.homeLink)).toBeVisible();
    await expect(page.locator(selectors.nav.alarmsLink)).toBeVisible();
  });
});
