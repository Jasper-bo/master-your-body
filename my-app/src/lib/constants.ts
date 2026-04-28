import type {
  ActivityLevel,
  FitnessGoal,
  FoodCategoryPreset,
  Gender,
  MainNavItem,
} from "@/types/models";

export const APP_NAME = "VitalPulse";
export const APP_VERSION = "1.0.0";

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { href: "/dashboard", label: "仪表盘" },
  { href: "/nutrition", label: "饮食" },
  { href: "/training", label: "训练" },
  { href: "/settings", label: "设置" },
];

export const PROTECTED_ROUTES = [
  "/dashboard",
  "/nutrition",
  "/training",
  "/settings",
];

export const DEFAULT_PROFILE = {
  heightCm: 175,
  weightKg: 70,
  age: 28,
  gender: "male" as Gender,
  activityLevel: "moderately_active" as ActivityLevel,
  fitnessGoal: "maintain" as FitnessGoal,
};

export const DEFAULT_TODAY_NUTRITION = {
  protein: { current: 82, target: 150 },
  carbs: { current: 186, target: 300 },
  fat: { current: 48, target: 80 },
};

export const FOOD_CATEGORY_PRESETS: FoodCategoryPreset[] = [
  { key: "staple", label: "主食类", itemCount: 5 },
  { key: "protein", label: "肉类", itemCount: 5 },
  { key: "vegetable", label: "蔬菜类", itemCount: 5 },
  { key: "oil", label: "油脂用量", itemCount: 4 },
];

export const EXERCISE_CATEGORY_PRESETS = [
  { key: "chest", label: "胸部", sortOrder: 1 },
  { key: "back", label: "背部", sortOrder: 2 },
  { key: "shoulder", label: "肩部", sortOrder: 3 },
  { key: "leg", label: "腿部", sortOrder: 4 },
  { key: "cardio", label: "有氧", sortOrder: 5 },
];

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};
