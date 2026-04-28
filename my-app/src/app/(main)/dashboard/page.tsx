import { ModuleShell } from "@/components/app/ModuleShell";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { calculateBmi, calculateBmr } from "@/lib/bmi-bmr";
import { DEFAULT_PROFILE, DEFAULT_TODAY_NUTRITION } from "@/lib/constants";

export default function DashboardPage() {
  const bmi = calculateBmi(DEFAULT_PROFILE.weightKg, DEFAULT_PROFILE.heightCm);
  const bmr = calculateBmr(DEFAULT_PROFILE);

  return (
    <ModuleShell
      eyebrow="Dashboard"
      title="早上好，今天保持节奏。"
      description="仪表盘框架已按营养、身体指标、打卡评分和趋势区域拆分。"
    >
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">每日营养</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              三大营养素进度
            </h2>
          </div>
          <ProgressBar
            label="蛋白质"
            value={DEFAULT_TODAY_NUTRITION.protein.current}
            max={DEFAULT_TODAY_NUTRITION.protein.target}
            tone="primary"
          />
          <ProgressBar
            label="碳水"
            value={DEFAULT_TODAY_NUTRITION.carbs.current}
            max={DEFAULT_TODAY_NUTRITION.carbs.target}
            tone="secondary"
          />
          <ProgressBar
            label="脂肪"
            value={DEFAULT_TODAY_NUTRITION.fat.current}
            max={DEFAULT_TODAY_NUTRITION.fat.target}
            tone="warning"
          />
        </Card>

        <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <p className="text-sm font-semibold text-muted">BMI</p>
            <p className="mt-2 font-display text-4xl font-bold">{bmi}</p>
            <p className="mt-1 text-sm text-primary">正常范围</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted">BMR</p>
            <p className="mt-2 font-display text-4xl font-bold">{bmr}</p>
            <p className="mt-1 text-sm text-muted">kcal / 天</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {["水分补充", "睡眠质量", "运动锻炼"].map((label) => (
          <Card key={label} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">健康打卡</p>
              <h3 className="mt-1 font-display text-xl font-semibold">
                {label}
              </h3>
            </div>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-muted">
              待记录
            </span>
          </Card>
        ))}
      </section>
    </ModuleShell>
  );
}
