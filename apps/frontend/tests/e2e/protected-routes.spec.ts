import { test, expect } from "../support/merged-fixtures";

const protectedPaths = ["/chat", "/alarms", "/settings"];

test.describe("Protected Route Redirects", () => {
  for (const path of protectedPaths) {
    test(`redirects unauthenticated user from ${path} to /login @P0`, async ({ page }) => {
      // Given: an unauthenticated user
      // When: navigating to a protected path
      await page.goto(path);

      // Then: the user is redirected to the login page
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
