import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border bg-brand-surfaceElevated p-8 text-center">
      <p className="font-medium text-brand-text">{title}</p>
      {description && <p className="mt-1 text-sm text-brand-textMuted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
