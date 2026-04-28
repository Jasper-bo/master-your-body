import type { ActivityLevel, FitnessGoal, Gender } from "@/types/models";
import { serverEnv } from "@/lib/server/env";

const activityLevels = new Set<ActivityLevel>([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
]);
const fitnessGoals = new Set<FitnessGoal>([
  "lose_weight",
  "maintain",
  "gain_muscle",
]);
const genders = new Set<Gender>(["male", "female", "other"]);

export type PlanInput = {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
};

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePhone(value: unknown) {
  return typeof value === "string" && /^\d{8,15}$/.test(value)
    ? value
    : null;
}

export function parsePassword(value: unknown) {
  return typeof value === "string" && value.length >= serverEnv.passwordMinLength
    ? value
    : null;
}

export function parsePlanInput(body: Record<string, unknown>) {
  const heightCm = Number(body.heightCm);
  const weightKg = Number(body.weightKg);
  const age = Number(body.age);
  const gender = body.gender;
  const activityLevel = body.activityLevel;
  const goal = body.goal ?? body.fitnessGoal;

  if (
    !Number.isFinite(heightCm) ||
    heightCm <= 50 ||
    heightCm >= 300 ||
    !Number.isFinite(weightKg) ||
    weightKg <= 20 ||
    weightKg >= 500 ||
    !Number.isInteger(age) ||
    age < 10 ||
    age > 100 ||
    typeof gender !== "string" ||
    !genders.has(gender as Gender) ||
    typeof activityLevel !== "string" ||
    !activityLevels.has(activityLevel as ActivityLevel) ||
    typeof goal !== "string" ||
    !fitnessGoals.has(goal as FitnessGoal)
  ) {
    return null;
  }

  return {
    heightCm,
    weightKg,
    age,
    gender: gender as Gender,
    activityLevel: activityLevel as ActivityLevel,
    goal: goal as FitnessGoal,
  } satisfies PlanInput;
}

export function hasAnyPlanField(body: Record<string, unknown>) {
  return [
    "heightCm",
    "weightKg",
    "age",
    "gender",
    "activityLevel",
    "goal",
    "fitnessGoal",
  ].some((field) => body[field] !== undefined);
}
