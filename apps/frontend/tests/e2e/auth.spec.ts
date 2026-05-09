import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";

test.describe("Authentication", () => {
  test("Google sign-in button is visible on login page @P1", async ({ page }) => {
    // Given: user navigates to the login page
    await page.goto("/login");

    // When: the page has loaded
    const button = page.locator(selectors.auth.googleButton);

    // Then: the Google sign-in button is visible and has correct text
    await expect(button).toBeVisible();
    await expect(button).toHaveText(/Google/);
  });

  test("Google sign-in button redirects to Google OAuth @P1", async ({ page }) => {
    // Given: user is on the login page
    await page.goto("/login");

    // When: clicking the Google sign-in button
    const button = page.locator(selectors.auth.googleButton);
    const [response] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/v1/auth/google/start")),
      button.click(),
    ]);

    // Then: a request to the Google OAuth start endpoint is made
    expect(response.url()).toContain("/api/v1/auth/google/start");
  });

  test("login page renders main content area @P1", async ({ page }) => {
    // Given: user navigates to the login page
    await page.goto("/login");

    // When: the page has loaded
    const main = page.locator("main");

    // Then: the main element is visible
    await expect(main).toBeVisible();
  });
});
