import assert from "node:assert/strict";
import { test } from "node:test";

import apiTransport from "./api-transport.js";

const { createApiRequester } = apiTransport;

test("authenticated requests refresh once and retry without bearer tokens", async () => {
  const calls = [];
  const request = createApiRequester({
    fetchImpl: async (path, init = {}) => {
      calls.push({ path, init });

      if (path === "/api/auth/refresh") {
        return Response.json({ success: true, data: {}, error: null, meta: {} });
      }

      if (calls.filter((call) => call.path === "/api/users/me").length === 1) {
        return Response.json(
          {
            success: false,
            data: null,
            error: { code: "UNAUTHORIZED", message: "expired", details: null },
            meta: {},
          },
          { status: 401 },
        );
      }

      return Response.json({
        success: true,
        data: { id: "user_1" },
        error: null,
        meta: {},
      });
    },
  });

  const data = await request("/api/users/me", {}, { auth: true });

  assert.deepEqual(data, { id: "user_1" });
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/api/users/me", "/api/auth/refresh", "/api/users/me"],
  );
  assert.equal(calls[0].init.headers.has("Authorization"), false);
  assert.equal(calls[2].init.headers.has("Authorization"), false);
  assert.equal(calls[1].init.credentials, "same-origin");
});

test("authenticated requests do not retry refresh failures forever", async () => {
  const calls = [];
  const request = createApiRequester({
    fetchImpl: async (path) => {
      calls.push(path);

      return Response.json(
        {
          success: false,
          data: null,
          error: { code: "UNAUTHORIZED", message: "expired", details: null },
          meta: {},
        },
        { status: 401 },
      );
    },
  });

  await assert.rejects(
    request("/api/users/me", {}, { auth: true }),
    /expired/,
  );
  assert.deepEqual(calls, ["/api/users/me", "/api/auth/refresh"]);
});

test("concurrent authenticated requests share one refresh operation", async () => {
  const calls = [];
  let refreshResponse;
  const request = createApiRequester({
    fetchImpl: async (path, init = {}) => {
      calls.push({ path, init });

      if (path === "/api/auth/refresh") {
        refreshResponse ??= Response.json({
          success: true,
          data: {},
          error: null,
          meta: {},
        });

        return refreshResponse;
      }

      const pathCallCount = calls.filter((call) => call.path === path).length;

      if (pathCallCount === 1) {
        return Response.json(
          {
            success: false,
            data: null,
            error: { code: "UNAUTHORIZED", message: "expired", details: null },
            meta: {},
          },
          { status: 401 },
        );
      }

      return Response.json({
        success: true,
        data: { path },
        error: null,
        meta: {},
      });
    },
  });

  const [first, second] = await Promise.all([
    request("/api/users/me", {}, { auth: true }),
    request("/api/dashboard", {}, { auth: true }),
  ]);

  assert.deepEqual(first, { path: "/api/users/me" });
  assert.deepEqual(second, { path: "/api/dashboard" });
  assert.equal(
    calls.filter((call) => call.path === "/api/auth/refresh").length,
    1,
  );
});
