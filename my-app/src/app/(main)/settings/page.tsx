import { ModuleShell } from "@/components/app/ModuleShell";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/settings/LogoutButton";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

export default function SettingsPage() {
  return (
    <ModuleShell
      eyebrow="Settings"
      title="系统设置"
      description="应用信息、开发者信息、更新日志、隐私政策和登出入口的页面框架。"
    >
      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="text-sm font-semibold text-muted">应用信息</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{APP_NAME}</h2>
          <p className="mt-2 text-muted">版本 {APP_VERSION}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-muted">部署模式</p>
          <h2 className="mt-2 font-display text-3xl font-bold">数据安全</h2>
          <p className="mt-2 text-muted">所有用户数据均经过加密处理，确保您的信息安全。</p>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </Card>
      </section>
    </ModuleShell>
  );
}
