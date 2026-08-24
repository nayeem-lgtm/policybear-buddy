import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  void eyebrow;
  void description;

  if (!actions) {
    return <h1 className="sr-only">{title}</h1>;
  }

  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-end gap-2", className)}>
      <h1 className="sr-only">{title}</h1>
      {actions}
    </div>
  );
}
