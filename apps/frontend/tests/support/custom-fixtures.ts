import { test as base } from "@playwright/test";
import { createUser, type User } from "./factories/user-factory";

export const test = base.extend<{ testUser: User }>({
  testUser: async (_args, use) => {
    const user = createUser();
    await use(user);
  },
});
