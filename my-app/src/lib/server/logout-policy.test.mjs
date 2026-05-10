import assert from "node:assert/strict";
import { test } from "node:test";

import logoutPolicy from "./logout-policy.js";

const { getLogoutRevocationTarget } = logoutPolicy;

test("logout only revokes the current refresh token when present", () => {
  assert.deepEqual(getLogoutRevocationTarget("refresh-token"), {
    kind: "current-token",
    refreshToken: "refresh-token",
  });
});

test("logout does not revoke all devices when the current refresh cookie is missing", () => {
  assert.deepEqual(getLogoutRevocationTarget(undefined), {
    kind: "none",
  });
});
