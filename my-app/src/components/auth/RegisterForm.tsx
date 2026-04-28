"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/client/api";
import { storeAuthTokens } from "@/lib/client/auth-storage";
import {
  ProfileModal,
  type ProfileFormValues,
} from "@/components/auth/ProfileModal";

type AuthResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

export function RegisterForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      storeAuthTokens(data.tokens);
      setShowProfileModal(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "注册失败，请重试",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitPlan(values: ProfileFormValues) {
    await apiRequest("/api/users/me/plan", {
      method: "PUT",
      body: JSON.stringify(values),
    }, { auth: true });
  }

  return (
    <>
      <form className="space-y-4" onSubmit={handleRegister}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">手机号</span>
          <input
            className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
            inputMode="numeric"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="8-15 位纯数字"
            required
            value={phone}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="block space-y-2">
            <span className="text-sm font-medium">确认密码</span>
            <input
              className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
              minLength={6}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再次输入"
              required
              type="password"
              value={confirmPassword}
            />
          </label>
        </div>

        {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "注册中..." : "注册并继续"}
        </Button>
      </form>

      {showProfileModal ? (
        <ProfileModal
          mode="forced"
          onDone={() => router.replace("/dashboard")}
          onSubmit={submitPlan}
        />
      ) : null}
    </>
  );
}
