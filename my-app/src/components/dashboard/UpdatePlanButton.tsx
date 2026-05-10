"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProfileModal, type ProfileFormValues } from "@/components/auth/ProfileModal";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/client/api";
import type { DashboardProfile } from "@/lib/server/dashboard";

type UpdatePlanButtonProps = {
  initialValues: DashboardProfile;
};

export function UpdatePlanButton({ initialValues }: UpdatePlanButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function updatePlan(values: ProfileFormValues) {
    await apiRequest("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(values),
    }, { auth: true });
  }

  function handleDone() {
    setIsOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 z-40 shadow-[var(--shadow-card)]"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
      >
        更新计划
      </Button>
      {isOpen ? (
        <ProfileModal
          initialValues={initialValues}
          mode="update"
          onDone={handleDone}
          onSubmit={updatePlan}
        />
      ) : null}
    </>
  );
}
