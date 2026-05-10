import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ModuleShell } from "@/components/app/ModuleShell";
import { HealthChecklistClient } from "@/components/dashboard/HealthChecklistClient";
import { UpdatePlanButton } from "@/components/dashboard/UpdatePlanButton";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ACCESS_COOKIE } from "@/lib/server/cookies";
import {
  DashboardProfileMissingError,
  getDashboardData,
  type DashboardData,
} from "@/lib/server/dashboard";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await loadDashboardData();

  if (!dashboard) {
    return (
      <ModuleShell
        eyebrow="Dashboard"
        title="还差一步，先生成个性化计划。"
        description="仪表盘需要身高、体重、年龄、运动频率和目标来计算 BMI、BMR、TDEE 与每日营养目标。"
      >
        <Card>
          <p className="text-muted">
            当前账号缺少用户档案。请回到注册流程完成计划，或稍后在设置模块开放后更新档案。
          </p>
        </Card>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      eyebrow="Dashboard"
      title={`${dashboard.greeting}，今天保持节奏。`}
      description={`${dashboard.dateLabel} · 今日完成率 ${dashboard.completionRate}% · 数据实时聚合计算。`}
    >
      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="relative overflow-hidden bg-[#0b2a1d] text-white">
          <div className="absolute -right-16 -top-16 size-44 rounded-full bg-primary-bright/25 blur-2xl" />
          <div className="relative space-y-6">
            <div>
              <p className="text-sm font-semibold text-white/70">健康评分</p>
              <h2 className="mt-1 font-display text-3xl font-bold">
                {dashboard.healthScore.grade} 级状态
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <ScoreRing score={dashboard.healthScore.totalScore} />
              <div className="space-y-2 text-sm text-white/75">
                <p>营养 {dashboard.healthScore.subScores.nutrition}/25</p>
                <p>运动 {dashboard.healthScore.subScores.exercise}/25</p>
                <p>睡眠 {dashboard.healthScore.subScores.sleep}/25</p>
                <p>饮水 {dashboard.healthScore.subScores.hydration}/25</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">每日营养</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              三大营养素进度
            </h2>
            <p className="mt-2 text-sm text-muted">
              热量 {dashboard.nutrition.calories.current} /{" "}
              {dashboard.nutrition.calories.target} kcal
            </p>
          </div>
          <ProgressBar
            label="蛋白质"
            value={dashboard.nutrition.protein.current}
            max={dashboard.nutrition.protein.target}
            tone="primary"
          />
          <ProgressBar
            label="碳水"
            value={dashboard.nutrition.carbs.current}
            max={dashboard.nutrition.carbs.target}
            tone="secondary"
          />
          <ProgressBar
            label="脂肪"
            value={dashboard.nutrition.fat.current}
            max={dashboard.nutrition.fat.target}
            tone="warning"
          />
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <MetricCard
          label="BMI"
          value={dashboard.bodyMetrics.bmi}
          helper={dashboard.bodyMetrics.bmiCategory}
        />
        <MetricCard
          label="BMR"
          value={dashboard.bodyMetrics.bmr}
          helper="kcal / 天"
        />
        <MetricCard
          label="TDEE"
          value={dashboard.bodyMetrics.tdee}
          helper="每日总能量消耗"
        />
      </section>

      <HealthChecklistClient
        checklist={dashboard.healthScore.checklist}
        date={dashboard.date}
      />

      <Card className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-muted">营养趋势分析</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            最近 7 天宏量营养趋势
          </h2>
        </div>
        <TrendChart trend={dashboard.nutritionTrend} />
      </Card>

      <UpdatePlanButton initialValues={dashboard.profile} />
    </ModuleShell>
  );
}

async function loadDashboardData() {
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

  try {
    return await getDashboardData(userId);
  } catch (error) {
    if (error instanceof DashboardProfileMissingError) {
      return null;
    }

    throw error;
  }
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <Card>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-primary">{helper}</p>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="grid size-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary-bright) ${score}%, rgb(255 255 255 / 16%) 0)`,
      }}
    >
      <div className="grid size-28 place-items-center rounded-full bg-[#0b2a1d]">
        <div className="text-center">
          <p className="font-display text-4xl font-bold">{score}</p>
          <p className="text-xs font-semibold uppercase text-white/60">/ 100</p>
        </div>
      </div>
    </div>
  );
}

function TrendChart({
  trend,
}: {
  trend: DashboardData["nutritionTrend"];
}) {
  const width = 720;
  const height = 260;
  const padding = 32;
  const maxValue = Math.max(
    1,
    ...trend.datasets.flatMap((dataset) => dataset.data),
  );

  const colors = [
    "var(--primary-bright)",
    "var(--primary)",
    "var(--secondary-bright)",
    "var(--secondary)",
    "var(--warning)",
    "#9a5a00",
  ];

  function getPoint(value: number, index: number) {
    const x =
      padding +
      index * ((width - padding * 2) / Math.max(trend.labels.length - 1, 1));
    const y = height - padding - (value / maxValue) * (height - padding * 2);

    return `${x},${y}`;
  }

  return (
    <div className="overflow-x-auto">
      <svg
        aria-label="最近 7 天营养趋势图"
        className="min-w-[680px]"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            stroke="var(--border)"
            strokeDasharray="4 6"
            x1={padding}
            x2={width - padding}
            y1={height - padding - ratio * (height - padding * 2)}
            y2={height - padding - ratio * (height - padding * 2)}
          />
        ))}
        {trend.datasets.map((dataset, datasetIndex) => (
          <polyline
            fill="none"
            key={dataset.label}
            points={dataset.data
              .map((value, valueIndex) => getPoint(value, valueIndex))
              .join(" ")}
            stroke={colors[datasetIndex % colors.length]}
            strokeDasharray={dataset.label.includes("目标") ? "8 8" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={dataset.label.includes("目标") ? 2 : 3}
          />
        ))}
        {trend.labels.map((label, index) => (
          <text
            fill="var(--muted)"
            fontSize="12"
            key={label}
            textAnchor="middle"
            x={padding + index * ((width - padding * 2) / 6)}
            y={height - 8}
          >
            {label}
          </text>
        ))}
      </svg>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
        {trend.datasets.map((dataset, index) => (
          <span className="inline-flex items-center gap-2" key={dataset.label}>
            <span
              className="inline-block size-3 rounded-full"
              style={{ background: colors[index % colors.length] }}
            />
            {dataset.label}
          </span>
        ))}
      </div>
    </div>
  );
}
