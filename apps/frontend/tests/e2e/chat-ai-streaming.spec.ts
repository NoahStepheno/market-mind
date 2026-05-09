import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Chat AI Streaming E2E (ATDD) — 2.3-E2E", () => {
  // All tests skipped: require Google OAuth authenticated session.
  // These scaffolds verify the AI NL parsing + SSE streaming user journey.
  // Activate by removing test.skip() one at a time during GREEN phase.

  // Given: an authenticated user on the chat page
  // When: the user types a supported NL alarm request and submits
  // Then: an assistant message appears with streaming AI-generated text
  test.skip("user submits NL message and sees streaming AI response @P0", async ({ page }) => {
    // Given: authenticated user on chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: user types and submits a NL alarm request
    await page.locator(selectors.chat.composer).fill("当贵州茅台股价超过1800元时提醒我");
    await page.locator(selectors.chat.sendButton).click();

    // Then: assistant message appears with streaming text
    await expect(page.locator(selectors.chat.assistantMessage)).toBeVisible({
      timeout: 10000,
    });

    // And: the response contains relevant alarm-related content
    await expect(page.getByText(/茅台|1800|股价/)).toBeVisible({ timeout: 15000 });
  });

  // Given: an authenticated user who has submitted a valid NL alarm request
  // When: the AI parser returns a valid draft
  // Then: a draft alarm preview card appears in the chat thread
  test.skip("draft alarm preview appears for valid NL alarm request @P0", async ({ page }) => {
    // Given: authenticated user on chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: user submits a supported alarm request
    await page.locator(selectors.chat.composer).fill("当平安银行股价低于15元时提醒我");
    await page.locator(selectors.chat.sendButton).click();

    // Then: draft alarm card appears
    await expect(page.locator(selectors.chat.draftCard)).toBeVisible({
      timeout: 15000,
    });

    // And: card shows parsed alarm details
    await expect(page.getByText(/平安银行|15/)).toBeVisible();
  });

  // Given: an authenticated user on the chat page
  // When: the streaming response is active
  // Then: text renders progressively (not all at once)
  test.skip("assistant response text renders progressively via SSE @P0", async ({ page }) => {
    // Given: authenticated user on chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: user submits a message
    await page.locator(selectors.chat.composer).fill("当沪深300涨幅超过2%时提醒我");
    await page.locator(selectors.chat.sendButton).click();

    // Then: text appears progressively — streaming indicator visible first
    await expect(page.locator(selectors.chat.streamingIndicator)).toBeVisible({ timeout: 5000 });

    // And: eventually the complete response is rendered
    await expect(page.getByText(/沪深300|涨幅|2%/)).toBeVisible({ timeout: 15000 });

    // And: streaming indicator disappears after completion
    await expect(page.locator(selectors.chat.streamingIndicator)).not.toBeVisible({
      timeout: 10000,
    });
  });

  // Given: an authenticated user on the chat page
  // When: the user types an unsupported metric request (e.g., MACD)
  // Then: the AI responds with a Chinese text explanation of the limitation
  test.skip("unsupported metric shows Chinese text explanation @P1", async ({ page }) => {
    // Given: authenticated user on chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: user submits an unsupported metric request
    await page.locator(selectors.chat.composer).fill("MACD金叉时提醒我买入");
    await page.locator(selectors.chat.sendButton).click();

    // Then: assistant responds with text explanation (not a broken draft)
    await expect(page.locator(selectors.chat.assistantMessage)).toBeVisible({
      timeout: 10000,
    });

    // And: explanation mentions unsupported metrics or available options
    await expect(page.getByText(/不支持|不可用|可用指标/)).toBeVisible({ timeout: 15000 });

    // And: no broken alarm draft card is shown
    await expect(page.locator(selectors.chat.draftCard)).not.toBeVisible();
  });

  // Given: an authenticated user on the chat page
  // When: an unsupported metric is detected
  // Then: the response includes available metrics information
  test.skip("unsupported response includes available metrics information @P1", async ({ page }) => {
    // Given: authenticated user on chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: user submits an unsupported metric request
    await page.locator(selectors.chat.composer).fill("布林带突破时提醒我");
    await page.locator(selectors.chat.sendButton).click();

    // Then: response shows available metrics
    await expect(page.locator(selectors.chat.unsupportedExplanation)).toBeVisible({
      timeout: 15000,
    });

    // And: at least some supported metrics are mentioned
    await expect(page.getByText(/价格|涨跌幅|成交量/)).toBeVisible({ timeout: 15000 });
  });

  // Given: an authenticated user on the chat page with an active stream
  // When: the SSE connection is lost
  // Then: the chat displays "连接中断" message
  test.skip("SSE disconnect displays connection lost message @P2", async ({ page, context }) => {
    // Given: authenticated user on chat page
    await page.goto("/chat");
    await expect(page.locator(selectors.chat.composer)).toBeVisible();

    // When: user submits a message and stream starts
    await page.locator(selectors.chat.composer).fill("当比亚迪股价超过300元时提醒我");
    await page.locator(selectors.chat.sendButton).click();

    // Simulate connection loss by going offline
    await context.setOffline(true);

    // Then: connection error message appears
    await expect(page.locator(selectors.chat.connectionError)).toBeVisible({ timeout: 10000 });

    // And: message contains reconnecting text
    await expect(page.getByText(/连接中断|重连/)).toBeVisible();

    // Cleanup: restore network
    await context.setOffline(false);
  });
});
