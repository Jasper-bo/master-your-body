const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseCheckInRequest(checkInId, body = {}) {
  if (checkInId !== "hydration" && checkInId !== "sleep") {
    return null;
  }

  const date = typeof body.date === "string" ? body.date : undefined;
  const value = Number(body.value);

  if (date && !isDateKey(date)) {
    return null;
  }

  if (checkInId === "hydration") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 10000) {
      return null;
    }

    return {
      kind: "hydration",
      date,
      value,
    };
  }

  if (!Number.isFinite(value) || value <= 0 || value > 24) {
    return null;
  }

  return {
    kind: "sleep",
    date,
    value: roundToHalfHour(value),
  };
}

function getCheckInMutation(input, targets = {}) {
  if (input.kind === "hydration") {
    const waterTargetMl = targets.waterTargetMl ?? 2000;

    return {
      waterIntakeMl: input.value,
      waterIntake: input.value >= waterTargetMl,
    };
  }

  const sleepTargetHours = targets.sleepTargetHours ?? 7.5;

  return {
    sleepActualHours: input.value,
    sleepQuality: input.value >= sleepTargetHours,
  };
}

function isDateKey(date) {
  if (!DATE_KEY_PATTERN.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function roundToHalfHour(value) {
  return Math.round(value * 2) / 2;
}

module.exports = {
  getCheckInMutation,
  parseCheckInRequest,
};
