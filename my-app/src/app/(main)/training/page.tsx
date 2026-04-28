import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ModuleShell } from "@/components/app/ModuleShell";
import { TrainingClient } from "@/components/training/TrainingClient";
import { ACCESS_COOKIE } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";
import {
  getExerciseLibrary,
  getTrainingToday,
  getTrainingWeeklyStats,
  getTrainingYesterday,
} from "@/lib/server/training";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const data = await loadTrainingPageData();

  return (
    <ModuleShell
      eyebrow="Training"
      title="每日训练"
      description="从动作库添加力量或有氧动作，确认后写入本地训练记录，并自动同步仪表盘运动打卡。"
    >
      <TrainingClient
        initialToday={data.today}
        initialWeeklyStats={data.weeklyStats}
        initialYesterday={data.yesterday}
        library={data.library}
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

  const [today, yesterday, weeklyStats, library] = await Promise.all([
    getTrainingToday(userId),
    getTrainingYesterday(userId),
    getTrainingWeeklyStats(userId),
    getExerciseLibrary(),
  ]);

  return {
    today,
    yesterday,
    weeklyStats,
    library,
  };
}
