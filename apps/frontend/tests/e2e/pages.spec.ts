import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Alarms Page", () => {
  test("alarms page renders title @P1", async ({ page }) => {
    // Given: user navigates to the alarms page
    await page.goto("/alarms");

    // When: the page has loaded

    // Then: the alarms title is visible with correct text
    await expect(page.locator(selectors.alarms.title)).toBeVisible();
    await expect(page.locator(selectors.alarms.title)).toHaveText("闹钟");
  });
});

test.describe("Settings Page", () => {
  test("settings page renders title @P1", async ({ page }) => {
    // Given: user navigates to the settings page
    await page.goto("/settings");

    // When: the page has loaded

    // Then: the settings title is visible with correct text
    await expect(page.locator(selectors.settings.title)).toBeVisible();
    await expect(page.locator(selectors.settings.title)).toHaveText("设置");
  });
});
