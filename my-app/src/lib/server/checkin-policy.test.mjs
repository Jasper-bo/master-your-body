import assert from "node:assert/strict";
import { test } from "node:test";

import checkinPolicy from "./checkin-policy.js";

const { getCheckInMutation, parseCheckInRequest } = checkinPolicy;

test("hydration check-in records water amount and completion from the user target", () => {
  const input = parseCheckInRequest("hydration", {
    value: 1750,
    date: "2026-05-10",
  });

  assert.deepEqual(input, {
    kind: "hydration",
    date: "2026-05-10",
    value: 1750,
  });
  assert.deepEqual(getCheckInMutation(input, { waterTargetMl: 2000 }), {
    waterIntakeMl: 1750,
    waterIntake: false,
  });
  assert.deepEqual(getCheckInMutation(input, { waterTargetMl: 1500 }), {
    waterIntakeMl: 1750,
    waterIntake: true,
  });
});

test("sleep check-in records hours and completion from the user target", () => {
  const input = parseCheckInRequest("sleep", {
    value: 7.5,
    date: "2026-05-10",
  });

  assert.deepEqual(input, {
    kind: "sleep",
    date: "2026-05-10",
    value: 7.5,
  });
  assert.deepEqual(getCheckInMutation(input, { sleepTargetHours: 8 }), {
    sleepActualHours: 7.5,
    sleepQuality: false,
  });
  assert.deepEqual(getCheckInMutation(input, { sleepTargetHours: 7.5 }), {
    sleepActualHours: 7.5,
    sleepQuality: true,
  });
});

test("manual check-in only accepts hydration and sleep with realistic values", () => {
  assert.equal(parseCheckInRequest("exercise", { value: 1 }), null);
  assert.equal(parseCheckInRequest("hydration", { value: -1 }), null);
  assert.equal(parseCheckInRequest("hydration", { value: 10001 }), null);
  assert.equal(parseCheckInRequest("sleep", { value: 0 }), null);
  assert.equal(parseCheckInRequest("sleep", { value: 25 }), null);
});
