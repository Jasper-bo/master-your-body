import { calculateBmi, calculateBmr, calculateTdee } from "@/lib/bmi-bmr";
import { prisma } from "@/lib/server/prisma";
import type { ActivityLevel, FitnessGoal, Gender } from "@/types/models";

const TIME_ZONE = "Asia/Shanghai";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const datePartsFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateLabelFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  month: "long",
  day: "numeric",
  weekday: "long",
});

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  hour12: false,
  hourCycle: "h23",
});

export type DashboardProfile = {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
};

type NutritionMetric = {
  current: number;
  target: number;
  unit: "g";
};

type CaloriesMetric = {
  current: number;
  target: number;
  unit: "kcal";
};

type TrendDataset = {
  label: string;
  data: number[];
  unit: "g";
};

export type DashboardData = {
  date: string;
  dateLabel: string;
  greeting: string;
  nutrition: {
    calories: CaloriesMetric;
    protein: NutritionMetric;
    carbs: NutritionMetric;
    fat: NutritionMetric;
  };
  bodyMetrics: {
    bmi: number;
    bmiCategory: string;
    bmr: number;
    tdee: number;
  };
  completionRate: number;
  healthScore: {
    totalScore: number;
    grade: "A" | "B" | "C" | "D";
    subScores: {
      nutrition: number;
      exercise: number;
      sleep: number;
      hydration: number;
    };
    checklist: Array<{
      id: "hydration" | "sleep" | "exercise";
      name: string;
      completed: boolean;
      target: string;
      current: string;
    }>;
  };
  nutritionTrend: {
    period: "7d";
    labels: string[];
    datasets: TrendDataset[];
  };
  profile: DashboardProfile;
};

