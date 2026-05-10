import assert from "node:assert/strict";
import { test } from "node:test";

import historyPolicy from "./history-policy.js";

const { parseHistoryQuery } = historyPolicy;

test("history query defaults to the last seven days and first page", () => {
  assert.deepEqual(parseHistoryQuery("nutrition", {}, "2026-05-11"), {
    startDate: "2026-05-05",
    endDate: "2026-05-11",
    filter: "all",
    page: 1,
    limit: 20,
    skip: 0,
  });
});

test("nutrition history accepts meal type filtering and clamps pagination", () => {
  assert.deepEqual(
    parseHistoryQuery(
      "nutrition",
      {
        startDate: "2026-05-01",
        endDate: "2026-05-11",
        mealType: "lunch",
        page: "2",
        limit: "200",
      },
      "2026-05-11",
    ),
    {
      startDate: "2026-05-01",
      endDate: "2026-05-11",
      filter: "lunch",
      page: 2,
      limit: 50,
      skip: 50,
    },
  );
});

test("training history accepts category filtering", () => {
  assert.deepEqual(
    parseHistoryQuery(
      "training",
      {
        startDate: "2026-05-01",
        endDate: "2026-05-11",
        category: "cardio",
      },
      "2026-05-11",
    ),
    {
      startDate: "2026-05-01",
      endDate: "2026-05-11",
      filter: "cardio",
      page: 1,
      limit: 20,
      skip: 0,
    },
  );
});

test("history query rejects invalid filters, future dates, and ranges over ninety days", () => {
  assert.equal(parseHistoryQuery("nutrition", { mealType: "brunch" }, "2026-05-11"), null);
  assert.equal(parseHistoryQuery("training", { category: "arms" }, "2026-05-11"), null);
  assert.equal(
    parseHistoryQuery(
      "nutrition",
      { startDate: "2026-05-01", endDate: "2026-05-12" },
      "2026-05-11",
    ),
    null,
  );
  assert.equal(
    parseHistoryQuery(
      "training",
      { startDate: "2026-01-01", endDate: "2026-05-11" },
      "2026-05-11",
    ),
    null,
  );
});
