import type { Prisma } from "@prisma/client";
import { getDashboardData } from "@/lib/server/dashboard";
import historyPolicy from "@/lib/server/history-policy";
import { prisma } from "@/lib/server/prisma";
import { isObject } from "@/lib/server/validators";
import type {
  ExerciseCategoryData,
  ExerciseCategoryKey,
  ExerciseData,
  ExerciseLibraryData,
  QuickLogTrainingResponse,
  TrainingHistoryData,
  TrainingTodayData,
  TrainingWeeklyStatsData,
  TrainingYesterdayData,
  WorkoutSessionData,
} from "@/types/training";

const { parseHistoryQuery } = historyPolicy as {
  parseHistoryQuery: (
    kind: "training",
    query: Record<string, unknown>,
    today?: string,
  ) => TrainingHistoryQuery | null;
};

const TIME_ZONE = "Asia/Shanghai";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TARGET_DAILY_SESSIONS = 1;

const categoryKeyByName: Record<string, ExerciseCategoryKey> = {
  胸部: "chest",
  背部: "back",
  肩部: "shoulder",
  腿部: "leg",
  有氧: "cardio",
};

const categoryNameByKey: Record<ExerciseCategoryKey, string> = {
  chest: "胸部",
  back: "背部",
  shoulder: "肩部",
  leg: "腿部",
  cardio: "有氧",
};

const categoryAliases: Record<string, ExerciseCategoryKey | "all"> = {
  all: "all",
  chest: "chest",
  back: "back",
  shoulder: "shoulder",
  shoulders: "shoulder",
  leg: "leg",
  legs: "leg",
  cardio: "cardio",
};

const exerciseSeeds = [
  {
    key: "chest" as const,
    name: "胸部",
    icon: "chest",
    sortOrder: 1,
    exercises: [
      ["卧推", false, 4, 10, null],
      ["上斜卧推", false, 4, 10, null],
      ["双杠臂屈伸", false, 3, 12, null],
    ],
  },
  {
    key: "back" as const,
    name: "背部",
    icon: "back",
    sortOrder: 2,
    exercises: [
      ["引体向上", false, 4, 8, null],
      ["高位下拉", false, 4, 12, null],
      ["坐姿划船", false, 4, 12, null],
    ],
  },
  {
    key: "shoulder" as const,
    name: "肩部",
    icon: "shoulder",
    sortOrder: 3,
    exercises: [
      ["侧平举", false, 4, 15, null],
      ["绳索侧平举", false, 4, 15, null],
    ],
  },
  {
    key: "leg" as const,
    name: "腿部",
    icon: "leg",
    sortOrder: 4,
    exercises: [
      ["深蹲", false, 4, 10, null],
      ["保加利亚深蹲", false, 3, 10, null],
      ["哈克深蹲", false, 4, 10, null],
    ],
  },
  {
    key: "cardio" as const,
    name: "有氧",
    icon: "cardio",
    sortOrder: 5,
    exercises: [
      ["跑步机", true, null, null, 30],
      ["椭圆机", true, null, null, 30],
      ["动感单车", true, null, null, 30],
    ],
  },
] satisfies Array<{
  key: ExerciseCategoryKey;
  name: string;
  icon: string;
  sortOrder: number;
  exercises: Array<[string, boolean, number | null, number | null, number | null]>;
}>;
const seededExerciseCategoryNames = exerciseSeeds.map((category) => category.name);
const seededExerciseNames = exerciseSeeds.flatMap((category) =>
  category.exercises.map(([name]) => name),
);
const seededExerciseCount = seededExerciseNames.length;
let systemExerciseDataReady = false;

const datePartsFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const workoutInclude = {
  workoutExercises: {
    include: {
      exercise: {
        include: {
          category: true,
        },
      },
    },
    orderBy: [
      { exerciseOrder: "asc" as const },
      { setNumber: "asc" as const },
    ],
  },
} satisfies Prisma.WorkoutRecordInclude;

