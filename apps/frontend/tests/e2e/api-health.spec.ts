import { test, expect } from "../support/merged-fixtures";

test.describe("API Health Check", () => {
  test("backend API responds to health endpoint @P0", async ({ request }) => {
    // Given: the backend API URL
    const apiUrl = process.env.API_URL || "http://localhost:3000";

    // When: calling the health endpoint
    const response = await request.get(`${apiUrl}/api/health`);

    // Then: the API responds successfully
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
