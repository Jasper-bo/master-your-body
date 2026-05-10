"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiRequest } from "@/lib/client/api";
import type { MealType } from "@/types/models";
import type { NutritionHistoryData } from "@/types/nutrition";

type NutritionHistoryClientProps = {
  initialHistory: NutritionHistoryData;
  initialStartDate: string;
  initialEndDate: string;
  initialMealType: MealType | "all";
};

const mealTypeLabels: Record<MealType | "all", string> = {
  all: "全部餐别",
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

export function NutritionHistoryClient({
  initialHistory,
  initialStartDate,
  initialEndDate,
  initialMealType,
}: NutritionHistoryClientProps) {
  const router = useRouter();
  const [history, setHistory] = useState(initialHistory);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [mealType, setMealType] = useState<MealType | "all">(initialMealType);
  const [page, setPage] = useState(initialHistory.pagination.page);
  const [status, setStatus] = useState<"idle" | "loading" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function fetchHistory(nextPage = page) {
    setStatus("loading");
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        mealType,
        page: String(nextPage),
        limit: String(history.pagination.limit),
      });
      const nextHistory = await apiRequest<NutritionHistoryData>(
        `/api/nutrition/history?${params.toString()}`,
        {},
        { auth: true },
      );

      setHistory(nextHistory);
      setPage(nextHistory.pagination.page);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "获取饮食历史失败");
    } finally {
      setStatus("idle");
    }
  }

  async function deleteMeal(mealId: string) {
    if (!window.confirm("确定删除这条餐食记录吗？删除后会重新计算当天营养汇总。")) {
      return;
    }

    setStatus("deleting");
    setError(null);

    try {
      await apiRequest(
        `/api/nutrition/meals/${mealId}`,
        { method: "DELETE" },
        { auth: true },
      );
      await fetchHistory(page);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除餐食失败");
      setStatus("idle");
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">饮食历史</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            查看和清理历史餐食
          </h2>
        </div>
        <div className="grid w-full gap-3 md:w-auto md:grid-cols-[9rem_9rem_9rem_auto]">
          <DateField label="开始" onChange={setStartDate} value={startDate} />
          <DateField label="结束" onChange={setEndDate} value={endDate} />
          <label className="space-y-2">
            <span className="text-sm font-medium">餐别</span>
            <select
              className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
              onChange={(event) => {
                setMealType(event.target.value as MealType | "all");
                setPage(1);
              }}
              value={mealType}
            >
              {Object.entries(mealTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="self-end"
            disabled={status !== "idle"}
            onClick={() => fetchHistory(1)}
            variant="secondary"
          >
            查询
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {history.items.map((meal) => (
          <div className="rounded-xl border border-border bg-white p-4" key={meal.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {meal.date} · {meal.name} · {meal.totalCalories} kcal
                </p>
                <p className="mt-1 text-sm text-muted">
                  蛋白 {meal.totalProtein}g · 碳水 {meal.totalCarbs}g · 脂肪{" "}
                  {meal.totalFat}g
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
      </div>

      {history.items.length === 0 ? (
        <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
          当前日期范围内没有餐食记录。
        </p>
      ) : null}

      <HistoryPager
        disabled={status !== "idle"}
        hasNext={history.pagination.hasNext}
        hasPrev={history.pagination.hasPrev}
        onNext={() => fetchHistory(page + 1)}
        onPrev={() => fetchHistory(page - 1)}
        page={history.pagination.page}
        totalPages={history.pagination.totalPages}
      />
    </Card>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function HistoryPager({
  disabled,
  hasNext,
  hasPrev,
  onNext,
  onPrev,
  page,
  totalPages,
}: {
  disabled: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        第 {page} / {totalPages} 页
      </p>
      <div className="flex gap-2">
        <Button disabled={disabled || !hasPrev} onClick={onPrev} variant="ghost">
          上一页
        </Button>
        <Button disabled={disabled || !hasNext} onClick={onNext} variant="ghost">
          下一页
        </Button>
      </div>
    </div>
  );
}
