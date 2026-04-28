"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { apiRequest } from "@/lib/client/api";
import type { MealType } from "@/types/models";
import type {
  CreateMealResponse,
  FoodCategoryData,
  FoodCategoryKey,
  MealFoodData,
  NutritionTodayData,
  OilOptionData,
} from "@/types/nutrition";

type NutritionManualClientProps = {
  initialToday: NutritionTodayData;
  categories: FoodCategoryData[];
  oilOptions: OilOptionData[];
};

type PendingFood = Omit<MealFoodData, "id"> & {
  tempId: string;
};

const defaultAmounts: Partial<Record<FoodCategoryKey, number>> = {
  staple: 150,
  meat: 150,
  vegetable: 200,
};

const categoryHints: Record<FoodCategoryKey, string> = {
  staple: "10-2000g",
  meat: "10-1000g",
  vegetable: "10-1000g",
  oil: "使用下方油脂选项",
};

const mealTypeOptions: Array<[MealType, string]> = [
  ["breakfast", "早餐"],
  ["lunch", "午餐"],
  ["dinner", "晚餐"],
  ["snack", "加餐"],
];

export function NutritionManualClient({
  initialToday,
  categories,
  oilOptions,
}: NutritionManualClientProps) {
  const visibleCategories = categories.filter(
    (category) => category.key !== "oil" && category.foods.length > 0,
  );
  const [today, setToday] = useState(initialToday);
  const [pendingFoods, setPendingFoods] = useState<PendingFood[]>([]);
  const [mealType, setMealType] = useState<MealType>(inferDefaultMealType());
  const [selectedFoods, setSelectedFoods] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        visibleCategories.map((category) => [
          category.key,
          category.foods[0]?.id ?? "",
        ]),
      ),
  );
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      visibleCategories.map((category) => [
        category.key,
        defaultAmounts[category.key] ?? 100,
      ]),
    ),
  );
  const [oilOptionId, setOilOptionId] = useState("oil_none");
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);
  const selectedOil = oilOptions.find((option) => option.id === oilOptionId);
  const pendingTotals = useMemo(
    () => calculatePendingTotals(pendingFoods, selectedOil),
    [pendingFoods, selectedOil],
  );

  function addFood(category: FoodCategoryData) {
    const food = category.foods.find(
      (candidate) => candidate.id === selectedFoods[category.key],
    );
    const amount = Number(amounts[category.key]);

    setError(null);

    if (!food || !Number.isFinite(amount)) {
      setError("请选择食物并输入有效克数");
      return;
    }

    const rangeError = validateAmount(category.key, amount);

    if (rangeError) {
      setError(rangeError);
      return;
    }

    const nutrition = calculateItemNutrition(food.nutritionPer100g, amount);

    setPendingFoods((current) => [
      ...current,
      {
        tempId: `${food.id}-${Date.now()}`,
        foodId: food.id,
        name: food.name,
        category: category.key,
        amount,
        unit: "g",
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
      },
    ]);
  }

  async function refreshToday() {
    setToday(await apiRequest<NutritionTodayData>("/api/nutrition/today", {}, { auth: true }));
  }

  async function saveMeal() {
    setStatus("saving");
    setError(null);

    try {
      await apiRequest<CreateMealResponse>(
        "/api/nutrition/meals",
        {
          method: "POST",
          body: JSON.stringify({
            mealType,
            items: pendingFoods.map((food) => ({
              foodId: food.foodId,
              amount: food.amount,
              unit: "g",
            })),
            oilOption: selectedOil
              ? {
                  optionId: selectedOil.id,
                  amount: selectedOil.amount,
                }
              : undefined,
          }),
        },
        { auth: true },
      );
      setPendingFoods([]);
      setOilOptionId("oil_none");
      await refreshToday();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存餐食失败");
    } finally {
      setStatus("idle");
    }
  }

  async function deleteMeal(mealId: string) {
    setStatus("deleting");
    setError(null);

    try {
      await apiRequest(`/api/nutrition/meals/${mealId}`, {
        method: "DELETE",
      }, { auth: true });
      await refreshToday();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除餐食失败");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">今日摄入概览</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              {today.summary.calories.current} / {today.summary.calories.target} kcal
            </h2>
            <p className="mt-2 text-sm text-muted">
              今日剩余可摄入 {today.remainingCalories} kcal
            </p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary-bright"
              style={{ width: `${today.progressPercentage}%` }}
            />
          </div>
          <ProgressBar
            label="蛋白质"
            max={today.summary.protein.target}
            tone="primary"
            value={today.summary.protein.current}
          />
          <ProgressBar
            label="碳水"
            max={today.summary.carbs.target}
            tone="secondary"
            value={today.summary.carbs.current}
          />
          <ProgressBar
            label="脂肪"
            max={today.summary.fat.target}
            tone="warning"
            value={today.summary.fat.current}
          />
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">手动食物录入</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              选择食物并加入当前餐食
            </h2>
          </div>
          <div className="grid gap-4">
            {visibleCategories.map((category) => (
              <div
                className="grid gap-3 rounded-xl border border-border bg-white p-4 md:grid-cols-[1fr_8rem_auto]"
                key={category.id}
              >
                <label className="space-y-2">
                  <span className="text-sm font-medium">{category.name}</span>
                  <select
                    className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
                    onChange={(event) =>
                      setSelectedFoods({
                        ...selectedFoods,
                        [category.key]: event.target.value,
                      })
                    }
                    value={selectedFoods[category.key]}
                  >
                    {category.foods.map((food) => (
                      <option key={food.id} value={food.id}>
                        {food.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    克数 {categoryHints[category.key]}
                  </span>
                  <input
                    className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
                    min={0}
                    onChange={(event) =>
                      setAmounts({
                        ...amounts,
                        [category.key]: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={amounts[category.key] ?? 0}
                  />
                </label>
                <Button
                  className="self-end"
                  onClick={() => addFood(category)}
                  variant="secondary"
                >
                  加入
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">当前餐食待确认</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">
                {pendingFoods.length} 个食物条目
              </h2>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium">餐别</span>
              <select
                className="rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
                onChange={(event) => setMealType(event.target.value as MealType)}
                value={mealType}
              >
                {mealTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3">
            {pendingFoods.map((food) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-4"
                key={food.tempId}
              >
                <div>
                  <p className="font-semibold">
                    {food.name} · {food.amount}g
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {food.calories} kcal · 蛋白 {food.protein}g · 碳水 {food.carbs}g · 脂肪 {food.fat}g
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setPendingFoods((current) =>
                      current.filter((item) => item.tempId !== food.tempId),
                    )
                  }
                  variant="ghost"
                >
                  移除
                </Button>
              </div>
            ))}
            {pendingFoods.length === 0 ? (
              <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
                暂无待确认食物。先从上方分类中选择食物并加入。
              </p>
            ) : null}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">油脂用量</span>
            <select
              className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
              onChange={(event) => setOilOptionId(event.target.value)}
              value={oilOptionId}
            >
              {oilOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} · {option.amount}g · {option.calories} kcal
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-border bg-white p-4">
            <p className="font-semibold">本餐合计</p>
            <p className="mt-2 text-sm text-muted">
              {pendingTotals.calories} kcal · 蛋白 {pendingTotals.protein}g · 碳水 {pendingTotals.carbs}g · 脂肪 {pendingTotals.fat}g
            </p>
          </div>

          {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

          <Button
            className="w-full"
            disabled={status !== "idle"}
            onClick={saveMeal}
          >
            {status === "saving" ? "保存中..." : "确认并记录当前餐食"}
          </Button>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">今日餐食记录</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              已保存 {today.meals.length} 餐
            </h2>
          </div>
          <div className="space-y-3">
            {today.meals.map((meal) => (
              <div className="rounded-xl border border-border bg-white p-4" key={meal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {meal.name} · {meal.totalCalories} kcal
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      蛋白 {meal.totalProtein}g · 碳水 {meal.totalCarbs}g · 脂肪 {meal.totalFat}g
                    </p>
                  </div>
                  <Button
                    disabled={status !== "idle"}
                    onClick={() => deleteMeal(meal.id)}
                    variant="ghost"
                  >
                    删除
                  </Button>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  {meal.items.map((item) => (
                    <p key={item.id}>
                      {item.name} {item.amount}g · {item.calories} kcal
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {today.meals.length === 0 ? (
              <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
                今天还没有保存餐食，记录第一餐后这里会自动刷新。
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

function inferDefaultMealType(): MealType {
  const hour = new Date().getHours();

  if (hour < 10) {
    return "breakfast";
  }

  if (hour < 14) {
    return "lunch";
  }

  if (hour < 20) {
    return "dinner";
  }

  return "snack";
}

function calculateItemNutrition(
  nutritionPer100g: FoodCategoryData["foods"][number]["nutritionPer100g"],
  amount: number,
) {
  const ratio = amount / 100;

  return {
    calories: Math.round(nutritionPer100g.calories * ratio),
    protein: roundMacro(nutritionPer100g.protein * ratio),
    carbs: roundMacro(nutritionPer100g.carbs * ratio),
    fat: roundMacro(nutritionPer100g.fat * ratio),
  };
}

function calculatePendingTotals(
  foods: PendingFood[],
  oilOption: OilOptionData | undefined,
) {
  const totals = foods.reduce(
    (sum, food) => ({
      calories: sum.calories + food.calories,
      protein: roundMacro(sum.protein + food.protein),
      carbs: roundMacro(sum.carbs + food.carbs),
      fat: roundMacro(sum.fat + food.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  if (!oilOption) {
    return totals;
  }

  return {
    calories: totals.calories + oilOption.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: roundMacro(totals.fat + oilOption.fat),
  };
}

function validateAmount(category: FoodCategoryKey, amount: number) {
  if (category === "staple" && (amount < 10 || amount > 2000)) {
    return "主食类克数需在 10-2000g 之间";
  }

  if ((category === "meat" || category === "vegetable") && (amount < 10 || amount > 1000)) {
    return "肉类和蔬菜类克数需在 10-1000g 之间";
  }

  return null;
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}
