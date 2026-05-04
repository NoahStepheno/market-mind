import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Home Page", () => {
  test("home page loads correctly", async ({ page }) => {
    // Given: user navigates to the home page
    await page.goto("/");

    // Then: the home title is visible
    await expect(page.locator(selectors.home.title)).toBeVisible();
  });

  test("navigation elements are visible", async ({ page }) => {
    // Given: user is on the home page
    await page.goto("/");

    // Then: header and navigation links are present
    await expect(page.locator(selectors.nav.header)).toBeVisible();
    await expect(page.locator(selectors.nav.homeLink)).toBeVisible();
    await expect(page.locator(selectors.nav.alarmsLink)).toBeVisible();
  });
});
