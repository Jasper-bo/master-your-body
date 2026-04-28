type ProgressBarProps = {
  label: string;
  value: number;
  max: number;
  tone?: "primary" | "secondary" | "warning";
};

const tones: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
  primary: "bg-primary-bright",
  secondary: "bg-secondary-bright",
  warning: "bg-warning",
};

export function ProgressBar({
  label,
  value,
  max,
  tone = "primary",
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">
          {value} / {max}g
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          aria-label={`${label} ${percent}%`}
          className={`h-full rounded-full ${tones[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