type WorkoutWithExercises = Prisma.WorkoutRecordGetPayload<{
  include: typeof workoutInclude;
}>;

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;
type TrainingHistoryQuery = {
  startDate: string;
  endDate: string;
  filter: ExerciseCategoryKey | "all";
  page: number;
  limit: number;
  skip: number;
};

type QuickLogInput = {
  date: string;
  durationMin: number | null;
  notes: string | null;
  exercises: Array<{
    exerciseId: string;
    sets: Array<{
      reps?: number;
      weightKg?: number;
      durationMin?: number;
      incline?: number;
      resistance?: number;
      loadSetting?: string;
    }>;
  }>;
};

export class TrainingValidationError extends Error {
  constructor(message = "训练记录参数校验失败") {
    super(message);
  }
}

export class TrainingExerciseNotFoundError extends Error {
  constructor() {
    super("训练动作不存在或不可用");
  }
}

export class TrainingRecordNotFoundError extends Error {
  constructor() {
    super("训练记录不存在");
  }
}

export function getTodayDateKey(now = new Date()) {
  const parts = Object.fromEntries(
    datePartsFormatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseTrainingDate(date: string | null | undefined) {
  if (!date) {
    return getTodayDateKey();
  }

  if (!DATE_KEY_PATTERN.test(date)) {
    return null;
  }

  const parsed = dateFromKey(date);

  if (Number.isNaN(parsed.getTime()) || keyFromDate(parsed) !== date) {
    return null;
  }

  return date;
}

export function parseQuickLogRequest(body: Record<string, unknown>) {
  const date = parseTrainingDate(typeof body.date === "string" ? body.date : null);
  const rawExercises = Array.isArray(body.exercises) ? body.exercises : [];
  const durationMin =
    body.durationMin === undefined || body.durationMin === null
      ? null
      : Number(body.durationMin);
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, 500)
      : null;

  if (
    !date ||
    rawExercises.length === 0 ||
    rawExercises.length > 20 ||
    (durationMin !== null && (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 600))
  ) {
    return null;
  }

  const exercises = rawExercises.map((rawExercise) => {
    if (
      !isObject(rawExercise) ||
      typeof rawExercise.exerciseId !== "string" ||
      !Array.isArray(rawExercise.sets) ||
      rawExercise.sets.length === 0 ||
      rawExercise.sets.length > 20
    ) {
      return null;
    }

    const sets = rawExercise.sets.map((rawSet) => {
      if (!isObject(rawSet)) {
        return null;
      }

      const reps = rawSet.reps === undefined ? undefined : Number(rawSet.reps);
      const weightKg =
        rawSet.weightKg === undefined ? undefined : Number(rawSet.weightKg);
      const duration =
        rawSet.durationMin === undefined ? undefined : Number(rawSet.durationMin);
      const incline =
        rawSet.incline === undefined ? undefined : Number(rawSet.incline);
      const resistance =
        rawSet.resistance === undefined ? undefined : Number(rawSet.resistance);
      const loadSetting =
        typeof rawSet.loadSetting === "string"
          ? rawSet.loadSetting.slice(0, 20)
          : undefined;

      if (
        (reps !== undefined && (!Number.isInteger(reps) || reps <= 0 || reps > 100)) ||
        (weightKg !== undefined && (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 500)) ||
        (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > 600)) ||
        (incline !== undefined && (!Number.isFinite(incline) || incline < -10 || incline > 40)) ||
        (resistance !== undefined && (!Number.isInteger(resistance) || resistance < 0 || resistance > 100))
      ) {
        return null;
      }

      return {
        reps,
        weightKg,
        durationMin: duration,
        incline,
        resistance,
        loadSetting,
      };
    });

    if (sets.some((set) => !set)) {
      return null;
    }

    return {
      exerciseId: rawExercise.exerciseId,
      sets: sets as QuickLogInput["exercises"][number]["sets"],
    };
  });

  if (exercises.some((exercise) => !exercise)) {
    return null;
  }

  return {
    date,
    durationMin,
    notes,
    exercises: exercises as QuickLogInput["exercises"],
  } satisfies QuickLogInput;
}

