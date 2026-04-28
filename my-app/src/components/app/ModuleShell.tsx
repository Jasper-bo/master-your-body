type ModuleShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function ModuleShell({
  eyebrow,
  title,
  description,
  children,
}: ModuleShellProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase text-primary">
          {eyebrow}
        </p>
        <div className="max-w-3xl space-y-3">
          <h1 className="font-display text-4xl font-bold tracking-normal sm:text-5xl">
            {title}
          </h1>
          <p className="text-lg leading-8 text-muted">{description}</p>
        </div>
      </header>
      {children}
    </div>
  );
}
