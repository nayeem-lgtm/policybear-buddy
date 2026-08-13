import { cn } from "@/lib/utils";

import iconBlue from "@/assets/policybear-icon-blue.png.asset.json";
import iconWhite from "@/assets/policybear-icon-white.png.asset.json";
import wordBlue from "@/assets/policybear-wordmark-blue.png.asset.json";
import wordWhite from "@/assets/policybear-wordmark-white.png.asset.json";

/** Official Policy Bear shield icon (brand guidelines, May 2025). */
export function PolicyBearMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "inverse";
}) {
  return (
    <img
      src={tone === "brand" ? iconBlue.url : iconWhite.url}
      alt=""
      aria-hidden="true"
      className={cn("size-8 object-contain", className)}
    />
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
    <span className={cn("inline-flex items-center gap-2", className)}>
      <PolicyBearMark tone={tone} className="size-7 shrink-0" />
      {!compact && (
        <img
          src={tone === "brand" ? wordBlue.url : wordWhite.url}
          alt="PolicyBear"
          className="h-[1.05rem] w-auto object-contain"
        />
      )}
    </span>
  );
}
