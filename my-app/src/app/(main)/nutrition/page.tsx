import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ModuleShell } from "@/components/app/ModuleShell";
import { NutritionManualClient } from "@/components/nutrition/NutritionManualClient";
import { Card } from "@/components/ui/Card";
import { ACCESS_COOKIE } from "@/lib/server/cookies";
import { serverEnv } from "@/lib/server/env";
import { verifyJwt } from "@/lib/server/jwt";
import {
  getFoodCategories,
  getNutritionToday,
  getOilOptions,
  NutritionProfileMissingError,
} from "@/lib/server/nutrition";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const data = await loadNutritionPageData();

  if (!data) {
    return (
      <ModuleShell
        eyebrow="Nutrition"
        title="先完成个性化计划，再开始记录饮食。"
        description="饮食模块需要每日热量和三大营养素目标，用来计算摄入进度和同步仪表盘。"
      >
        <Card>
          <p className="text-muted">
            当前账号缺少用户档案。请先完成注册后的个性化计划。
          </p>
        </Card>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      eyebrow="Nutrition"
      title="饮食与营养"
      description="手动选择预设食物、输入克数并确认保存，系统会更新今日摄入汇总和仪表盘趋势。"
    >
      <NutritionManualClient
        categories={data.categories}
        initialToday={data.today}
        oilOptions={data.oilOptions}
      />
    </ModuleShell>
  );
}

async function loadNutritionPageData() {
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
    const [today, categories, oilOptions] = await Promise.all([
      getNutritionToday(userId),
      getFoodCategories(),
      Promise.resolve(getOilOptions()),
    ]);

    return {
      today,
      categories,
      oilOptions,
    };
  } catch (error) {
    if (error instanceof NutritionProfileMissingError) {
      return null;
    }

    throw error;
  }
}
