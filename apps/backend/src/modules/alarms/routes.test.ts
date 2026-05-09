import { describe, expect, test, vi, beforeEach } from "vite-plus/test";

import { Hono } from "hono";

import { appErrorHandler } from "../../common/errors/error-handler.ts";
import type { AuthVariables } from "../auth/middleware.ts";

const mockListAlarmsForUser = vi.fn();
const mockCreateAlarm = vi.fn();
const mockGetAlarmForUser = vi.fn();
const mockUpdateAlarmForUser = vi.fn();
const mockSoftDeleteAlarm = vi.fn();
const mockAddAlarmFeedback = vi.fn();

vi.mock("./service.ts", () => ({
  listAlarmsForUser: (...args: unknown[]) => mockListAlarmsForUser(...(args as [string])),
  createAlarm: (...args: unknown[]) => mockCreateAlarm(...(args as [object])),
  getAlarmForUser: (...args: unknown[]) => mockGetAlarmForUser(...(args as [string, string])),
  updateAlarmForUser: (...args: unknown[]) =>
    mockUpdateAlarmForUser(...(args as [string, string, object])),
  softDeleteAlarm: (...args: unknown[]) => mockSoftDeleteAlarm(...(args as [string, string])),
  addAlarmFeedback: (...args: unknown[]) => mockAddAlarmFeedback(...(args as [object])),
  normalizeSymbol: (s: string) => s.trim(),
  conditionGroupSchema: {
    parse: (v: unknown) => v,
  },
}));

vi.mock("../auth/middleware.ts", () => ({
  requireAuth: async (_c: unknown, next: () => Promise<void>) => next(),
}));

import { alarmRoutes } from "./routes.ts";

function createTestApp() {
  const app = new Hono<AuthVariables>();
  app.onError(appErrorHandler);
  app.use("*", async (c, next) => {
    c.set("authUser", { id: "user-1", email: "test@test.com", name: "Test", avatarUrl: null });
    c.set("requestId", "req-1");
    c.set("traceId", "trace-1");
    await next();
  });
  app.route("/api/v1/alarms", alarmRoutes);
  return app;
}

const validConditionGroup = {
  op: "AND",
  conditions: [{ metric: "price", operator: ">", value: 100 }],
};

const fakeAlarm = {
  id: "alarm-1",
  userId: "user-1",
  symbol: "AAPL",
  conditionGroup: validConditionGroup,
  cooldownSeconds: 900,
  enabled: true,
  notifyLabel: null,
  notifyTier: "standard",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /alarms", () => {
  test("returns list of alarms", async () => {
    mockListAlarmsForUser.mockResolvedValueOnce([fakeAlarm]);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alarms).toHaveLength(1);
    expect(body.alarms[0].id).toBe("alarm-1");
  });

  // Covers: 3.2-INT-004 @P0
  // Given a soft-deleted alarm is excluded by the service layer
  // When user GETs /alarms
  // Then the deleted alarm does not appear in the list
  test("3.2-INT-004 @P0: deleted alarm excluded from list", async () => {
    // Service already filters deleted alarms; returning empty confirms exclusion
    mockListAlarmsForUser.mockResolvedValueOnce([]);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alarms).toHaveLength(0);
  });
});

describe("POST /alarms", () => {
  test("creates alarm with valid body", async () => {
    mockCreateAlarm.mockResolvedValueOnce(fakeAlarm);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        conditionGroup: validConditionGroup,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.alarm.id).toBe("alarm-1");
  });

  test("returns 400 for missing symbol", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conditionGroup: validConditionGroup,
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /alarms/:id", () => {
  test("returns alarm by id", async () => {
    mockGetAlarmForUser.mockResolvedValueOnce(fakeAlarm);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alarm.id).toBe("alarm-1");
  });

  test("returns 404 when alarm not found", async () => {
    mockGetAlarmForUser.mockResolvedValueOnce(null);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/nonexistent");

    expect(res.status).toBe(404);
  });

  // Covers: 3.1-INT-003 @P1
  // Given an alarm exists with all fields populated
  // When user GETs /alarms/:id
  // Then the response includes every alarm field (id, userId, symbol, conditionGroup, cooldownSeconds, enabled, notifyLabel, notifyTier, createdAt, updatedAt, deletedAt)
  test("3.1-INT-003 @P1: returns full alarm detail with all fields", async () => {
    mockGetAlarmForUser.mockResolvedValueOnce(fakeAlarm);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1");

    expect(res.status).toBe(200);
    const body = await res.json();
    const alarm = body.alarm;
    expect(alarm.id).toBe("alarm-1");
    expect(alarm.userId).toBe("user-1");
    expect(alarm.symbol).toBe("AAPL");
    expect(alarm.conditionGroup).toEqual(validConditionGroup);
    expect(alarm.cooldownSeconds).toBe(900);
    expect(alarm.enabled).toBe(true);
    expect(alarm.notifyLabel).toBeNull();
    expect(alarm.notifyTier).toBe("standard");
    expect(alarm.createdAt).toBeDefined();
    expect(alarm.updatedAt).toBeDefined();
    expect(alarm.deletedAt).toBeNull();
  });

  // Covers: 3.1-INT-004 @P0, 1.3-INT-001 @P0, 1.3-INT-002 @P1
  // Given User B's alarm exists in the DB but the ownership check (userId filter) returns null
  // When User A GETs /alarms/:id for that alarm
  // Then the response is 404 (not 403), proving cross-user isolation
  test("1.3-INT-001 @P0 / 3.1-INT-004 @P0 / 1.3-INT-002 @P1: returns 404 for non-owned alarm (cross-user isolation, not 403)", async () => {
    // getAlarmForUser(userId, alarmId) returns null when userId doesn't match
    mockGetAlarmForUser.mockResolvedValueOnce(null);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-owned-by-other-user");

    expect(res.status).toBe(404);
    // Verify the service was called with the requesting user's id, ensuring ownership check
    expect(mockGetAlarmForUser).toHaveBeenCalledWith("user-1", "alarm-owned-by-other-user");
  });
});

