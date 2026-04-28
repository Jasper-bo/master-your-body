import type { Prisma, User, UserProfile } from "@prisma/client";
import { calculateNutritionTargets } from "@/lib/bmi-bmr";
import { prisma } from "@/lib/server/prisma";
import type { PlanInput } from "@/lib/server/validators";

type UserWithProfile = User & {
  profile: UserProfile | null;
};

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export function serializeUser(user: UserWithProfile) {
  const stats = user.profile
    ? calculateNutritionTargets({
        heightCm: Number(user.profile.heightCm),
        weightKg: Number(user.profile.weightKg),
        age: user.profile.age,
        gender: user.profile.gender,
        activityLevel: user.profile.activityLevel,
        fitnessGoal: user.profile.fitnessGoal,
      })
    : null;

  return {
    id: user.id,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    profile: user.profile
      ? {
          heightCm: Number(user.profile.heightCm),
          weightKg: Number(user.profile.weightKg),
          age: user.profile.age,
          gender: user.profile.gender,
          activityLevel: user.profile.activityLevel,
          goal: user.profile.fitnessGoal,
        }
      : null,
    stats: stats
      ? {
          bmi: stats.bmi,
          bmr: stats.bmr,
          tdee: stats.tdee,
          dailyCalorieTarget: stats.calories,
          dailyProteinTarget: stats.proteinG,
          dailyCarbTarget: stats.carbsG,
          dailyFatTarget: stats.fatG,
        }
      : null,
  };
}

export async function getUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function upsertUserPlan(
  userId: string,
  input: PlanInput,
  client: PrismaClientLike = prisma,
) {
  const stats = calculateNutritionTargets({
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    age: input.age,
    gender: input.gender,
    activityLevel: input.activityLevel,
    fitnessGoal: input.goal,
  });

  const profile = await client.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      age: input.age,
      gender: input.gender,
      activityLevel: input.activityLevel,
      fitnessGoal: input.goal,
      dailyCalorieTarget: stats.calories,
      dailyProteinTargetG: stats.proteinG,
      dailyCarbsTargetG: stats.carbsG,
      dailyFatTargetG: stats.fatG,
      waterTargetMl: stats.waterMl,
      sleepTargetHours: stats.sleepHours,
    },
    update: {
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      age: input.age,
      gender: input.gender,
      activityLevel: input.activityLevel,
      fitnessGoal: input.goal,
      dailyCalorieTarget: stats.calories,
      dailyProteinTargetG: stats.proteinG,
      dailyCarbsTargetG: stats.carbsG,
      dailyFatTargetG: stats.fatG,
      waterTargetMl: stats.waterMl,
      sleepTargetHours: stats.sleepHours,
    },
  });

  return {
    profile,
    stats,
  };
}

export function serializePlan(
  profile: UserProfile,
  stats: ReturnType<typeof calculateNutritionTargets>,
) {
  return {
    profile: {
      heightCm: Number(profile.heightCm),
      weightKg: Number(profile.weightKg),
      age: profile.age,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      goal: profile.fitnessGoal,
    },
    recalculatedStats: {
      bmi: stats.bmi,
      bmr: stats.bmr,
      tdee: stats.tdee,
      dailyCalorieTarget: stats.calories,
      dailyProteinTarget: stats.proteinG,
      dailyCarbTarget: stats.carbsG,
      dailyFatTarget: stats.fatG,
    },
  };
}
