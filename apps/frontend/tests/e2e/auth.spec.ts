import { test, expect } from "../support/merged-fixtures";
import { selectors } from "../support/helpers/selectors";
import { login } from "../support/helpers/api-client";

test.describe("Authentication", () => {
  test("user can log in with valid credentials", async ({ page }) => {
    // Given: user is on the login page
    await page.goto("/login");

    // When: user fills in valid credentials and submits
    await page.fill(selectors.auth.emailInput, process.env.TEST_USER_EMAIL || "test@example.com");
    await page.fill(selectors.auth.passwordInput, process.env.TEST_USER_PASSWORD || "password");
    await page.click(selectors.auth.submitButton);

    // Then: user is redirected to the home page
    await expect(page).toHaveURL(/\//);
  });

  test("user sees error with invalid credentials", async ({ page }) => {
    // Given: user is on the login page
    await page.goto("/login");

    // When: user fills in invalid credentials and submits
    await page.fill(selectors.auth.emailInput, "invalid@example.com");
    await page.fill(selectors.auth.passwordInput, "wrong-password");
    await page.click(selectors.auth.submitButton);

    // Then: error message is displayed
    await expect(page.locator(selectors.auth.errorMessage)).toBeVisible();
  });

  test("API login returns token", async ({ request }) => {
    // Given: valid user credentials
    const email = process.env.TEST_USER_EMAIL || "test@example.com";
    const password = process.env.TEST_USER_PASSWORD || "password";

    // When: calling login API
    const { status, body } = await login(request, email, password);

    // Then: token is returned
    expect(status).toBe(200);
    expect(body.token).toBeDefined();
  });
});
