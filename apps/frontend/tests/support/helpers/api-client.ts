import { APIRequestContext } from "@playwright/test";
import { createUser, type User } from "../factories/user-factory";
import { createAlarm, type Alarm } from "../factories/alarm-factory";

const API_URL = process.env.API_URL || "http://localhost:3000";

export async function login(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  return { status: response.status(), body: await response.json() };
}

export async function seedUser(request: APIRequestContext, overrides: Partial<User> = {}) {
  const user = createUser(overrides);
  const response = await request.post(`${API_URL}/api/users`, {
    data: user,
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed user: ${response.status()}`);
  }
  return { ...user, ...(await response.json()) };
}

export async function seedAlarm(request: APIRequestContext, overrides: Partial<Alarm> = {}) {
  const alarm = createAlarm(overrides);
  const response = await request.post(`${API_URL}/api/alarms`, {
    data: alarm,
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed alarm: ${response.status()}`);
  }
  return { ...alarm, ...(await response.json()) };
}