export function parseTrainingHistoryQuery(query: Record<string, unknown>) {
  return parseHistoryQuery("training", query, getTodayDateKey());
}

export async function ensureSystemExerciseData(client: PrismaClientLike = prisma) {
  const canUseReadyCache = client === prisma;

  if (canUseReadyCache && systemExerciseDataReady) {
    return;
  }

  if (await hasCompleteSystemExerciseData(client)) {
    if (canUseReadyCache) {
      systemExerciseDataReady = true;
    }

    return;
  }

  for (const categorySeed of exerciseSeeds) {
    const category =
      (await client.exerciseCategory.findUnique({
        where: { name: categorySeed.name },
      })) ??
      (await client.exerciseCategory.create({
        data: {
          name: categorySeed.name,
          icon: categorySeed.icon,
          sortOrder: categorySeed.sortOrder,
          isSystem: true,
        },
      }));

    await client.exerciseCategory.update({
      where: { id: category.id },
      data: {
        icon: categorySeed.icon,
        sortOrder: categorySeed.sortOrder,
        isSystem: true,
      },
    });

    for (const [
      name,
      isCardio,
      defaultSets,
      defaultReps,
      defaultDurationMin,
    ] of categorySeed.exercises) {
      const existingExercise = await client.exercise.findFirst({
        where: {
          categoryId: category.id,
          name,
          isSystem: true,
        },
      });
      const data = {
        name,
        categoryId: category.id,
        description: `${categorySeed.name}系统预设动作`,
        isCardio,
        defaultSets,
        defaultReps,
        defaultDurationMin,
        isSystem: true,
        isActive: true,
      };

      if (existingExercise) {
        await client.exercise.update({
          where: { id: existingExercise.id },
          data,
        });
      } else {
        await client.exercise.create({ data });
      }
    }
  }

  if (canUseReadyCache) {
    systemExerciseDataReady = true;
  }
}

async function hasCompleteSystemExerciseData(client: PrismaClientLike) {
  const [categoryCount, exerciseCount] = await Promise.all([
    client.exerciseCategory.count({
      where: {
        isSystem: true,
        name: { in: seededExerciseCategoryNames },
      },
    }),
    client.exercise.count({
      where: {
        isSystem: true,
        isActive: true,
        name: { in: seededExerciseNames },
      },
    }),
  ]);

  return (
    categoryCount >= exerciseSeeds.length && exerciseCount >= seededExerciseCount
  );
}

