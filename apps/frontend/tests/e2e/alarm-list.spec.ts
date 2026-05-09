import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Alarm List - 3.1-E2E-001", () => {
  test("alarm list page renders with title and container @P0", async ({ page }) => {
    // Given: user navigates to the alarms page
    await page.goto("/alarms");

    // When: the page has loaded

    // Then: the alarms page container and title are visible
    await expect(page.locator(selectors.alarms.page)).toBeVisible();
    await expect(page.locator(selectors.alarms.title)).toBeVisible();
  });

  // Skipped: alarm detail navigation requires Google OAuth authentication
  test.skip("user can navigate from alarm list to alarm detail @P0", async ({ page }) => {
    // Given: an authenticated user on the alarms page with at least one alarm
    await page.goto("/alarms");
    await expect(page.locator(selectors.alarms.page)).toBeVisible();

    // When: the user clicks on an alarm item
    const alarmItem = page.getByTestId("alarm-list-item").first();
    await expect(alarmItem).toBeVisible();
    await alarmItem.click();

    // Then: the user is navigated to the alarm detail page
    await expect(page).toHaveURL(/\/alarms\/[\w-]+/);
    await expect(page.getByTestId("alarm-detail-page")).toBeVisible();
  });

  // Skipped: empty state requires authenticated session with no alarms
  test.skip("alarm list shows empty state when no alarms exist @P0", async ({ page }) => {
    // Given: an authenticated user with no alarms
    await page.goto("/alarms");

    // When: the alarms page loads

    // Then: an empty state message is displayed
    await expect(page.getByTestId("alarms-empty-state")).toBeVisible();
  });
});
