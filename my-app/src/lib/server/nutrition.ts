import type { Prisma, MealType } from "@prisma/client";
import { calculateFoodNutrition } from "@/lib/nutrition-math";
import { prisma } from "@/lib/server/prisma";
import { isObject } from "@/lib/server/validators";
import type {
  CreateMealResponse,
  FoodCategoryData,
  FoodCategoryKey,
  MealRecordData,
  NutritionTodayData,
  OilOptionData,
} from "@/types/nutrition";

const TIME_ZONE = "Asia/Shanghai";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTERNAL_OIL_FOOD_NAME = "食用油";

const mealTypes = new Set<MealType>([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

const mealTypeNames: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

const categoryKeyByName: Record<string, FoodCategoryKey> = {
  主食类: "staple",
  肉类: "meat",
  蔬菜类: "vegetable",
  油脂用量: "oil",
};

const categorySeeds = [
  {
    key: "staple" as const,
    name: "主食类",
    icon: "grain",
    sortOrder: 1,
    foods: [
      [ "糙米饭", 130, 2.7, 28.0, 0.9 ],
      [ "全麦面包", 247, 13.0, 41.0, 3.4 ],
      [ "红薯", 86, 1.6, 20.1, 0.1 ],
      [ "燕麦", 389, 16.9, 66.3, 6.9 ],
      [ "意面", 157, 5.8, 30.9, 0.9 ],
    ],
  },
  {
    key: "meat" as const,
    name: "肉类",
    icon: "meat",
    sortOrder: 2,
    foods: [
      [ "鸡胸肉", 165, 31.0, 0.0, 3.6 ],
      [ "三文鱼", 208, 20.0, 0.0, 13.0 ],
      [ "瘦牛肉", 250, 26.0, 0.0, 15.0 ],
      [ "虾仁", 85, 20.0, 0.0, 0.5 ],
      [ "豆腐", 76, 8.0, 1.9, 4.8 ],
    ],
  },
  {
    key: "vegetable" as const,
    name: "蔬菜类",
    icon: "vegetable",
    sortOrder: 3,
    foods: [
      [ "西兰花", 34, 2.8, 7.0, 0.4 ],
      [ "菠菜", 23, 2.9, 3.6, 0.4 ],
      [ "生菜", 15, 1.4, 2.9, 0.2 ],
      [ "西红柿", 18, 0.9, 3.9, 0.2 ],
      [ "胡萝卜", 41, 0.9, 9.6, 0.2 ],
    ],
  },
  {
    key: "oil" as const,
    name: "油脂用量",
    icon: "oil",
    sortOrder: 4,
    foods: [
      [ INTERNAL_OIL_FOOD_NAME, 900, 0.0, 0.0, 100.0 ],
    ],
  },
] satisfies Array<{
  key: FoodCategoryKey;
  name: string;
  icon: string;
  sortOrder: number;
  foods: Array<[string, number, number, number, number]>;
}>;

const oilOptions: OilOptionData[] = [
  { id: "oil_none", label: "无油", amount: 0, unit: "g", calories: 0, fat: 0 },
  { id: "oil_light", label: "少油", amount: 5, unit: "g", calories: 45, fat: 5 },
  { id: "oil_medium", label: "中等", amount: 10, unit: "g", calories: 90, fat: 10 },
  { id: "oil_heavy", label: "多油", amount: 20, unit: "g", calories: 180, fat: 20 },
];

const datePartsFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const mealInclude = {
  mealFoods: {
    include: {
      foodItem: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.MealRecordInclude;

type MealWithFoods = Prisma.MealRecordGetPayload<{ include: typeof mealInclude }>;
type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

type CreateMealInput = {
  mealType: MealType;
  date: string;
  items: Array<{
    foodId: string;
    amount: number;
  }>;
  oilOptionId: string | null;
};

export class NutritionProfileMissingError extends Error {
  constructor() {
    super("请先完成个性化计划");
  }
}

export class NutritionFoodNotFoundError extends Error {
  constructor() {
    super("引用的食物不存在或不可用");
  }
}

export class NutritionValidationError extends Error {
  constructor(message = "营养录入参数校验失败") {
    super(message);
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

export function parseNutritionDate(date: string | null | undefined) {
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

export function parseCreateMealRequest(body: Record<string, unknown>) {
  const mealType = body.mealType;
  const date = parseNutritionDate(
    typeof body.date === "string" ? body.date : undefined,
  );
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((item) => {
      if (!isObject(item) || typeof item.foodId !== "string") {
        return null;
      }

      const amount = Number(item.amount ?? item.quantityG);

      if (!Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      return {
        foodId: item.foodId,
        amount,
      };
    })
    .filter((item): item is CreateMealInput["items"][number] => Boolean(item));
  const oilOptionId =
    isObject(body.oilOption) && typeof body.oilOption.optionId === "string"
      ? body.oilOption.optionId
      : null;
  const selectedOilOption = oilOptions.find((option) => option.id === oilOptionId);

  if (
    typeof mealType !== "string" ||
    !mealTypes.has(mealType as MealType) ||
    !date ||
    rawItems.length !== items.length ||
    items.length > 20 ||
    (oilOptionId && !selectedOilOption) ||
    (items.length === 0 && (!selectedOilOption || selectedOilOption.amount === 0))
  ) {
    return null;
  }

  return {
    mealType: mealType as MealType,
    date,
    items,
    oilOptionId,
  } satisfies CreateMealInput;
}

export async function ensureSystemFoodData(client: PrismaClientLike = prisma) {
  for (const categorySeed of categorySeeds) {
    const category =
      (await client.foodCategory.findUnique({
        where: { name: categorySeed.name },
      })) ??
      (await client.foodCategory.create({
        data: {
          name: categorySeed.name,
          icon: categorySeed.icon,
          sortOrder: categorySeed.sortOrder,
          isSystem: true,
        },
      }));

    await client.foodCategory.update({
      where: { id: category.id },
      data: {
        icon: categorySeed.icon,
        sortOrder: categorySeed.sortOrder,
        isSystem: true,
      },
    });

    for (const [name, calories, protein, carbs, fat] of categorySeed.foods) {
      const existingFood = await client.foodItem.findFirst({
        where: {
          categoryId: category.id,
          name,
          isSystem: true,
        },
      });

      const data = {
        name,
        categoryId: category.id,
        caloriesPer100g: calories,
        proteinPer100g: protein,
        carbsPer100g: carbs,
        fatPer100g: fat,
        unit: "g",
        isSystem: true,
        isActive: true,
      };

      if (existingFood) {
        await client.foodItem.update({
          where: { id: existingFood.id },
          data,
        });
      } else {
        await client.foodItem.create({ data });
      }
    }
  }
}

export async function getFoodCategories(): Promise<FoodCategoryData[]> {
  await ensureSystemFoodData();

  const categories = await prisma.foodCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      foodItems: {
        where: {
          isActive: true,
          isSystem: true,
          NOT: {
            name: INTERNAL_OIL_FOOD_NAME,
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return categories
    .map((category) => {
      const key = categoryKeyByName[category.name];

      if (!key) {
        return null;
      }

      return {
        id: category.id,
        key,
        name: category.name,
        icon: category.icon,
        foods: category.foodItems.map((food) => ({
          id: food.id,
          name: food.name,
          unit: "g" as const,
          nutritionPer100g: {
            calories: food.caloriesPer100g,
            protein: Number(food.proteinPer100g),
            carbs: Number(food.carbsPer100g),
            fat: Number(food.fatPer100g),
          },
        })),
      };
    })
    .filter((category): category is FoodCategoryData => Boolean(category));
}

export function getOilOptions() {
  return oilOptions;
}

export async function getNutritionToday(
  userId: string,
  dateKey = getTodayDateKey(),
): Promise<NutritionTodayData> {
  const profile = await getUserProfileOrThrow(userId);
  const recordDate = dateFromKey(dateKey);
  const [dailyNutrition, meals] = await Promise.all([
    prisma.dailyNutrition.findUnique({
      where: { userId_recordDate: { userId, recordDate } },
    }),
    prisma.mealRecord.findMany({
      where: { userId, recordDate },
      orderBy: { createdAt: "asc" },
      include: mealInclude,
    }),
  ]);
  const summary = {
    calories: {
      current: dailyNutrition?.totalCalories ?? 0,
      target: dailyNutrition?.caloriesTarget ?? profile.dailyCalorieTarget,
      unit: "kcal" as const,
    },
    protein: {
      current: roundMacro(Number(dailyNutrition?.totalProteinG ?? 0)),
      target: dailyNutrition?.proteinTargetG ?? profile.dailyProteinTargetG,
      unit: "g" as const,
    },
    carbs: {
      current: roundMacro(Number(dailyNutrition?.totalCarbsG ?? 0)),
      target: dailyNutrition?.carbsTargetG ?? profile.dailyCarbsTargetG,
      unit: "g" as const,
    },
    fat: {
      current: roundMacro(Number(dailyNutrition?.totalFatG ?? 0)),
      target: dailyNutrition?.fatTargetG ?? profile.dailyFatTargetG,
      unit: "g" as const,
    },
  };

  return {
    date: dateKey,
    summary,
    progressPercentage:
      summary.calories.target > 0
        ? Math.min(100, Math.round((summary.calories.current / summary.calories.target) * 100))
        : 0,
    remainingCalories: Math.max(
      0,
      summary.calories.target - summary.calories.current,
    ),
    meals: meals.map(serializeMeal),
  };
}

export async function recordMeal(
  userId: string,
  input: CreateMealInput,
): Promise<CreateMealResponse> {
  await ensureSystemFoodData();

  const profile = await getUserProfileOrThrow(userId);
  const recordDate = dateFromKey(input.date);
  const foodIds = Array.from(new Set(input.items.map((item) => item.foodId)));
  const foods = await prisma.foodItem.findMany({
    where: {
      id: { in: foodIds },
      isActive: true,
    },
    include: { category: true },
  });

  if (foods.length !== foodIds.length) {
    throw new NutritionFoodNotFoundError();
  }

  const foodById = new Map(foods.map((food) => [food.id, food]));
  const entries = input.items.map((item) => {
    const food = foodById.get(item.foodId);

    if (!food) {
      throw new NutritionFoodNotFoundError();
    }

    const categoryKey = categoryKeyByName[food.category.name];

    if (!categoryKey || categoryKey === "oil") {
      throw new NutritionValidationError("食物分类不支持手动克数录入");
    }

    assertAmountInRange(categoryKey, item.amount);

    const nutrition = calculateFoodNutrition(
      {
        caloriesPer100g: food.caloriesPer100g,
        proteinPer100g: Number(food.proteinPer100g),
        carbsPer100g: Number(food.carbsPer100g),
        fatPer100g: Number(food.fatPer100g),
      },
      item.amount,
    );

    return {
      foodItemId: food.id,
      quantityG: item.amount,
      calculatedCalories: nutrition.calories,
      calculatedProteinG: nutrition.proteinG,
      calculatedCarbsG: nutrition.carbsG,
      calculatedFatG: nutrition.fatG,
    };
  });
  const oilOption = oilOptions.find((option) => option.id === input.oilOptionId);

  if (oilOption && oilOption.amount > 0) {
    const oilFood = await getInternalOilFood();

    entries.push({
      foodItemId: oilFood.id,
      quantityG: oilOption.amount,
      calculatedCalories: oilOption.calories,
      calculatedProteinG: 0,
      calculatedCarbsG: 0,
      calculatedFatG: oilOption.fat,
    });
  }

  if (entries.length === 0) {
    throw new NutritionValidationError("至少需要添加一个食物或油脂选项");
  }

  const totals = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.calculatedCalories,
      protein: roundMacro(sum.protein + entry.calculatedProteinG),
      carbs: roundMacro(sum.carbs + entry.calculatedCarbsG),
      fat: roundMacro(sum.fat + entry.calculatedFatG),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const meal = await prisma.$transaction(async (tx) => {
    const createdMeal = await tx.mealRecord.create({
      data: {
        userId,
        recordDate,
        mealType: input.mealType,
        totalCalories: totals.calories,
        totalProteinG: totals.protein,
        totalCarbsG: totals.carbs,
        totalFatG: totals.fat,
        mealFoods: {
          create: entries,
        },
      },
      include: mealInclude,
    });

    await recalculateDailyNutrition(userId, recordDate, profile, tx);

    return createdMeal;
  });
  const serialized = serializeMeal(meal);

  return {
    mealId: serialized.id,
    mealType: serialized.type,
    date: input.date,
    items: serialized.items,
    totalCalories: serialized.totalCalories,
    totalProtein: serialized.totalProtein,
    totalCarbs: serialized.totalCarbs,
    totalFat: serialized.totalFat,
    createdAt: serialized.createdAt,
  };
}

export async function deleteMealRecord(userId: string, mealId: string) {
  const profile = await getUserProfileOrThrow(userId);
  const meal = await prisma.mealRecord.findFirst({
    where: { id: mealId, userId },
    select: { id: true, recordDate: true },
  });

  if (!meal) {
    throw new NutritionFoodNotFoundError();
  }

  await prisma.$transaction(async (tx) => {
    await tx.mealRecord.delete({ where: { id: meal.id } });
    await recalculateDailyNutrition(userId, meal.recordDate, profile, tx);
  });

  return {
    deletedId: meal.id,
  };
}

async function getUserProfileOrThrow(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NutritionProfileMissingError();
  }

  return profile;
}

async function getInternalOilFood() {
  const oilFood = await prisma.foodItem.findFirst({
    where: {
      name: INTERNAL_OIL_FOOD_NAME,
      isSystem: true,
      isActive: true,
      category: {
        name: "油脂用量",
      },
    },
  });

  if (!oilFood) {
    throw new NutritionFoodNotFoundError();
  }

  return oilFood;
}

async function recalculateDailyNutrition(
  userId: string,
  recordDate: Date,
  profile: Awaited<ReturnType<typeof getUserProfileOrThrow>>,
  client: PrismaClientLike,
) {
  const meals = await client.mealRecord.findMany({
    where: { userId, recordDate },
    select: {
      totalCalories: true,
      totalProteinG: true,
      totalCarbsG: true,
      totalFatG: true,
    },
  });
  const totals = meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.totalCalories,
      protein: roundMacro(sum.protein + Number(meal.totalProteinG)),
      carbs: roundMacro(sum.carbs + Number(meal.totalCarbsG)),
      fat: roundMacro(sum.fat + Number(meal.totalFatG)),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  await client.dailyNutrition.upsert({
    where: { userId_recordDate: { userId, recordDate } },
    create: {
      userId,
      recordDate,
      totalCalories: totals.calories,
      totalProteinG: totals.protein,
      totalCarbsG: totals.carbs,
      totalFatG: totals.fat,
      caloriesTarget: profile.dailyCalorieTarget,
      proteinTargetG: profile.dailyProteinTargetG,
      carbsTargetG: profile.dailyCarbsTargetG,
      fatTargetG: profile.dailyFatTargetG,
    },
    update: {
      totalCalories: totals.calories,
      totalProteinG: totals.protein,
      totalCarbsG: totals.carbs,
      totalFatG: totals.fat,
      caloriesTarget: profile.dailyCalorieTarget,
      proteinTargetG: profile.dailyProteinTargetG,
      carbsTargetG: profile.dailyCarbsTargetG,
      fatTargetG: profile.dailyFatTargetG,
    },
  });
}

function serializeMeal(meal: MealWithFoods): MealRecordData {
  return {
    id: meal.id,
    type: meal.mealType,
    name: mealTypeNames[meal.mealType],
    items: meal.mealFoods.map((mealFood) => {
      const category = categoryKeyByName[mealFood.foodItem.category.name] ?? "staple";
      const isOil = mealFood.foodItem.name === INTERNAL_OIL_FOOD_NAME;

      return {
        id: mealFood.id,
        foodId: mealFood.foodItemId,
        name: isOil ? "油脂" : mealFood.foodItem.name,
        category,
        amount: Number(mealFood.quantityG),
        unit: "g",
        calories: mealFood.calculatedCalories,
        protein: roundMacro(Number(mealFood.calculatedProteinG)),
        carbs: roundMacro(Number(mealFood.calculatedCarbsG)),
        fat: roundMacro(Number(mealFood.calculatedFatG)),
      };
    }),
    totalCalories: meal.totalCalories,
    totalProtein: roundMacro(Number(meal.totalProteinG)),
    totalCarbs: roundMacro(Number(meal.totalCarbsG)),
    totalFat: roundMacro(Number(meal.totalFatG)),
    createdAt: meal.createdAt.toISOString(),
  };
}

function assertAmountInRange(category: FoodCategoryKey, amount: number) {
  if (category === "staple" && (amount < 10 || amount > 2000)) {
    throw new NutritionValidationError("主食类克数需在 10-2000g 之间");
  }

  if ((category === "meat" || category === "vegetable") && (amount < 10 || amount > 1000)) {
    throw new NutritionValidationError("肉类和蔬菜类克数需在 10-1000g 之间");
  }
}

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function keyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}
