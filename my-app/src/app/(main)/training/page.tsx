import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ModuleShell } from "@/components/app/ModuleShell";
import { TrainingClient } from "@/components/training/TrainingClient";
import { TrainingHistoryClient } from "@/components/training/TrainingHistoryClient";
import { ACCESS_COOKIE } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";
import {
  getExerciseLibrary,
  getTrainingHistory,
  getTrainingToday,
  getTrainingWeeklyStats,
  getTrainingYesterday,
  parseTrainingHistoryQuery,
} from "@/lib/server/training";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const data = await loadTrainingPageData();

  return (
    <ModuleShell
      eyebrow="Training"
      title="每日训练"
      description="从动作库添加力量或有氧动作，确认后写入训练记录，并自动同步仪表盘运动打卡。"
    >
      <TrainingClient
        initialToday={data.today}
        initialWeeklyStats={data.weeklyStats}
        initialYesterday={data.yesterday}
        library={data.library}
      />
      <TrainingHistoryClient
        initialCategory={data.historyQuery.filter}
        initialEndDate={data.historyQuery.endDate}
        initialHistory={data.history}
        initialStartDate={data.historyQuery.startDate}
      />
    </ModuleShell>
  );
}

async function loadTrainingPageData() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let userId: string;

  try {
    const payload = await verifyJwt(accessToken, "access", serverEnv.jwtSecret);
    userId = payload.sub;
  } catch {
    redirect("/login");
  }

  const historyQuery = parseTrainingHistoryQuery({});

  if (!historyQuery) {
    throw new Error("Default training history query is invalid");
  }

  const [today, yesterday, weeklyStats, library, history] = await Promise.all([
    getTrainingToday(userId),
    getTrainingYesterday(userId),
    getTrainingWeeklyStats(userId),
    getExerciseLibrary(),
    getTrainingHistory(userId, historyQuery),
  ]);

  return {
    today,
    yesterday,
    weeklyStats,
    library,
    history,
    historyQuery,
  };
}
