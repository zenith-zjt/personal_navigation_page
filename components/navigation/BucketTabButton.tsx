"use client";

import type { LinkBucket } from "@/lib/navigation-store";
import { bucketDecor, bucketLabels } from "./constants";

export function BucketTabButton({
  bucket,
  active,
  count,
  onClick,
}: {
  bucket: LinkBucket;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition ${
        active
          ? bucketDecor[bucket].active
          : "border-black/10 bg-white/70 text-stone-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
      }`}
    >
      <span className={`h-3 w-3 rounded-full ${bucketDecor[bucket].dot}`} />
      {bucketLabels[bucket]}
      <span className="rounded-lg bg-black/10 px-2 py-0.5 text-xs dark:bg-white/15">{count}</span>
    </button>
  );
}
