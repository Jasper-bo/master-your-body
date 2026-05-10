import checkinPolicy from "@/lib/server/checkin-policy";
import { prisma } from "@/lib/server/prisma";
import { getTodayDateKey, parseDashboardDate } from "@/lib/server/dashboard";

const { getCheckInMutation, parseCheckInRequest } = checkinPolicy as {
  getCheckInMutation: (
    input: CheckInInput,
    targets: { waterTargetMl?: number; sleepTargetHours?: number },
  ) => CheckInMutation;
  parseCheckInRequest: (
    checkInId: string,
    body: Record<string, unknown>,
  ) => CheckInInput | null;
};

type CheckInInput =
  | {
      kind: "hydration";
      date?: string;
      value: number;
    }
  | {
      kind: "sleep";
      date?: string;
      value: number;
    };

type CheckInId = CheckInInput["kind"];
type CheckInMutation =
  | {
      waterIntakeMl: number;
      waterIntake: boolean;
    }
  | {
      sleepActualHours: number;
      sleepQuality: boolean;
    };

export class CheckInProfileMissingError extends Error {
  constructor() {
    super("请先完成个性化计划");
  }
}

export class CheckInValidationError extends Error {
  constructor() {
    super("健康打卡参数校验失败");
  }
}

export function parseManualCheckInRequest(
  checkInId: string,
  body: Record<string, unknown>,
) {
  return parseCheckInRequest(checkInId, body);
}

export async function recordManualCheckIn(
  userId: string,
  input: CheckInInput,
) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      waterTargetMl: true,
      sleepTargetHours: true,
    },
  });

  if (!profile) {
    throw new CheckInProfileMissingError();
  }

  const dateKey = input.date ?? getTodayDateKey();
  const parsedDate = parseDashboardDate(dateKey);

  if (!parsedDate) {
    throw new CheckInValidationError();
  }

  const recordDate = new Date(`${parsedDate}T00:00:00.000Z`);
  const mutation = getCheckInMutation(input, {
    waterTargetMl: profile.waterTargetMl,
    sleepTargetHours: Number(profile.sleepTargetHours),
  });

  await prisma.healthChecklist.upsert({
    where: { userId_recordDate: { userId, recordDate } },
    create: {
      userId,
      recordDate,
      ...mutation,
    },
    update: mutation,
  });

  return serializeCheckIn(input.kind, mutation, {
    waterTargetMl: profile.waterTargetMl,
    sleepTargetHours: Number(profile.sleepTargetHours),
  });
}

function serializeCheckIn(
  checkInId: CheckInId,
  mutation: CheckInMutation,
  targets: { waterTargetMl: number; sleepTargetHours: number },
) {
  if (checkInId === "hydration") {
    const value = "waterIntakeMl" in mutation ? mutation.waterIntakeMl : 0;

    return {
      checkInId,
      name: "水分补充",
      completed: "waterIntake" in mutation ? mutation.waterIntake : false,
      current: `${value}ml`,
      target: `${targets.waterTargetMl}ml`,
      score: Math.min(25, Math.round((value / targets.waterTargetMl) * 25)),
      checkedAt: new Date().toISOString(),
    };
  }

  const value = "sleepActualHours" in mutation ? mutation.sleepActualHours : 0;

  return {
    checkInId,
    name: "睡眠质量",
    completed: "sleepQuality" in mutation ? mutation.sleepQuality : false,
    current: `${value}h`,
    target: `${targets.sleepTargetHours}h`,
    score: Math.min(25, Math.round((value / targets.sleepTargetHours) * 25)),
    checkedAt: new Date().toISOString(),
  };
}
