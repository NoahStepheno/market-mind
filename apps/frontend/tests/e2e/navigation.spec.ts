import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Navigation", () => {
  test("navigates to alarms page via desktop nav @P1", async ({ page }) => {
    // Given: user is on the chat page
    await page.goto("/chat");

    // When: clicking the alarms nav link
    await page.locator(selectors.nav.alarmsLink).click();

    // Then: the alarms page is displayed
    await expect(page.locator(selectors.alarms.title)).toBeVisible();
    expect(page.url()).toContain("/alarms");
  });

  test("navigates to settings page via desktop nav @P1", async ({ page }) => {
    // Given: user is on the chat page
    await page.goto("/chat");

    // When: clicking the settings nav link
    await page.locator(selectors.nav.settingsLink).click();

    // Then: the settings page is displayed
    await expect(page.locator(selectors.settings.title)).toBeVisible();
    expect(page.url()).toContain("/settings");
  });

  test("navigates back to chat from alarms @P1", async ({ page }) => {
    // Given: user is on the alarms page
    await page.goto("/alarms");

    // When: clicking the home nav link
    await page.locator(selectors.nav.homeLink).click();

    // Then: user is redirected to the chat page
    expect(page.url()).toContain("/chat");
  });

  test("desktop header is visible @P1", async ({ page }) => {
    // Given: user is on the chat page
    await page.goto("/chat");

    // When: the page has loaded

    // Then: the app header is visible
    await expect(page.locator(selectors.nav.header)).toBeVisible();
  });
});
