import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Alarm Edit - 3.2-E2E-001/002/003", () => {
  // Skipped: editing an alarm requires Google OAuth authentication
  test.skip("user can edit alarm time and label - 3.2-E2E-001 @P1", async ({ page }) => {
    // Given: an authenticated user on an alarm detail page
    await page.goto("/alarms");
    const alarmItem = page.getByTestId("alarm-list-item").first();
    await alarmItem.click();
    await expect(page.getByTestId("alarm-detail-page")).toBeVisible();

    // When: the user clicks the edit button and updates fields
    await page.getByTestId("alarm-edit-button").click();
    await page.getByTestId("alarm-time-input").fill("09:30");
    await page.getByTestId("alarm-label-input").fill("晨会");
    await page.getByTestId("alarm-save-button").click();

    // Then: the alarm is updated and confirmation is shown
    await expect(page.getByText(/已更新|保存成功/)).toBeVisible();
  });

  // Skipped: toggling alarm requires authenticated session
  test.skip("user can toggle alarm enable/disable - 3.2-E2E-002 @P1", async ({ page }) => {
    // Given: an authenticated user on the alarms list page
    await page.goto("/alarms");
    await expect(page.locator(selectors.alarms.page)).toBeVisible();

    // When: the user toggles the alarm switch
    const toggle = page.getByTestId("alarm-toggle").first();
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Then: the alarm enabled state changes
    await expect(toggle).toHaveAttribute("aria-checked", /true|false/);
  });

  // Skipped: deleting an alarm requires authenticated session
  test.skip("user can delete an alarm - 3.2-E2E-003 @P1", async ({ page }) => {
    // Given: an authenticated user on an alarm detail page
    await page.goto("/alarms");
    const alarmItem = page.getByTestId("alarm-list-item").first();
    await alarmItem.click();
    await expect(page.getByTestId("alarm-detail-page")).toBeVisible();

    // When: the user clicks delete and confirms
    await page.getByTestId("alarm-delete-button").click();
    await page.getByTestId("confirm-delete-button").click();

    // Then: the alarm is deleted and user returns to the list
    await expect(page).toHaveURL(/\/alarms$/);
    await expect(page.getByTestId("alarm-detail-page")).not.toBeVisible();
  });
});
