import { test, expect } from "../support/merged-fixtures";

test.describe("Auth Callback Page", () => {
  test("shows invalid callback when no code is present @P2", async ({ page }) => {
    // Given: user navigates to the auth callback with no code parameter
    await page.goto("/auth/callback");

    // When: the callback page loads

    // Then: invalid callback message and back-to-login link are shown
    await expect(page.getByText("Invalid callback")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Login" })).toBeVisible();
  });

  test("shows sign-in failed when error param is present @P2", async ({ page }) => {
    // Given: user navigates to the auth callback with an error parameter
    await page.goto("/auth/callback?error=access_denied&error_description=User+cancelled");

    // When: the callback page loads

    // Then: sign-in failed message with error details and retry link are shown
    await expect(page.getByText("Sign in failed")).toBeVisible();
    await expect(page.getByText("User cancelled")).toBeVisible();
    await expect(page.getByRole("link", { name: "Try Again" })).toBeVisible();
  });
});
