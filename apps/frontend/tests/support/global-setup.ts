import {
  authStorageInit,
  authGlobalInit,
  setAuthProvider,
  configureAuthSession,
} from "@seontechnologies/playwright-utils/auth-session";
import { authProvider } from "./auth/auth-provider";

export default async function globalSetup() {
  setAuthProvider(authProvider);
  authStorageInit();
  configureAuthSession({
    storageDir: process.cwd() + "/.auth",
  });
  await authGlobalInit();
}
