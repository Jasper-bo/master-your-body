import { ModuleShell } from "@/components/app/ModuleShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FOOD_CATEGORY_PRESETS } from "@/lib/constants";

export default function NutritionPage() {
  return (
    <ModuleShell
      eyebrow="Nutrition"
      title="饮食与营养"
      description="AI 识别、手动录入、餐食暂存和确认提交会在后续模块逐步接入。"
    >
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-muted">AI 拍照识别</p>
          <div className="rounded-xl border border-dashed border-border bg-surface-muted px-5 py-10 text-center">
            <p className="font-display text-xl font-semibold">上传区</p>
            <p className="mt-2 text-sm text-muted">JPG / PNG，最大 10MB</p>
          </div>
          <Button type="button" variant="secondary" className="w-full">
            选择照片
          </Button>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-muted">手动食物录入</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              预设分类
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FOOD_CATEGORY_PRESETS.map((category) => (
              <div
                className="rounded-xl border border-border bg-white p-4"
                key={category.key}
              >
                <p className="font-semibold">{category.label}</p>
                <p className="mt-1 text-sm text-muted">
                  {category.itemCount} 个预设选项
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </ModuleShell>
  );
}
