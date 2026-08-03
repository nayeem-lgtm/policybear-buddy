import { cn } from "@/lib/utils";

/** Policy Bear shield mark, redrawn from the brand guidelines icon. */
export function PolicyBearMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <path
        d="M24 3.5 42 9.2v14.4c0 9.9-7.1 18.3-18 21.9C13.1 41.9 6 33.5 6 23.6V9.2L24 3.5Z"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M30.6 22.4a7.2 7.2 0 1 1-4.4-6.7"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M24 22.5c0-2.7 2-4.9 4.6-4.9"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M31.7 18.4l1.2-2.6 1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PolicyBearLogo({
  className,
  compact = false,
  tone = "brand",
}: {
  className?: string;
  compact?: boolean;
  tone?: "brand" | "inverse";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        tone === "brand" ? "text-brand" : "text-brand-ink-foreground",
        className,
      )}
    >
      <PolicyBearMark className="size-7 shrink-0" />
      {!compact && (
        <span className="text-[1.05rem] leading-none font-semibold tracking-tight">
          Policy<span className="italic font-bold">Bear</span>
        </span>
      )}
    </span>
  );
}
