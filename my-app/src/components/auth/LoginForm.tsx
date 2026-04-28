"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/client/api";
import { storeAuthTokens } from "@/lib/client/auth-storage";

type AuthResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      storeAuthTokens(data.tokens);
      router.replace(searchParams.get("redirect") || "/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "登录失败，请重试",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium">手机号</span>
        <input
          className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
          inputMode="numeric"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="13800138000"
          required
          value={phone}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium">密码</span>
        <input
          className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="至少 6 位"
          required
          type="password"
          value={password}
        />
      </label>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