export async function getExerciseLibrary(input: {
  category?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
} = {}): Promise<ExerciseLibraryData> {
  await ensureSystemExerciseData();

  const categoryFilter = input.category
    ? categoryAliases[input.category] ?? null
    : "all";
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const search = input.search?.trim();

  if (categoryFilter === null) {
    throw new TrainingValidationError("训练部位筛选参数无效");
  }

  const where: Prisma.ExerciseWhereInput = {
    isActive: true,
    isSystem: true,
    ...(categoryFilter && categoryFilter !== "all"
      ? { category: { name: categoryNameByKey[categoryFilter] } }
      : {}),
    ...(search
      ? {
          name: {
            contains: search,
          },
        }
      : {}),
  };
  const [items, total, categories] = await Promise.all([
    prisma.exercise.findMany({
      where,
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.exercise.count({ where }),
    prisma.exerciseCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        exercises: {
          where: {
            isActive: true,
            isSystem: true,
          },
          select: { id: true },
        },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items: items.map(serializeExercise),
    categories: categories
      .map((category) => {
        const key = categoryKeyByName[category.name];

        if (!key) {
          return null;
        }

        return {
          id: key,
          name: category.name,
          icon: category.icon,
          count: category.exercises.length,
        };
      })
      .filter((category): category is ExerciseCategoryData => Boolean(category)),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getTrainingToday(
  userId: string,
  dateKey = getTodayDateKey(),
): Promise<TrainingTodayData> {
  const sessions = await findSessions(userId, dateKey);
  const serializedSessions = sessions.map(serializeSession);
  const completedSessions = serializedSessions.filter(
    (session) => session.status === "completed",
  );
  const trainedParts = Array.from(
    new Set(
      completedSessions.flatMap((session) =>
        session.exercises.map((exercise) => exercise.targetMuscle),
      ),
    ),
  );
  const completedSets = completedSessions.reduce(
    (sum, session) => sum + session.summary.completedSets,
    0,
  );
  const durationMin = completedSessions.reduce(
    (sum, session) => sum + session.summary.durationMin,
    0,
  );

  return {
    date: dateKey,
    summary: {
      sessionCount: serializedSessions.length,
      completedSessions: completedSessions.length,
      totalExercises: completedSessions.reduce(
        (sum, session) => sum + session.summary.totalExercises,
        0,
      ),
      completedSets,
      durationMin,
      progressPercentage: Math.min(
        100,
        Math.round((completedSessions.length / TARGET_DAILY_SESSIONS) * 100),
      ),
      targetSessions: TARGET_DAILY_SESSIONS,
      trainedParts,
    },
    sessions: serializedSessions,
  };
}

export async function getTrainingYesterday(
  userId: string,
): Promise<TrainingYesterdayData> {
  const date = shiftDateKey(getTodayDateKey(), -1);
  const sessions = await findSessions(userId, date);
  const completedSessions = sessions
    .map(serializeSession)
    .filter((session) => session.status === "completed");

  return {
    date,
    hasWorkout: completedSessions.length > 0,
    sessions: completedSessions.map((session) => ({
      sessionId: session.sessionId,
      sessionIndex: session.sessionIndex,
      summary: {
        totalExercises: session.summary.totalExercises,
        totalSets: session.summary.completedSets,
        totalVolumeKg: session.summary.totalVolumeKg,
        durationMin: session.summary.durationMin,
      },
      exercises: session.exercises.map((exercise) => ({
        name: exercise.name,
        setsCompleted: exercise.sets.filter((set) => set.completed).length,
        repsPerSet: formatRepsPerSet(exercise),
        weightNote: formatWeightNote(exercise),
      })),
    })),
  };
}

export async function getTrainingWeeklyStats(
  userId: string,
  weekStartKey = getWeekStartKey(getTodayDateKey()),
): Promise<TrainingWeeklyStatsData> {
  const weekStart = dateFromKey(weekStartKey);
  const weekEndKey = shiftDateKey(weekStartKey, 6);
  const previousWeekStartKey = shiftDateKey(weekStartKey, -7);
  const previousWeekEndKey = shiftDateKey(weekStartKey, -1);
  const [currentWeekSessions, previousWeekSessions] = await Promise.all([
    prisma.workoutRecord.findMany({
      where: {
        userId,
        status: "completed",
        workoutDate: {
          gte: weekStart,
          lte: dateFromKey(weekEndKey),
        },
      },
      include: workoutInclude,
    }),
    prisma.workoutRecord.findMany({
      where: {
        userId,
        status: "completed",
        workoutDate: {
          gte: dateFromKey(previousWeekStartKey),
          lte: dateFromKey(previousWeekEndKey),
        },
      },
      include: workoutInclude,
    }),
  ]);
  const currentTotals = summarizeSessions(currentWeekSessions);
  const previousDuration = previousWeekSessions.reduce(
    (sum, session) => sum + session.totalDurationMin,
    0,
  );
  const dailyBreakdown = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(weekStartKey, index);
    const sessions = currentWeekSessions.filter(
      (session) => keyFromDate(session.workoutDate) === date,
    );

    return {
      date,
      hasWorkout: sessions.length > 0,
      sessionCount: sessions.length,
      durationMin: sessions.reduce(
        (sum, session) => sum + session.totalDurationMin,
        0,
      ),
    };
  });

  return {
    weekStart: weekStartKey,
    weekEnd: weekEndKey,
    stats: {
      workoutCount: currentWeekSessions.length,
      totalDurationMin: currentTotals.durationMin,
      totalSets: currentTotals.completedSets,
      totalVolumeKg: currentTotals.totalVolumeKg,
      weekOverWeekChange:
        previousDuration > 0
          ? Math.round(
              ((currentTotals.durationMin - previousDuration) /
                previousDuration) *
                100,
            )
          : null,
    },
    dailyBreakdown,
  };
}

export async function getTrainingHistory(
  userId: string,
  input: TrainingHistoryQuery,
): Promise<TrainingHistoryData> {
  const where: Prisma.WorkoutRecordWhereInput = {
    userId,
    status: "completed",
    workoutDate: {
      gte: dateFromKey(input.startDate),
      lte: dateFromKey(input.endDate),
    },
    ...(input.filter !== "all"
      ? {
          workoutExercises: {
            some: {
              exercise: {
                category: {
                  name: categoryNameByKey[input.filter],
                },
              },
            },
          },
        }
      : {}),
  };
  const [sessions, total] = await Promise.all([
    prisma.workoutRecord.findMany({
      where,
      orderBy: [{ workoutDate: "desc" }, { createdAt: "desc" }],
      skip: input.skip,
      take: input.limit,
      include: workoutInclude,
    }),
    prisma.workoutRecord.count({ where }),
  ]);

  return {
    items: sessions.map(serializeHistorySession),
    pagination: buildPagination(input.page, input.limit, total),
  };
}

export async function quickLogTraining(
  userId: string,
  input: QuickLogInput,
): Promise<QuickLogTrainingResponse> {
  await ensureSystemExerciseData();

  const recordDate = dateFromKey(input.date);
  const exerciseIds = Array.from(
    new Set(input.exercises.map((exercise) => exercise.exerciseId)),
  );
  const exercises = await prisma.exercise.findMany({
    where: {
      id: { in: exerciseIds },
      isActive: true,
    },
    include: { category: true },
  });

  if (exercises.length !== exerciseIds.length) {
    throw new TrainingExerciseNotFoundError();
  }

  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const normalizedExercises = input.exercises.map((exerciseInput, exerciseIndex) => {
    const exercise = exerciseById.get(exerciseInput.exerciseId);

    if (!exercise) {
      throw new TrainingExerciseNotFoundError();
    }

    const sets = exerciseInput.sets.map((set, setIndex) => {
      if (exercise.isCardio) {
        if (!set.durationMin) {
          throw new TrainingValidationError("有氧训练必须填写时长");
        }

        return {
          exerciseId: exercise.id,
          exerciseOrder: exerciseIndex + 1,
          setNumber: setIndex + 1,
          durationMin: set.durationMin,
          inclinePercent: set.incline ?? null,
          resistanceLevel: set.resistance ?? null,
          loadSetting: set.loadSetting ?? null,
          isCompleted: true,
        };
      }

      if (!set.reps || set.weightKg === undefined) {
        throw new TrainingValidationError("力量训练必须填写重量和次数");
      }

      return {
        exerciseId: exercise.id,
        exerciseOrder: exerciseIndex + 1,
        setNumber: setIndex + 1,
        weightKg: set.weightKg,
        reps: set.reps,
        isCompleted: true,
      };
    });

    return {
      exercise,
      sets,
    };
  });
  const totalSets = normalizedExercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
  const totalDurationMin =
    input.durationMin ??
    Math.max(
      1,
      Math.round(
        normalizedExercises.reduce((sum, exercise) => {
          if (exercise.exercise.isCardio) {
            return (
              sum +
              exercise.sets.reduce(
                (setSum, set) => setSum + Number(set.durationMin ?? 0),
                0,
              )
            );
          }

          return sum + exercise.sets.length * 3;
        }, 0),
      ),
    );
  const totalVolumeKg = calculateVolumeFromInputs(normalizedExercises);
  const now = new Date();
  const startTime = new Date(now.getTime() - totalDurationMin * 60 * 1000);

  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.workoutRecord.create({
      data: {
        userId,
        workoutDate: recordDate,
        startTime,
        endTime: now,
        totalDurationMin,
        totalExercises: normalizedExercises.length,
        totalSetsCompleted: totalSets,
        status: "completed",
        notes: input.notes,
        workoutExercises: {
          create: normalizedExercises.flatMap((exercise) => exercise.sets),
        },
      },
      include: workoutInclude,
    });

    await markExerciseDone(userId, recordDate, tx);

    return createdSession;
  });

  return {
    sessionId: session.id,
    date: input.date,
    type: "quick",
    summary: {
      totalExercises: session.totalExercises,
      totalSets: session.totalSetsCompleted,
      totalVolumeKg,
      durationMin: session.totalDurationMin,
    },
    createdAt: session.createdAt.toISOString(),
  };
}

export async function deleteTrainingRecord(userId: string, sessionId: string) {
  const session = await prisma.workoutRecord.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
      workoutDate: true,
    },
  });

  if (!session) {
    throw new TrainingRecordNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.workoutRecord.delete({ where: { id: session.id } });
    const remainingCompletedSessions = await tx.workoutRecord.count({
      where: {
        userId,
        workoutDate: session.workoutDate,
        status: "completed",
      },
    });

    await tx.healthChecklist.upsert({
      where: { userId_recordDate: { userId, recordDate: session.workoutDate } },
      create: {
        userId,
        recordDate: session.workoutDate,
        exerciseDone: remainingCompletedSessions > 0,
      },
      update: {
        exerciseDone: remainingCompletedSessions > 0,
      },
    });
  });
  await getDashboardData(userId, keyFromDate(session.workoutDate));

  return {
    deletedId: session.id,
  };
}

