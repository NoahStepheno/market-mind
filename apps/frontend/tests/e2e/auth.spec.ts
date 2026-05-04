import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Authentication", () => {
  test("Google sign-in button is visible on login page", async ({ page }) => {
    await page.goto("/login");

    const button = page.locator(selectors.auth.googleButton);
    await expect(button).toBeVisible();
    await expect(button).toHaveText(/Google/);
  });

  test("Google sign-in button redirects to Google OAuth", async ({ page }) => {
    await page.goto("/login");

    const button = page.locator(selectors.auth.googleButton);
    const [response] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/v1/auth/google/start")),
      button.click(),
    ]);

    expect(response.url()).toContain("/api/v1/auth/google/start");
  });

  test("login page has correct background", async ({ page }) => {
    await page.goto("/login");

    const main = page.locator("main");
    await expect(main).toBeVisible();
    await expect(main).toHaveClass(/bg-apple-surface-tile-1/);
  });
});
