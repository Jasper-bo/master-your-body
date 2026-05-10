"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiRequest } from "@/lib/client/api";
import type { ExerciseCategoryKey, TrainingHistoryData } from "@/types/training";

type TrainingHistoryClientProps = {
  initialHistory: TrainingHistoryData;
  initialStartDate: string;
  initialEndDate: string;
  initialCategory: ExerciseCategoryKey | "all";
};

const categoryLabels: Record<ExerciseCategoryKey | "all", string> = {
  all: "全部部位",
  chest: "胸部",
  back: "背部",
  shoulder: "肩部",
  leg: "腿部",
  cardio: "有氧",
};

export function TrainingHistoryClient({
  initialHistory,
  initialStartDate,
  initialEndDate,
  initialCategory,
}: TrainingHistoryClientProps) {
  const router = useRouter();
  const [history, setHistory] = useState(initialHistory);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [category, setCategory] =
    useState<ExerciseCategoryKey | "all">(initialCategory);
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
        category,
        page: String(nextPage),
        limit: String(history.pagination.limit),
      });
      const nextHistory = await apiRequest<TrainingHistoryData>(
        `/api/training/history?${params.toString()}`,
        {},
        { auth: true },
      );

      setHistory(nextHistory);
      setPage(nextHistory.pagination.page);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "获取训练历史失败");
    } finally {
      setStatus("idle");
    }
  }

  async function deleteSession(sessionId: string) {
    if (!window.confirm("确定删除这条训练记录吗？删除后会重新计算运动打卡和健康评分。")) {
      return;
    }

    setStatus("deleting");
    setError(null);

    try {
      await apiRequest(
        `/api/training/history/${sessionId}`,
        { method: "DELETE" },
        { auth: true },
      );
      await fetchHistory(page);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除训练失败");
      setStatus("idle");
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">训练历史</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            回顾和清理历史训练
          </h2>
        </div>
        <div className="grid w-full gap-3 md:w-auto md:grid-cols-[9rem_9rem_9rem_auto]">
          <DateField label="开始" onChange={setStartDate} value={startDate} />
          <DateField label="结束" onChange={setEndDate} value={endDate} />
          <label className="space-y-2">
            <span className="text-sm font-medium">部位</span>
            <select
              className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
              onChange={(event) => {
                setCategory(event.target.value as ExerciseCategoryKey | "all");
                setPage(1);
              }}
              value={category}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
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
        {history.items.map((session) => (
          <div className="rounded-xl border border-border bg-white p-4" key={session.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {session.date} · {session.durationMin} 分钟 ·{" "}
                  {session.totalExercises} 个动作
                </p>
                <p className="mt-1 text-sm text-muted">
                  {session.totalSets} 组 · 容量 {session.totalVolumeKg} kg ·{" "}
                  {session.trainedParts.map((part) => categoryLabels[part]).join("、")}
                </p>
              </div>
              <Button
                disabled={status !== "idle"}
                onClick={() => deleteSession(session.id)}
                variant="ghost"
              >
                删除
              </Button>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted">
              {session.exercises.map((exercise) => (
                <p key={`${session.id}-${exercise.id}`}>
                  {exercise.name} · {formatExercise(exercise)}
                </p>
              ))}
            </div>
            {session.notes ? (
              <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-muted">
                {session.notes}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {history.items.length === 0 ? (
        <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
          当前日期范围内没有训练记录。
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

function formatExercise(
  exercise: TrainingHistoryData["items"][number]["exercises"][number],
) {
  if (exercise.type === "cardio") {
    return exercise.sets
      .map((set) => `${set.durationMin ?? 0}min`)
      .join(" / ");
  }

  const firstSet = exercise.sets[0];

  return `${exercise.sets.length} 组 × ${firstSet?.reps ?? 0} 次 · ${
    firstSet?.weightKg ?? 0
  }kg`;
}