async function findSessions(userId: string, dateKey: string) {
  return prisma.workoutRecord.findMany({
    where: {
      userId,
      workoutDate: dateFromKey(dateKey),
    },
    orderBy: { createdAt: "asc" },
    include: workoutInclude,
  });
}

async function markExerciseDone(
  userId: string,
  recordDate: Date,
  client: PrismaClientLike,
) {
  await client.healthChecklist.upsert({
    where: { userId_recordDate: { userId, recordDate } },
    create: {
      userId,
      recordDate,
      exerciseDone: true,
    },
    update: {
      exerciseDone: true,
    },
  });
}

function serializeHistorySession(session: WorkoutWithExercises) {
  const serialized = serializeSession(session, 0);
  const trainedParts = Array.from(
    new Set(serialized.exercises.map((exercise) => exercise.category)),
  );

  return {
    id: session.id,
    date: keyFromDate(session.workoutDate),
    durationMin: session.totalDurationMin,
    totalExercises: session.totalExercises,
    totalSets: session.totalSetsCompleted,
    totalVolumeKg: serialized.summary.totalVolumeKg,
    trainedParts,
    exercises: serialized.exercises,
    notes: session.notes,
    createdAt: session.createdAt.toISOString(),
  };
}

function buildPagination(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function serializeExercise(exercise: {
  id: string;
  name: string;
  isCardio: boolean;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultDurationMin: number | null;
  category: {
    name: string;
  };
}): ExerciseData {
  const category = categoryKeyByName[exercise.category.name] ?? "chest";

  return {
    id: exercise.id,
    name: exercise.name,
    category,
    targetMuscle: exercise.category.name,
    type: exercise.isCardio ? "cardio" : "strength",
    defaultSets: exercise.defaultSets,
    defaultReps: exercise.defaultReps,
    defaultDurationMin: exercise.defaultDurationMin,
  };
}

function serializeSession(
  session: WorkoutWithExercises,
  index: number,
): WorkoutSessionData {
  const exerciseMap = new Map<
    string,
    WorkoutSessionData["exercises"][number]
  >();

  for (const set of session.workoutExercises) {
    const existing = exerciseMap.get(set.exerciseId);
    const exercise = existing ?? {
      id: set.id,
      exerciseId: set.exerciseId,
      name: set.exercise.name,
      category: categoryKeyByName[set.exercise.category.name] ?? "chest",
      targetMuscle: set.exercise.category.name,
      type: set.exercise.isCardio ? ("cardio" as const) : ("strength" as const),
      sets: [],
      isCompleted: true,
    };

    exercise.sets.push({
      setNumber: set.setNumber,
      reps: set.reps ?? undefined,
      weightKg: set.weightKg === null ? undefined : Number(set.weightKg),
      durationMin:
        set.durationMin === null ? undefined : Number(set.durationMin),
      incline:
        set.inclinePercent === null ? undefined : Number(set.inclinePercent),
      resistance: set.resistanceLevel ?? undefined,
      loadSetting: set.loadSetting ?? undefined,
      completed: set.isCompleted,
    });
    exercise.isCompleted = exercise.sets.every((item) => item.completed);
    exerciseMap.set(set.exerciseId, exercise);
  }

  const exercises = Array.from(exerciseMap.values());

  return {
    sessionId: session.id,
    sessionIndex: index + 1,
    status: session.status,
    completedAt: session.endTime?.toISOString() ?? null,
    summary: {
      totalExercises: session.totalExercises,
      completedSets: session.totalSetsCompleted,
      totalVolumeKg: calculateVolume(session),
      durationMin: session.totalDurationMin,
    },
    exercises,
  };
}

function summarizeSessions(sessions: WorkoutWithExercises[]) {
  return sessions.reduce(
    (sum, session) => ({
      durationMin: sum.durationMin + session.totalDurationMin,
      completedSets: sum.completedSets + session.totalSetsCompleted,
      totalVolumeKg: sum.totalVolumeKg + calculateVolume(session),
    }),
    { durationMin: 0, completedSets: 0, totalVolumeKg: 0 },
  );
}

function calculateVolume(session: WorkoutWithExercises) {
  return Math.round(
    session.workoutExercises.reduce((sum, set) => {
      if (!set.isCompleted || set.weightKg === null || !set.reps) {
        return sum;
      }

      return sum + Number(set.weightKg) * set.reps;
    }, 0),
  );
}

function calculateVolumeFromInputs(
  exercises: Array<{ sets: Array<{ weightKg?: number; reps?: number }> }>,
) {
  return Math.round(
    exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets.reduce((setSum, set) => {
          if (set.weightKg === undefined || !set.reps) {
            return setSum;
          }

          return setSum + set.weightKg * set.reps;
        }, 0),
      0,
    ),
  );
}

function formatRepsPerSet(exercise: WorkoutSessionData["exercises"][number]) {
  if (exercise.type === "cardio") {
    return exercise.sets
      .map((set) => `${set.durationMin ?? 0}min`)
      .join("/");
  }

  const reps = exercise.sets
    .map((set) => set.reps)
    .filter((value): value is number => Boolean(value));
  const unique = Array.from(new Set(reps));

  return unique.length === 1 ? String(unique[0]) : reps.join("-");
}

function formatWeightNote(exercise: WorkoutSessionData["exercises"][number]) {
  if (exercise.type === "cardio") {
    return "有氧";
  }

  const weights = exercise.sets
    .map((set) => set.weightKg)
    .filter((value): value is number => value !== undefined);
  const unique = Array.from(new Set(weights));

  if (unique.length === 0 || unique.every((weight) => weight === 0)) {
    return "自重";
  }

  return unique.length === 1 ? `${unique[0]}kg` : `${weights.join("-")}kg`;
}

function getWeekStartKey(dateKey: string) {
  const date = dateFromKey(dateKey);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + offset);

  return keyFromDate(date);
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return keyFromDate(date);
}

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function keyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
