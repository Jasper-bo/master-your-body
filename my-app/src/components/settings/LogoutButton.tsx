"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/client/api";
import { clearAuthTokens } from "@/lib/client/auth-storage";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await apiRequest(
        "/api/auth/logout",
        {
          method: "POST",
        },
        { auth: true },
      );
    } finally {
      clearAuthTokens();
      router.replace("/login");
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleLogout}>
      退出登录
    </Button>
  );
}
