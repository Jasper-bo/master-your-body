export type Gender = "male" | "female" | "other";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active";

export type FitnessGoal = "lose_weight" | "maintain" | "gain_muscle";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MainNavItem = {
  href: "/dashboard" | "/nutrition" | "/training" | "/settings";
  label: string;
};

export type FoodCategoryPreset = {
  key: "staple" | "protein" | "vegetable" | "oil";
  label: string;
  itemCount: number;
};

export type FoodNutritionPer100g = {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};
