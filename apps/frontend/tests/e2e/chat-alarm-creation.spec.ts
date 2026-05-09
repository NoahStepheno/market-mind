import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Chat Alarm Creation - 2.5-E2E-001", () => {
  // Skipped: full NL alarm creation flow requires Google OAuth authentication
  // which cannot be automated in CI without an authenticated session.
  test.skip("user creates alarm via natural language message @P0", async ({ page }) => {
    // Given: an authenticated user on the chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: the user types a natural language alarm request
    await page.locator(selectors.chat.composer).fill("明天早上8点提醒我开会");
    await page.locator(selectors.chat.sendButton).click();

    // Then: a draft alarm preview appears in the chat
    await expect(page.getByTestId("alarm-draft-card")).toBeVisible();
    await expect(page.getByText("08:00")).toBeVisible();

    // When: the user confirms the alarm
    await page.getByTestId("alarm-confirm-button").click();

    // Then: the alarm is created and success feedback is shown
    await expect(page.getByText(/闹钟已创建|已设置/)).toBeVisible();
  });

  // Skipped: requires authenticated session for chat interaction
  test.skip("user cancels alarm draft from chat @P0", async ({ page }) => {
    // Given: an authenticated user on the chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: the user types a natural language alarm request
    await page.locator(selectors.chat.composer).fill("每天下午3点提醒我喝水");
    await page.locator(selectors.chat.sendButton).click();

    // Then: a draft alarm preview appears
    await expect(page.getByTestId("alarm-draft-card")).toBeVisible();

    // When: the user cancels the draft
    await page.getByTestId("alarm-cancel-button").click();

    // Then: the draft is dismissed and no alarm is created
    await expect(page.getByTestId("alarm-draft-card")).not.toBeVisible();
  });
});
