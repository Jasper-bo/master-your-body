import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ModuleShell } from "@/components/app/ModuleShell";
import { HealthChecklistClient } from "@/components/dashboard/HealthChecklistClient";
import { UpdatePlanButton } from "@/components/dashboard/UpdatePlanButton";
import { Card } from "@/components/ui/Card";
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
      {/* Row 1: Health Score + Nutrition Progress */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <HealthScoreCard score={dashboard.healthScore} />
        <NutritionProgressCard nutrition={dashboard.nutrition} />
      </section>

      {/* Row 2: BMI / BMR / TDEE */}
      <section className="grid gap-5 sm:grid-cols-3">
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

      {/* Row 3: Health Checklist */}
      <HealthChecklistClient
        checklist={dashboard.healthScore.checklist}
        date={dashboard.date}
      />

      {/* Row 4: Trend Chart */}
      <Card className="space-y-6">
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

/* -------------------------------------------------------------------------- */
/*  Health Score Card                                                         */
/* -------------------------------------------------------------------------- */

const GRADE_CONFIG: Record<
  string,
  { label: string; color: string; ring: string; bg: string }
> = {
  A: {
    label: "优秀",
    color: "text-emerald-400",
    ring: "#34d399",
    bg: "bg-emerald-400/10",
  },
  B: {
    label: "良好",
    color: "text-sky-400",
    ring: "#38bdf8",
    bg: "bg-sky-400/10",
  },
  C: {
    label: "一般",
    color: "text-amber-400",
    ring: "#fbbf24",
    bg: "bg-amber-400/10",
  },
  D: {
    label: "需改善",
    color: "text-red-400",
    ring: "#f87171",
    bg: "bg-red-400/10",
  },
};

const SUB_SCORE_LABELS: Record<string, string> = {
  nutrition: "营养",
  exercise: "运动",
  sleep: "睡眠",
  hydration: "饮水",
};

function HealthScoreCard({
  score,
}: {
  score: DashboardData["healthScore"];
}) {
  const gradeCfg = GRADE_CONFIG[score.grade] ?? GRADE_CONFIG.C;

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0a1f1a] via-[#0d2a1f] to-[#0b241b] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-sky-500/8 blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              健康评分
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">今日综合状态</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${gradeCfg.bg} ${gradeCfg.color}`}
          >
            {gradeCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-8">
          <ScoreRing
            score={score.totalScore}
            grade={score.grade}
            ringColor={gradeCfg.ring}
          />
          <div className="flex-1 space-y-3">
            {Object.entries(score.subScores).map(([key, value]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    {SUB_SCORE_LABELS[key] ?? key}
                  </span>
                  <span className="font-semibold tabular-nums text-white/85">
                    {value}
                    <span className="text-xs text-white/40">/25</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${(value / 25) * 100}%`,
                      background:
                        key === "nutrition"
                          ? "linear-gradient(90deg, #34d399, #2ecc71)"
                          : key === "exercise"
                            ? "linear-gradient(90deg, #38bdf8, #5cb8fd)"
                            : key === "sleep"
                              ? "linear-gradient(90deg, #a78bfa, #c4b5fd)"
                              : "linear-gradient(90deg, #fbbf24, #f8a018)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScoreRing({
  score,
  grade,
  ringColor,
}: {
  score: number;
  grade: string;
  ringColor: string;
}) {
  return (
    <div className="relative shrink-0">
      <svg className="size-36 -rotate-90" viewBox="0 0 144 144">
        {/* Track */}
        <circle
          cx="72"
          cy="72"
          r="60"
          fill="none"
          stroke="rgb(255 255 255 / 8%)"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <circle
          cx="72"
          cy="72"
          r="60"
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 377} 377`}
          style={{ transition: "stroke-dasharray 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums">
          {score}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {grade} 级
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Nutrition Progress Card                                                   */
/* -------------------------------------------------------------------------- */

function NutritionProgressCard({
  nutrition,
}: {
  nutrition: DashboardData["nutrition"];
}) {
  const percent =
    nutrition.calories.target > 0
      ? Math.min(
          Math.round(
            (nutrition.calories.current / nutrition.calories.target) * 100,
          ),
          100,
        )
      : 0;

  return (
    <Card className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">每日营养</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            三大营养素进度
          </h2>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-bold tabular-nums">
            {nutrition.calories.current}
          </p>
          <p className="text-sm text-muted">
            / {nutrition.calories.target} kcal
          </p>
        </div>
      </div>

      {/* Calorie gauge */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">热量摄入</span>
          <span className="text-muted tabular-nums">{percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-bright to-emerald-400 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniNutrient
          label="蛋白质"
          current={nutrition.protein.current}
          target={nutrition.protein.target}
          color="from-emerald-400 to-primary-bright"
        />
        <MiniNutrient
          label="碳水"
          current={nutrition.carbs.current}
          target={nutrition.carbs.target}
          color="from-sky-400 to-secondary-bright"
        />
        <MiniNutrient
          label="脂肪"
          current={nutrition.fat.current}
          target={nutrition.fat.target}
          color="from-amber-400 to-warning"
        />
      </div>
    </Card>
  );
}

function MiniNutrient({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  return (
    <div className="rounded-xl bg-surface-muted p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums">
        {current}
        <span className="text-sm font-normal text-muted">/{target}g</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-strong">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trend Chart                                                               */
/* -------------------------------------------------------------------------- */

const TREND_COLORS = {
  protein: { stroke: "#34d399", fill: "url(#proteinGrad)" },
  carbs: { stroke: "#38bdf8", fill: "url(#carbsGrad)" },
  fat: { stroke: "#fbbf24", fill: "url(#fatGrad)" },
} as const;

function TrendChart({
  trend,
}: {
  trend: DashboardData["nutritionTrend"];
}) {
  const dataKeys = ["蛋白质", "碳水", "脂肪"] as const;
  const colorKeys = ["protein", "carbs", "fat"] as const;

  const datasets = trend.datasets.filter((d) =>
    dataKeys.includes(d.label as (typeof dataKeys)[number]),
  );

  const width = 720;
  const height = 280;
  const pad = { top: 20, right: 24, bottom: 32, left: 0 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const allValues = datasets.flatMap((d) => d.data);
  const maxValue = Math.max(1, ...allValues);
  const yMax = Math.ceil(maxValue * 1.15);

  function xPos(index: number) {
    return pad.left + index * (chartW / Math.max(trend.labels.length - 1, 1));
  }

  function yPos(value: number) {
    return pad.top + chartH - (value / yMax) * chartH;
  }

  function buildAreaPath(dataset: (typeof datasets)[number]) {
    if (dataset.data.length === 0) return "";
    const points = dataset.data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
    return `M${xPos(0)},${pad.top + chartH} L${points} L${xPos(dataset.data.length - 1)},${pad.top + chartH} Z`;
  }

  function buildLinePath(dataset: (typeof datasets)[number]) {
    return dataset.data.map((v, i) => `${xPos(i)},${yPos(v)}`).join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <svg
        aria-label="最近 7 天营养趋势图"
        className="min-w-[680px]"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="carbsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = yPos(ratio * yMax);
          return (
            <g key={ratio}>
              <line
                stroke="var(--border)"
                strokeDasharray="4 5"
                strokeOpacity="0.7"
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
              />
              <text
                fill="var(--muted)"
                fontSize="11"
                x={pad.left - 0}
                y={y - 6}
              >
                {Math.round(ratio * yMax)}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        {datasets.map((dataset, i) => (
          <path
            key={`area-${dataset.label}`}
            d={buildAreaPath(dataset)}
            fill={TREND_COLORS[colorKeys[i]].fill}
          />
        ))}

        {/* Lines */}
        {datasets.map((dataset, i) => (
          <polyline
            key={`line-${dataset.label}`}
            fill="none"
            points={buildLinePath(dataset)}
            stroke={TREND_COLORS[colorKeys[i]].stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
          />
        ))}

        {/* Data points */}
        {datasets.map((dataset, di) =>
          dataset.data.map((value, vi) => (
            <circle
              key={`dot-${di}-${vi}`}
              cx={xPos(vi)}
              cy={yPos(value)}
              r="3.5"
              fill="#fff"
              stroke={TREND_COLORS[colorKeys[di]].stroke}
              strokeWidth="2"
            />
          )),
        )}

        {/* X labels */}
        {trend.labels.map((label, index) => (
          <text
            fill="var(--muted)"
            fontSize="12"
            key={label}
            textAnchor="middle"
            x={xPos(index)}
            y={height - 8}
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
        {datasets.map((dataset, i) => (
          <span
            className="inline-flex items-center gap-2 font-medium text-muted"
            key={dataset.label}
          >
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: TREND_COLORS[colorKeys[i]].stroke }}
            />
            {dataset.label}
          </span>
        ))}
      </div>
    </div>
  );
}