export class DashboardProfileMissingError extends Error {
  constructor() {
    super("请先完成个性化计划");
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

export function parseDashboardDate(date: string | null | undefined) {
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

export async function getDashboardData(
  userId: string,
  dateKey = getTodayDateKey(),
): Promise<DashboardData> {
  const recordDate = dateFromKey(dateKey);
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new DashboardProfileMissingError();
  }

  const profileData: DashboardProfile = {
    heightCm: Number(profile.heightCm),
    weightKg: Number(profile.weightKg),
    age: profile.age,
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    goal: profile.fitnessGoal,
  };
  const bodyMetrics = {
    bmi: calculateBmi(profileData.weightKg, profileData.heightCm),
    bmiCategory: getBmiCategory(calculateBmi(profileData.weightKg, profileData.heightCm)),
    bmr: calculateBmr(profileData),
    tdee: calculateTdee(calculateBmr(profileData), profileData.activityLevel),
  };

  const trendDateKeys = getDateRange(dateKey, 7);
  const [dailyNutrition, checklist, workouts, trendRows] = await Promise.all([
    prisma.dailyNutrition.findUnique({
      where: { userId_recordDate: { userId, recordDate } },
    }),
    prisma.healthChecklist.findUnique({
      where: { userId_recordDate: { userId, recordDate } },
    }),
    prisma.workoutRecord.findMany({
      where: {
        userId,
        workoutDate: recordDate,
        status: "completed",
      },
      select: {
        totalDurationMin: true,
      },
    }),
    prisma.dailyNutrition.findMany({
      where: {
        userId,
        recordDate: {
          gte: dateFromKey(trendDateKeys[0]),
          lte: dateFromKey(trendDateKeys[trendDateKeys.length - 1]),
        },
      },
      orderBy: { recordDate: "asc" },
    }),
  ]);

  const nutrition = {
    calories: {
      current: dailyNutrition?.totalCalories ?? 0,
      target: dailyNutrition?.caloriesTarget ?? profile.dailyCalorieTarget,
      unit: "kcal" as const,
    },
    protein: {
      current: toOneDecimal(Number(dailyNutrition?.totalProteinG ?? 0)),
      target: dailyNutrition?.proteinTargetG ?? profile.dailyProteinTargetG,
      unit: "g" as const,
    },
    carbs: {
      current: toOneDecimal(Number(dailyNutrition?.totalCarbsG ?? 0)),
      target: dailyNutrition?.carbsTargetG ?? profile.dailyCarbsTargetG,
      unit: "g" as const,
    },
    fat: {
      current: toOneDecimal(Number(dailyNutrition?.totalFatG ?? 0)),
      target: dailyNutrition?.fatTargetG ?? profile.dailyFatTargetG,
      unit: "g" as const,
    },
  };

  const totalWorkoutMinutes = workouts.reduce(
    (sum, workout) => sum + workout.totalDurationMin,
    0,
  );
  const healthScore = calculateHealthScore({
    nutrition,
    hasDailyNutrition: Boolean(dailyNutrition),
    totalWorkoutMinutes,
    sleepHours: checklist?.sleepActualHours
      ? Number(checklist.sleepActualHours)
      : 0,
    waterMl: checklist?.waterIntakeMl ?? 0,
    sleepTargetHours: Number(profile.sleepTargetHours),
    waterTargetMl: profile.waterTargetMl,
  });

  await prisma.healthScore.upsert({
    where: { userId_recordDate: { userId, recordDate } },
    create: {
      userId,
      recordDate,
      totalScore: healthScore.totalScore,
      grade: healthScore.grade,
      nutritionScore: healthScore.subScores.nutrition,
      exerciseScore: healthScore.subScores.exercise,
      sleepScore: healthScore.subScores.sleep,
      hydrationScore: healthScore.subScores.hydration,
    },
    update: {
      totalScore: healthScore.totalScore,
      grade: healthScore.grade,
      nutritionScore: healthScore.subScores.nutrition,
      exerciseScore: healthScore.subScores.exercise,
      sleepScore: healthScore.subScores.sleep,
      hydrationScore: healthScore.subScores.hydration,
    },
  });

  return {
    date: dateKey,
    dateLabel: formatDateLabel(dateKey),
    greeting: getGreeting(),
    nutrition,
    bodyMetrics,
    completionRate: calculateCompletionRate(
      nutrition.calories.current,
      nutrition.calories.target,
      workouts.length,
    ),
    healthScore: {
      ...healthScore,
      checklist: [
        {
          id: "hydration",
          name: "水分补充",
          completed: Boolean(checklist?.waterIntake),
          target: `${profile.waterTargetMl}ml`,
          current: `${checklist?.waterIntakeMl ?? 0}ml`,
        },
        {
          id: "sleep",
          name: "睡眠质量",
          completed: Boolean(checklist?.sleepQuality),
          target: `${Number(profile.sleepTargetHours)}h`,
          current: `${checklist?.sleepActualHours ? Number(checklist.sleepActualHours) : 0}h`,
        },
        {
          id: "exercise",
          name: "运动锻炼",
          completed: Boolean(checklist?.exerciseDone) || workouts.length > 0,
          target: "1次",
          current: `${workouts.length}次`,
        },
      ],
    },
    nutritionTrend: buildNutritionTrend(
      trendDateKeys,
      trendRows,
      profile.dailyProteinTargetG,
      profile.dailyCarbsTargetG,
      profile.dailyFatTargetG,
    ),
    profile: profileData,
  };
}

function calculateHealthScore(input: {
  nutrition: DashboardData["nutrition"];
  hasDailyNutrition: boolean;
  totalWorkoutMinutes: number;
  sleepHours: number;
  waterMl: number;
  sleepTargetHours: number;
  waterTargetMl: number;
}) {
  const nutritionScore = input.hasDailyNutrition
    ? calculateNutritionScore(input.nutrition)
    : 0;
  const exerciseScore =
    input.totalWorkoutMinutes >= 30
      ? 25
      : Math.round((input.totalWorkoutMinutes / 30) * 25);
  const sleepScore = input.sleepHours
    ? Math.min(25, Math.round((input.sleepHours / input.sleepTargetHours) * 25))
    : 0;
  const hydrationScore = input.waterMl
    ? Math.min(25, Math.round((input.waterMl / input.waterTargetMl) * 25))
    : 0;
  const totalScore =
    nutritionScore + exerciseScore + sleepScore + hydrationScore;

  return {
    totalScore,
    grade: getHealthGrade(totalScore),
    subScores: {
      nutrition: nutritionScore,
      exercise: exerciseScore,
      sleep: sleepScore,
      hydration: hydrationScore,
    },
  };
}

function calculateNutritionScore(nutrition: DashboardData["nutrition"]) {
  const calorieRatio = nutrition.calories.current / nutrition.calories.target;
  const proteinRatio = nutrition.protein.current / nutrition.protein.target;
  const carbRatio = nutrition.carbs.current / nutrition.carbs.target;
  const fatRatio = nutrition.fat.current / nutrition.fat.target;
  const calorieScore = Math.max(0, 25 - Math.abs(1 - calorieRatio) * 250);
  const macroBalance = (proteinRatio + carbRatio + fatRatio) / 3;

  return clamp(
    Math.round(Math.min(25, calorieScore * 0.6 + macroBalance * 10 * 0.4)),
    0,
    25,
  );
}

function buildNutritionTrend(
  dateKeys: string[],
  rows: Array<{
    recordDate: Date;
    totalProteinG: unknown;
    totalCarbsG: unknown;
    totalFatG: unknown;
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
  }>,
  defaultProteinTarget: number,
  defaultCarbsTarget: number,
  defaultFatTarget: number,
) {
  const rowByDate = new Map(rows.map((row) => [keyFromDate(row.recordDate), row]));

  return {
    period: "7d" as const,
    labels: dateKeys.map((dateKey) => dateKey.slice(5)),
    datasets: [
      {
        label: "蛋白质",
        data: dateKeys.map((dateKey) =>
          toOneDecimal(Number(rowByDate.get(dateKey)?.totalProteinG ?? 0)),
        ),
        unit: "g" as const,
      },
      {
        label: "蛋白质目标",
        data: dateKeys.map(
          (dateKey) => rowByDate.get(dateKey)?.proteinTargetG ?? defaultProteinTarget,
        ),
        unit: "g" as const,
      },
      {
        label: "碳水",
        data: dateKeys.map((dateKey) =>
          toOneDecimal(Number(rowByDate.get(dateKey)?.totalCarbsG ?? 0)),
        ),
        unit: "g" as const,
      },
      {
        label: "碳水目标",
        data: dateKeys.map(
          (dateKey) => rowByDate.get(dateKey)?.carbsTargetG ?? defaultCarbsTarget,
        ),
        unit: "g" as const,
      },
      {
        label: "脂肪",
        data: dateKeys.map((dateKey) =>
          toOneDecimal(Number(rowByDate.get(dateKey)?.totalFatG ?? 0)),
        ),
        unit: "g" as const,
      },
      {
        label: "脂肪目标",
        data: dateKeys.map(
          (dateKey) => rowByDate.get(dateKey)?.fatTargetG ?? defaultFatTarget,
        ),
        unit: "g" as const,
      },
    ],
  };
}

function getGreeting(now = new Date()) {
  const hour = Number(hourFormatter.format(now));

  if (hour >= 6 && hour < 12) {
    return "早上好";
  }

  if (hour >= 12 && hour < 18) {
    return "下午好";
  }

  if (hour >= 18 && hour < 23) {
    return "晚上好";
  }

  return "夜深了";
}

function calculateCompletionRate(
  currentCalories: number,
  targetCalories: number,
  completedWorkouts: number,
) {
  const nutritionRate =
    targetCalories > 0 ? Math.min(currentCalories / targetCalories, 1) : 0;
  const workoutRate = completedWorkouts > 0 ? 1 : 0;

  return Math.round((nutritionRate * 0.5 + workoutRate * 0.5) * 100);
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) {
    return "偏瘦";
  }

  if (bmi < 24) {
    return "正常";
  }

  if (bmi < 28) {
    return "偏胖";
  }

  return "肥胖";
}

function getHealthGrade(totalScore: number): "A" | "B" | "C" | "D" {
  if (totalScore >= 90) {
    return "A";
  }

  if (totalScore >= 75) {
    return "B";
  }

  if (totalScore >= 60) {
    return "C";
  }

  return "D";
}

function formatDateLabel(dateKey: string) {
  return dateLabelFormatter.format(dateFromKey(dateKey));
}

function getDateRange(endDateKey: string, days: number) {
  return Array.from({ length: days }, (_, index) =>
    shiftDateKey(endDateKey, index - days + 1),
  );
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

function toOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
