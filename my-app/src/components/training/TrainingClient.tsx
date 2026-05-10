"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiRequest } from "@/lib/client/api";
import type {
  ExerciseCategoryKey,
  ExerciseData,
  ExerciseLibraryData,
  QuickLogTrainingResponse,
  TrainingTodayData,
  TrainingWeeklyStatsData,
  TrainingYesterdayData,
  WorkoutSetData,
} from "@/types/training";

type TrainingClientProps = {
  initialToday: TrainingTodayData;
  initialYesterday: TrainingYesterdayData;
  initialWeeklyStats: TrainingWeeklyStatsData;
  library: ExerciseLibraryData;
};

type PendingExercise = {
  tempId: string;
  exerciseId: string;
  name: string;
  category: ExerciseCategoryKey;
  targetMuscle: string;
  type: ExerciseData["type"];
  sets: WorkoutSetData[];
};

type CategoryFilter = ExerciseCategoryKey | "all";

const categoryLabels: Record<CategoryFilter, string> = {
  all: "全部",
  chest: "胸部",
  back: "背部",
  shoulder: "肩部",
  leg: "腿部",
  cardio: "有氧",
};

export function TrainingClient({
  initialToday,
  initialYesterday,
  initialWeeklyStats,
  library,
}: TrainingClientProps) {
  const [today, setToday] = useState(initialToday);
  const [yesterday, setYesterday] = useState(initialYesterday);
  const [weeklyStats, setWeeklyStats] = useState(initialWeeklyStats);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    library.items[0]?.id ?? "",
  );
  const [pendingExercises, setPendingExercises] = useState<PendingExercise[]>([]);
  const [strengthSets, setStrengthSets] = useState(4);
  const [strengthReps, setStrengthReps] = useState(10);
  const [weightKg, setWeightKg] = useState(60);
  const [cardioDurationMin, setCardioDurationMin] = useState(30);
  const [incline, setIncline] = useState(0);
  const [resistance, setResistance] = useState(0);
  const [loadSetting, setLoadSetting] = useState("");
  const [actualDurationMin, setActualDurationMin] = useState(45);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const visibleExercises = useMemo(
    () =>
      category === "all"
        ? library.items
        : library.items.filter((exercise) => exercise.category === category),
    [category, library.items],
  );
  const selectedExercise =
    library.items.find((exercise) => exercise.id === selectedExerciseId) ??
    visibleExercises[0] ??
    library.items[0];
  const pendingSummary = useMemo(
    () => summarizePending(pendingExercises),
    [pendingExercises],
  );

  useEffect(() => {
    setToday(initialToday);
  }, [initialToday]);

  useEffect(() => {
    setYesterday(initialYesterday);
  }, [initialYesterday]);

  useEffect(() => {
    setWeeklyStats(initialWeeklyStats);
  }, [initialWeeklyStats]);

  function handleCategoryChange(nextCategory: CategoryFilter) {
    setCategory(nextCategory);
    const nextExercise =
      nextCategory === "all"
        ? library.items[0]
        : library.items.find((exercise) => exercise.category === nextCategory);

    if (nextExercise) {
      setSelectedExerciseId(nextExercise.id);
    }
  }

  function addSelectedExercise() {
    setError(null);

    if (!selectedExercise) {
      setError("动作库为空，无法添加训练动作");
      return;
    }

    if (selectedExercise.type === "cardio") {
      if (cardioDurationMin <= 0 || cardioDurationMin > 600) {
        setError("有氧时长需在 1-600 分钟之间");
        return;
      }

      setPendingExercises((current) => [
        ...current,
        {
          tempId: `${selectedExercise.id}-${Date.now()}`,
          exerciseId: selectedExercise.id,
          name: selectedExercise.name,
          category: selectedExercise.category,
          targetMuscle: selectedExercise.targetMuscle,
          type: selectedExercise.type,
          sets: [
            {
              setNumber: 1,
              durationMin: cardioDurationMin,
              incline,
              resistance,
              loadSetting: loadSetting || undefined,
              completed: true,
            },
          ],
        },
      ]);
      setActualDurationMin((current) =>
        Math.max(current, pendingSummary.durationMin + cardioDurationMin),
      );
      return;
    }

    if (
      !Number.isInteger(strengthSets) ||
      strengthSets < 1 ||
      strengthSets > 20 ||
      !Number.isInteger(strengthReps) ||
      strengthReps < 1 ||
      strengthReps > 100 ||
      weightKg < 0 ||
      weightKg > 500
    ) {
      setError("力量训练参数需满足重量 0-500kg、组数 1-20、次数 1-100");
      return;
    }

    setPendingExercises((current) => [
      ...current,
      {
        tempId: `${selectedExercise.id}-${Date.now()}`,
        exerciseId: selectedExercise.id,
        name: selectedExercise.name,
        category: selectedExercise.category,
        targetMuscle: selectedExercise.targetMuscle,
        type: selectedExercise.type,
        sets: Array.from({ length: strengthSets }, (_, index) => ({
          setNumber: index + 1,
          reps: strengthReps,
          weightKg,
          completed: true,
        })),
      },
    ]);
    setActualDurationMin((current) =>
      Math.max(current, pendingSummary.durationMin + strengthSets * 3),
    );
  }

  async function refreshTrainingData() {
    const [nextToday, nextYesterday, nextWeeklyStats] = await Promise.all([
      apiRequest<TrainingTodayData>("/api/training/today", {}, { auth: true }),
      apiRequest<TrainingYesterdayData>(
        "/api/training/yesterday",
        {},
        { auth: true },
      ),
      apiRequest<TrainingWeeklyStatsData>(
        "/api/training/weekly-stats",
        {},
        { auth: true },
      ),
    ]);

    setToday(nextToday);
    setYesterday(nextYesterday);
    setWeeklyStats(nextWeeklyStats);
  }

  async function submitTraining() {
    setStatus("saving");
    setError(null);

    try {
      await apiRequest<QuickLogTrainingResponse>(
        "/api/training/quick-log",
        {
          method: "POST",
          body: JSON.stringify({
            exercises: pendingExercises.map((exercise) => ({
              exerciseId: exercise.exerciseId,
              sets: exercise.sets.map((set) => ({
                reps: set.reps,
                weightKg: set.weightKg,
                durationMin: set.durationMin,
                incline: set.incline,
                resistance: set.resistance,
                loadSetting: set.loadSetting,
              })),
            })),
            durationMin: actualDurationMin,
            notes,
          }),
        },
        { auth: true },
      );
      setPendingExercises([]);
      setNotes("");
      await refreshTrainingData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "训练保存失败");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-muted">今日目标</p>
          <p className="font-display text-4xl font-bold">
            {today.summary.completedSessions} / {today.summary.targetSessions}
          </p>
          <p className="text-sm text-muted">
            已训练 {today.summary.durationMin} 分钟 · 完成{" "}
            {today.summary.completedSets} 组
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary-bright"
              style={{ width: `${today.summary.progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-primary">
            {today.summary.trainedParts.length > 0
              ? `今日部位：${today.summary.trainedParts.join("、")}`
              : "今日尚未完成训练"}
          </p>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold text-muted">昨日回顾</p>
          <p className="font-display text-3xl font-bold">
            {yesterday.hasWorkout ? `${yesterday.sessions.length} 次` : "暂无"}
          </p>
          <p className="text-sm text-muted">
            {yesterday.hasWorkout
              ? yesterday.sessions
                  .flatMap((session) => session.exercises.map((item) => item.name))
                  .slice(0, 4)
                  .join("、")
              : "昨日没有训练记录"}
          </p>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold text-muted">本周统计</p>
          <p className="font-display text-3xl font-bold">
            {weeklyStats.stats.workoutCount} 次 /{" "}
            {weeklyStats.stats.totalDurationMin} 分钟
          </p>
          <p className="text-sm text-muted">
            完成 {weeklyStats.stats.totalSets} 组 · 总容量{" "}
            {weeklyStats.stats.totalVolumeKg} kg
          </p>
          <p className="text-sm text-primary">
            同比上周{" "}
            {weeklyStats.stats.weekOverWeekChange === null
              ? "N/A"
              : `${weeklyStats.stats.weekOverWeekChange}%`}
          </p>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">动作库</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              选择动作并设置参数
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", ...library.categories.map((item) => item.id)] as CategoryFilter[]).map(
              (item) => (
                <button
                  className={[
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    category === item
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white text-muted hover:bg-surface-muted",
                  ].join(" ")}
                  key={item}
                  onClick={() => handleCategoryChange(item)}
                  type="button"
                >
                  {categoryLabels[item]}
                </button>
              ),
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleExercises.map((exercise) => (
              <button
                className={[
                  "rounded-xl border bg-white p-4 text-left transition hover:border-secondary",
                  selectedExercise?.id === exercise.id
                    ? "border-primary shadow-[var(--shadow-card)]"
                    : "border-border",
                ].join(" ")}
                key={exercise.id}
                onClick={() => setSelectedExerciseId(exercise.id)}
                type="button"
              >
                <p className="font-semibold">{exercise.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {exercise.targetMuscle} ·{" "}
                  {exercise.type === "cardio" ? "有氧" : "力量"}
                </p>
                <p className="mt-3 text-sm text-primary">
                  {exercise.type === "cardio"
                    ? `默认 ${exercise.defaultDurationMin ?? 30} 分钟`
                    : `默认 ${exercise.defaultSets ?? 4} 组 × ${exercise.defaultReps ?? 10} 次`}
                </p>
              </button>
            ))}
          </div>

          {selectedExercise ? (
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <p className="font-semibold">当前选择：{selectedExercise.name}</p>
              {selectedExercise.type === "cardio" ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <NumberField
                    label="时长 min"
                    onChange={setCardioDurationMin}
                    value={cardioDurationMin}
                  />
                  <NumberField label="坡度 %" onChange={setIncline} value={incline} />
                  <NumberField
                    label="阻力"
                    onChange={setResistance}
                    value={resistance}
                  />
                  <label className="space-y-2">
                    <span className="text-sm font-medium">负荷</span>
                    <input
                      className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
                      onChange={(event) => setLoadSetting(event.target.value)}
                      placeholder="可选"
                      value={loadSetting}
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <NumberField label="重量 kg" onChange={setWeightKg} value={weightKg} />
                  <NumberField label="组数" onChange={setStrengthSets} value={strengthSets} />
                  <NumberField label="次数" onChange={setStrengthReps} value={strengthReps} />
                </div>
              )}
              <Button className="mt-4" onClick={addSelectedExercise} variant="secondary">
                加入今日训练清单
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">今日训练清单</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              {pendingExercises.length} 个动作待提交
            </h2>
          </div>
          <div className="space-y-3">
            {pendingExercises.map((exercise) => (
              <div className="rounded-xl bg-surface-muted p-4" key={exercise.tempId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {exercise.name} · {exercise.targetMuscle}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatPendingExercise(exercise)}
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setPendingExercises((current) =>
                        current.filter((item) => item.tempId !== exercise.tempId),
                      )
                    }
                    variant="ghost"
                  >
                    移除
                  </Button>
                </div>
              </div>
            ))}
            {pendingExercises.length === 0 ? (
              <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
                先从动作库中选择动作，加入后再统一保存。
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="实际总时长 min"
              onChange={setActualDurationMin}
              value={actualDurationMin}
            />
            <label className="space-y-2">
              <span className="text-sm font-medium">备注</span>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="可选"
                value={notes}
              />
            </label>
          </div>

          <div className="rounded-xl border border-border bg-white p-4">
            <p className="font-semibold">本次训练合计</p>
            <p className="mt-2 text-sm text-muted">
              {pendingSummary.exercises} 个动作 · {pendingSummary.sets} 组 ·{" "}
              {pendingSummary.durationMin} 分钟估算 · 容量{" "}
              {pendingSummary.volumeKg} kg
            </p>
          </div>

          {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

          <Button
            className="w-full"
            disabled={status !== "idle" || pendingExercises.length === 0}
            onClick={submitTraining}
          >
            {status === "saving" ? "保存中..." : "确认并记录训练"}
          </Button>
        </Card>
      </section>

      <Card className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-muted">今日已完成训练</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            {today.sessions.length} 个训练 session
          </h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {today.sessions.map((session) => (
            <div className="rounded-xl border border-border bg-white p-4" key={session.sessionId}>
              <p className="font-semibold">
                第 {session.sessionIndex} 次训练 · {session.summary.durationMin} 分钟
              </p>
              <p className="mt-1 text-sm text-muted">
                {session.summary.totalExercises} 个动作 ·{" "}
                {session.summary.completedSets} 组 · 容量{" "}
                {session.summary.totalVolumeKg} kg
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted">
                {session.exercises.map((exercise) => (
                  <p key={`${session.sessionId}-${exercise.exerciseId}`}>
                    {exercise.name} · {formatPendingExercise(exercise)}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {today.sessions.length === 0 ? (
            <p className="rounded-xl bg-surface-muted p-4 text-sm text-muted">
              今天还没有训练记录。提交训练后这里会显示明细。
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function summarizePending(exercises: PendingExercise[]) {
  return exercises.reduce(
    (sum, exercise) => ({
      exercises: sum.exercises + 1,
      sets: sum.sets + exercise.sets.length,
      durationMin:
        sum.durationMin +
        (exercise.type === "cardio"
          ? exercise.sets.reduce(
              (setSum, set) => setSum + Number(set.durationMin ?? 0),
              0,
            )
          : exercise.sets.length * 3),
      volumeKg:
        sum.volumeKg +
        exercise.sets.reduce((setSum, set) => {
          if (set.weightKg === undefined || !set.reps) {
            return setSum;
          }

          return setSum + set.weightKg * set.reps;
        }, 0),
    }),
    { exercises: 0, sets: 0, durationMin: 0, volumeKg: 0 },
  );
}

function formatPendingExercise(
  exercise: Pick<PendingExercise, "sets" | "type">,
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
