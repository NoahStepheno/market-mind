import { betterAuth } from "better-auth";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getGoogleCallbackUrl(): string {
  const baseUrl = requireEnv("BETTER_AUTH_URL").replace(/\/$/, "");
  return `${baseUrl}/api/v1/auth/google/callback`;
}

export const auth = betterAuth({
  secret: requireEnv("BETTER_AUTH_SECRET"),
  baseURL: requireEnv("BETTER_AUTH_URL"),
  socialProviders: {
    google: () => ({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirectURI: getGoogleCallbackUrl(),
    }),
  },
});