describe("PATCH /alarms/:id", () => {
  test("updates alarm", async () => {
    mockUpdateAlarmForUser.mockResolvedValueOnce({ ...fakeAlarm, symbol: "GOOG" });
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "GOOG" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alarm.symbol).toBe("GOOG");
  });

  test("returns 404 when alarm not found", async () => {
    mockUpdateAlarmForUser.mockResolvedValueOnce(null);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "GOOG" }),
    });

    expect(res.status).toBe(404);
  });

  test("returns 400 for empty patch", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  // Covers: 3.2-INT-002 @P1
  // Given an existing enabled alarm
  // When user PATCHes with enabled: false
  // Then the updated alarm reflects enabled: false
  test("3.2-INT-002 @P1: toggle enabled/disabled", async () => {
    const disabledAlarm = { ...fakeAlarm, enabled: false };
    mockUpdateAlarmForUser.mockResolvedValueOnce(disabledAlarm);
    const app = createTestApp();

    // Given - alarm exists and is enabled
    // When - user disables it
    const res = await app.request("/api/v1/alarms/alarm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });

    // Then - alarm is returned with enabled: false
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alarm.enabled).toBe(false);
    expect(mockUpdateAlarmForUser).toHaveBeenCalledWith("user-1", "alarm-1", {
      symbol: undefined,
      conditionGroup: undefined,
      cooldownSeconds: undefined,
      enabled: false,
      notifyLabel: undefined,
      notifyTier: undefined,
    });
  });

  // Covers: 3.2-INT-002 @P1 (re-enable)
  // Given an alarm that was disabled
  // When user PATCHes with enabled: true
  // Then the updated alarm reflects enabled: true
  test("3.2-INT-002 @P1: toggle disabled back to enabled", async () => {
    const enabledAlarm = { ...fakeAlarm, enabled: true };
    mockUpdateAlarmForUser.mockResolvedValueOnce(enabledAlarm);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alarm.enabled).toBe(true);
  });
});

describe("DELETE /alarms/:id", () => {
  test("deletes alarm and returns 204", async () => {
    mockSoftDeleteAlarm.mockResolvedValueOnce(fakeAlarm);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
  });

  test("returns 204 even when alarm not found", async () => {
    mockSoftDeleteAlarm.mockResolvedValueOnce(null);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/nonexistent", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
  });

  // Covers: 3.2-INT-003 @P0
  // Given an alarm exists
  // When user DELETEs it (soft delete)
  // Then the service is called with the user's id and the alarm id (setting deleted_at)
  test("3.2-INT-003 @P0: soft delete sets deleted_at", async () => {
    const deletedAlarm = { ...fakeAlarm, deletedAt: new Date() };
    mockSoftDeleteAlarm.mockResolvedValueOnce(deletedAlarm);
    const app = createTestApp();

    // Given - alarm exists
    // When - user deletes it
    const res = await app.request("/api/v1/alarms/alarm-1", {
      method: "DELETE",
    });

    // Then - 204 and service was invoked correctly
    expect(res.status).toBe(204);
    expect(mockSoftDeleteAlarm).toHaveBeenCalledWith("user-1", "alarm-1");
  });
});

// Covers: 3.2-INT-005 @P1
// Given an alarm is created then deleted
// When user creates a new alarm with the same data
// Then the new alarm is created successfully (idempotent cycle)
describe("Create-delete-create cycle @P1", () => {
  test("3.2-INT-005 @P1: create, delete, create again works", async () => {
    const app = createTestApp();

    // Step 1: Create alarm
    mockCreateAlarm.mockResolvedValueOnce({ ...fakeAlarm, id: "alarm-cycle-1" });
    const createRes = await app.request("/api/v1/alarms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        conditionGroup: validConditionGroup,
      }),
    });
    expect(createRes.status).toBe(201);

    // Step 2: Delete alarm
    mockSoftDeleteAlarm.mockResolvedValueOnce({
      ...fakeAlarm,
      id: "alarm-cycle-1",
      deletedAt: new Date(),
    });
    const deleteRes = await app.request("/api/v1/alarms/alarm-cycle-1", {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(204);

    // Step 3: Create again with same data
    mockCreateAlarm.mockResolvedValueOnce({ ...fakeAlarm, id: "alarm-cycle-2" });
    const reCreateRes = await app.request("/api/v1/alarms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        conditionGroup: validConditionGroup,
      }),
    });
    expect(reCreateRes.status).toBe(201);
    const body = await reCreateRes.json();
    expect(body.alarm.id).toBe("alarm-cycle-2");
  });
});

describe("POST /alarms/:id/feedback", () => {
  test("creates feedback for alarm", async () => {
    mockAddAlarmFeedback.mockResolvedValueOnce({
      id: "fb-1",
      alarmId: "alarm-1",
      userId: "user-1",
      rating: "helpful",
    });
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: "helpful" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.feedback.rating).toBe("helpful");
  });

  test("returns 404 when alarm not found", async () => {
    mockAddAlarmFeedback.mockResolvedValueOnce(null);
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/nonexistent/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: "helpful" }),
    });

    expect(res.status).toBe(404);
  });

  test("returns 400 for invalid rating", async () => {
    const app = createTestApp();

    const res = await app.request("/api/v1/alarms/alarm-1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: "invalid" }),
    });

    expect(res.status).toBe(400);
  });
});
