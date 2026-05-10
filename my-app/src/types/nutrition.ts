import type { MealType } from "@/types/models";

export type FoodCategoryKey = "staple" | "meat" | "vegetable" | "oil";

export type NutritionMetric = {
  current: number;
  target: number;
  unit: "g" | "kcal";
};

export type FoodCategoryData = {
  id: string;
  key: FoodCategoryKey;
  name: string;
  icon: string | null;
  foods: Array<{
    id: string;
    name: string;
    unit: "g";
    nutritionPer100g: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }>;
};

export type OilOptionData = {
  id: string;
  label: string;
  amount: number;
  unit: "g";
  calories: number;
  fat: number;
};

export type MealFoodData = {
  id: string;
  foodId: string;
  name: string;
  category: FoodCategoryKey;
  amount: number;
  unit: "g";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealRecordData = {
  id: string;
  type: MealType;
  name: string;
  items: MealFoodData[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: string;
};

export type NutritionTodayData = {
  date: string;
  summary: {
    calories: NutritionMetric;
    protein: NutritionMetric;
    carbs: NutritionMetric;
    fat: NutritionMetric;
  };
  progressPercentage: number;
  remainingCalories: number;
  meals: MealRecordData[];
};

export type CreateMealResponse = {
  mealId: string;
  mealType: MealType;
  date: string;
  items: MealFoodData[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: string;
};

export type NutritionHistoryData = {
  items: Array<MealRecordData & { date: string }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
