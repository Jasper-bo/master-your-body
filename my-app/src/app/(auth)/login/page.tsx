import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <section className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase text-primary">
          VitalPulse
        </p>
        <h1 className="max-w-2xl font-display text-5xl font-bold leading-tight">
          今天的健康闭环，从一次清晰登录开始。
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted">
          本地部署保存健康数据，仅在食物拍照识别时通过后端调用 DeepSeek。
        </p>
      </div>

      <Card className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">登录</h2>
          <p className="mt-2 text-sm text-muted">手机号与密码</p>
        </div>

        <Suspense fallback={<p className="text-sm text-muted">加载登录表单...</p>}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-muted">
          没有账号？{" "}
          <Link className="font-semibold text-primary" href="/register">
            去注册
          </Link>
        </p>
      </Card>
    </section>
  );
}
