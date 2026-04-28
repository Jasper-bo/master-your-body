import { ACTIVITY_MULTIPLIERS } from "@/lib/constants";
import type { ActivityLevel, FitnessGoal, Gender } from "@/types/models";

export type ProfileMetricsInput = {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
};

export function calculateBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return Number((weightKg / heightM ** 2).toFixed(1));
}

export function calculateBmr(input: Pick<ProfileMetricsInput, "age" | "gender" | "heightCm" | "weightKg">) {
  const genderOffset = input.gender === "male" ? 5 : -161;
  return Math.round(
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + genderOffset,
  );
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel) {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateNutritionTargets(input: ProfileMetricsInput) {
  const bmr = calculateBmr(input);
  const tdee = calculateTdee(bmr, input.activityLevel);
  const calorieAdjustment = getCalorieAdjustment(input.fitnessGoal);
  const calorieTarget = tdee + calorieAdjustment;
  const proteinG = Math.round(
    input.weightKg * (input.fitnessGoal === "maintain" ? 1.6 : 2),
  );
  const fatG = Math.round(input.weightKg * 0.9);
  const remainingCalories = calorieTarget - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(50, Math.round(remainingCalories / 4));

  return {
    bmi: calculateBmi(input.weightKg, input.heightCm),
    bmr,
    tdee,
    calories: Math.max(500, calorieTarget),
    proteinG,
    carbsG,
    fatG,
    waterMl: 2000,
    sleepHours: 7.5,
  };
}

function getCalorieAdjustment(goal: FitnessGoal) {
  if (goal === "lose_weight") {
    return -500;
  }

  if (goal === "gain_muscle") {
    return 300;
  }

  return 0;
}
