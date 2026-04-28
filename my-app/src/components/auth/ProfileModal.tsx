"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ActivityLevel, FitnessGoal, Gender } from "@/types/models";

export type ProfileFormValues = {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
};

type ProfileModalProps = {
  mode: "forced" | "update";
  onSubmit: (values: ProfileFormValues) => Promise<unknown>;
  onDone: () => void;
  initialValues?: Partial<ProfileFormValues>;
};

const defaultValues: ProfileFormValues = {
  heightCm: 175,
  weightKg: 70,
  age: 28,
  gender: "male",
  activityLevel: "moderately_active",
  goal: "maintain",
};

export function ProfileModal({
  mode,
  onSubmit,
  onDone,
  initialValues,
}: ProfileModalProps) {
  const [values, setValues] = useState<ProfileFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [status, setStatus] = useState<"editing" | "submitting" | "success">(
    "editing",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      await onSubmit(values);
      setStatus("success");
    } catch (submissionError) {
      setStatus("editing");
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "保存失败，请重试",
      );
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091d2e]/35 px-4 py-8 backdrop-blur"
      role="dialog"
    >
      <div className="max-h-full w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        {status === "success" ? (
          <div className="space-y-5 text-center">
            <p className="text-sm font-semibold uppercase text-primary">
              Plan Ready
            </p>
            <h2 className="font-display text-3xl font-bold">
              个性化计划已生成
            </h2>
            <p className="text-muted">
              每日热量、三大营养素、饮水和睡眠目标已保存。
            </p>
            <Button type="button" onClick={onDone}>
              进入首页
            </Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                {mode === "forced" ? "Required Plan" : "Update Plan"}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold">
                生成我的健康计划
              </h2>
              <p className="mt-2 text-sm text-muted">
                注册后的首次计划不可跳过，完成后才能进入系统。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="身高 cm"
                value={values.heightCm}
                onChange={(heightCm) => setValues({ ...values, heightCm })}
              />
              <NumberField
                label="体重 kg"
                value={values.weightKg}
                onChange={(weightKg) => setValues({ ...values, weightKg })}
              />
              <NumberField
                label="年龄"
                value={values.age}
                onChange={(age) => setValues({ ...values, age })}
              />
            </div>

            <SelectField
              label="性别"
              value={values.gender}
              onChange={(gender) =>
                setValues({ ...values, gender: gender as Gender })
              }
              options={[
                ["male", "男"],
                ["female", "女"],
                ["other", "其他"],
              ]}
            />

            <SelectField
              label="运动频率"
              value={values.activityLevel}
              onChange={(activityLevel) =>
                setValues({
                  ...values,
                  activityLevel: activityLevel as ActivityLevel,
                })
              }
              options={[
                ["sedentary", "久坐不动"],
                ["lightly_active", "每周轻度运动 1-2 天"],
                ["moderately_active", "每周中度运动 3-5 天"],
                ["very_active", "每周剧烈运动 6-7 天"],
              ]}
            />

            <SelectField
              label="健身目标"
              value={values.goal}
              onChange={(goal) =>
                setValues({ ...values, goal: goal as FitnessGoal })
              }
              options={[
                ["lose_weight", "减脂"],
                ["maintain", "维持"],
                ["gain_muscle", "增肌"],
              ]}
            />

            {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

            <Button
              className="w-full"
              disabled={status === "submitting"}
              type="submit"
            >
              {status === "submitting" ? "生成中..." : "生成我的计划"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <select
        className="w-full rounded-lg border border-border bg-white px-4 py-3 outline-none transition focus:border-secondary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
