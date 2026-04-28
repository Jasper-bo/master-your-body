import type { FoodNutritionPer100g } from "@/types/models";

export function calculateFoodNutrition(
  food: FoodNutritionPer100g,
  quantityG: number,
) {
  const ratio = quantityG / 100;

  return {
    calories: Math.round(food.caloriesPer100g * ratio),
    proteinG: roundMacro(food.proteinPer100g * ratio),
    carbsG: roundMacro(food.carbsPer100g * ratio),
    fatG: roundMacro(food.fatPer100g * ratio),
  };
}

export function calculateCaloriesFromMacros(input: {
  proteinG: number;
  carbsG: number;
  fatG: number;
}) {
  return Math.round(input.proteinG * 4 + input.carbsG * 4 + input.fatG * 9);
}

function roundMacro(value: number) {
  return Math.round(value * 100) / 100;
}
