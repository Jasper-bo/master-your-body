import { ModuleShell } from "@/components/app/ModuleShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EXERCISE_CATEGORY_PRESETS } from "@/lib/constants";

export default function TrainingPage() {
  return (
    <ModuleShell
      eyebrow="Training"
      title="每日训练"
      description="动作库、今日清单、训练统计和完成后自动打卡会按模块分批完成。"
    >
      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-muted">今日目标</p>
          <p className="font-display text-4xl font-bold">0 / 1</p>
          <p className="text-sm text-muted">训练记录将在后端接入后自动统计</p>
          <Button type="button" variant="secondary" className="w-full">
            提交今日训练
          </Button>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">动作库</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              部位筛选
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {EXERCISE_CATEGORY_PRESETS.map((category) => (
              <div
                className="rounded-xl border border-border bg-white p-4"
                key={category.key}
              >
                <p className="font-semibold">{category.label}</p>
                <p className="mt-1 text-sm text-muted">
                  排序 {category.sortOrder}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </ModuleShell>
  );
}
