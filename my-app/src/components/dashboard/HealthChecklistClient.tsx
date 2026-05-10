"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/client/api";
import type { DashboardData } from "@/lib/server/dashboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ChecklistItem = DashboardData["healthScore"]["checklist"][number];

type HealthChecklistClientProps = {
  checklist: ChecklistItem[];
  date: string;
};

const quickWaterOptions = [250, 500, 750];
const sleepOptions = [6.5, 7, 7.5, 8];

export function HealthChecklistClient({
  checklist,
  date,
}: HealthChecklistClientProps) {
  const router = useRouter();
  const hydration = useMemo(
    () => checklist.find((item) => item.id === "hydration"),
    [checklist],
  );
  const sleep = useMemo(
    () => checklist.find((item) => item.id === "sleep"),
    [checklist],
  );
  const exercise = useMemo(
    () => checklist.find((item) => item.id === "exercise"),
    [checklist],
  );
  const [waterMl, setWaterMl] = useState(() => parseNumber(hydration?.current));
  const [sleepHours, setSleepHours] = useState(() => parseNumber(sleep?.current));
  const [saving, setSaving] = useState<"hydration" | "sleep" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hydrationCurrent = hydration?.current;
  const sleepCurrent = sleep?.current;

  useEffect(() => {
    setWaterMl(parseNumber(hydrationCurrent));
  }, [hydrationCurrent]);

  useEffect(() => {
    setSleepHours(parseNumber(sleepCurrent));
  }, [sleepCurrent]);

  async function saveCheckIn(checkInId: "hydration" | "sleep", value: number) {
    setSaving(checkInId);
    setError(null);

    try {
      await apiRequest(
        `/api/checkin/${checkInId}`,
        {
          method: "POST",
          body: JSON.stringify({ date, value }),
        },
        { auth: true },
      );
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "健康打卡保存失败");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {hydration ? (
        <CheckInCard item={hydration}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {quickWaterOptions.map((amount) => (
                <Button
                  className="min-h-10 px-3"
                  key={amount}
                  onClick={() => setWaterMl((current) => current + amount)}
                  variant="secondary"
                >
                  +{amount}
                </Button>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">饮水量 ml</span>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
                max={10000}
                min={0}
                onChange={(event) => setWaterMl(Number(event.target.value))}
                type="number"
                value={Number.isFinite(waterMl) ? waterMl : 0}
              />
            </label>
            <Button
              className="w-full"
              disabled={saving === "hydration"}
              onClick={() => saveCheckIn("hydration", waterMl)}
            >
              {saving === "hydration" ? "保存中..." : "保存饮水"}
            </Button>
          </div>
        </CheckInCard>
      ) : null}

      {sleep ? (
        <CheckInCard item={sleep}>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {sleepOptions.map((hours) => (
                <Button
                  className="min-h-10 px-3"
                  key={hours}
                  onClick={() => setSleepHours(hours)}
                  variant="secondary"
                >
                  {hours}h
                </Button>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">睡眠时长 h</span>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-3 outline-none transition focus:border-secondary"
                max={24}
                min={0.5}
                onChange={(event) => setSleepHours(Number(event.target.value))}
                step={0.5}
                type="number"
                value={Number.isFinite(sleepHours) ? sleepHours : 0}
              />
            </label>
            <Button
              className="w-full"
              disabled={saving === "sleep"}
              onClick={() => saveCheckIn("sleep", sleepHours)}
            >
              {saving === "sleep" ? "保存中..." : "保存睡眠"}
            </Button>
          </div>
        </CheckInCard>
      ) : null}

      {exercise ? (
        <CheckInCard item={exercise}>
          <p className="text-sm text-muted">
            训练保存成功后会自动完成运动打卡。
          </p>
        </CheckInCard>
      ) : null}

      {error ? (
        <p className="lg:col-span-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function CheckInCard({
  children,
  item,
}: {
  children: ReactNode;
  item: ChecklistItem;
}) {
  const statusClass = item.completed
    ? "bg-primary-bright/15 text-primary"
    : "bg-surface-muted text-muted";

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">健康打卡</p>
          <h3 className="mt-1 font-display text-xl font-semibold">
            {item.name}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {item.current} / {item.target}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>
          {item.completed ? "已达标" : "待记录"}
        </span>
      </div>
      {children}
    </Card>
  );
}

function parseNumber(value: string | undefined) {
  const parsed = Number.parseFloat(value ?? "0");

  return Number.isFinite(parsed) ? parsed : 0;
}
