import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="border-t border-ink-500 py-6">
      <p className="font-medium text-ink-100">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-200">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
