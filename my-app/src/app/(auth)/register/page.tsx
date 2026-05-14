import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card } from "@/components/ui/Card";

export default function RegisterPage() {
  return (
    <section className="grid w-full gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase text-primary">
          Create Plan
        </p>
        <h1 className="max-w-2xl font-display text-5xl font-bold leading-tight">
          注册后生成个性化营养与训练目标。
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted">
          完成注册后设置你的身体数据，获取个性化营养与训练建议。
        </p>
      </div>

      <Card className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">注册</h2>
          <p className="mt-2 text-sm text-muted">手机号、密码与确认密码</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted">
          已有账号？{" "}
          <Link className="font-semibold text-primary" href="/login">
            去登录
          </Link>
        </p>
      </Card>
    </section>
  );
}
