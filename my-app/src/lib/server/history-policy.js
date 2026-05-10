const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_RANGE_DAYS = 90;
const NUTRITION_FILTERS = new Set(["all", "breakfast", "lunch", "dinner", "snack"]);
const TRAINING_FILTERS = new Set(["all", "chest", "back", "shoulder", "leg", "cardio"]);

function parseHistoryQuery(kind, query = {}, today = toDateKey(new Date())) {
  if (kind !== "nutrition" && kind !== "training") {
    return null;
  }

  const endDate = typeof query.endDate === "string" ? query.endDate : today;
  const startDate =
    typeof query.startDate === "string" ? query.startDate : shiftDateKey(endDate, -6);

  if (!isDateKey(startDate) || !isDateKey(endDate)) {
    return null;
  }

  if (compareDateKeys(startDate, endDate) > 0 || compareDateKeys(endDate, today) > 0) {
    return null;
  }

  if (daysBetween(startDate, endDate) + 1 > MAX_RANGE_DAYS) {
    return null;
  }

  const filter =
    kind === "nutrition"
      ? typeof query.mealType === "string"
        ? query.mealType
        : "all"
      : typeof query.category === "string"
        ? query.category
        : "all";
  const allowedFilters = kind === "nutrition" ? NUTRITION_FILTERS : TRAINING_FILTERS;

  if (!allowedFilters.has(filter)) {
    return null;
  }

  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(MAX_LIMIT, parsePositiveInteger(query.limit, DEFAULT_LIMIT));

  return {
    startDate,
    endDate,
    filter,
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isDateKey(date) {
  if (!DATE_KEY_PATTERN.test(date)) {
    return false;
  }

  const parsed = dateFromKey(date);

  return !Number.isNaN(parsed.getTime()) && toDateKey(parsed) === date;
}

function compareDateKeys(left, right) {
  return dateFromKey(left).getTime() - dateFromKey(right).getTime();
}

function daysBetween(startDate, endDate) {
  return Math.floor(
    (dateFromKey(endDate).getTime() - dateFromKey(startDate).getTime()) /
      86_400_000,
  );
}

function shiftDateKey(date, offsetDays) {
  const parsed = dateFromKey(date);
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);

  return toDateKey(parsed);
}

function dateFromKey(date) {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

module.exports = {
  parseHistoryQuery,
};
