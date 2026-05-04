import { mergeTests } from "@playwright/test";
import { setAuthProvider } from "@seontechnologies/playwright-utils/auth-session";
import { createAuthFixtures } from "@seontechnologies/playwright-utils/auth-session/fixtures";
import { test as apiRequestFixture } from "@seontechnologies/playwright-utils/api-request/fixtures";
import { test as recurseFixture } from "@seontechnologies/playwright-utils/recurse/fixtures";
import { test as logFixture } from "@seontechnologies/playwright-utils/log/fixtures";
import { test as customFixtures } from "./custom-fixtures";
import { authProvider } from "./auth/auth-provider";

setAuthProvider(authProvider);

const authFixture = customFixtures.extend(
  createAuthFixtures() as unknown as Parameters<typeof customFixtures.extend>[0],
);

export const test = mergeTests(apiRequestFixture, recurseFixture, logFixture, authFixture);

export { expect } from "@playwright/test";
