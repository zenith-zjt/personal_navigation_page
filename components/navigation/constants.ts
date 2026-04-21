import type { LinkBucket } from "@/lib/navigation-store";

export const buckets: LinkBucket[] = ["favorites", "watching", "later"];

export const bucketLabels: Record<LinkBucket, string> = {
  favorites: "常用链接",
  watching: "正在看",
  later: "稍后看",
};

export const bucketHints: Record<LinkBucket, string> = {
  favorites: "核心入口、工作台和高频服务",
  watching: "正在追踪的文章、课程和项目",
  later: "临时收集，等待整理",
};

export const bucketDecor: Record<LinkBucket, { dot: string; active: string; panel: string }> = {
  favorites: {
    dot: "bg-emerald-500",
    active: "border-emerald-500 bg-emerald-600 text-white shadow-emerald-900/10",
    panel: "from-emerald-50/90 to-white/70 dark:from-emerald-950/25 dark:to-white/5",
  },
  watching: {
    dot: "bg-amber-400",
    active: "border-amber-400 bg-amber-400 text-stone-950 shadow-amber-900/10",
    panel: "from-amber-50/90 to-white/70 dark:from-amber-950/25 dark:to-white/5",
  },
  later: {
    dot: "bg-rose-500",
    active: "border-rose-500 bg-rose-600 text-white shadow-rose-900/10",
    panel: "from-rose-50/90 to-white/70 dark:from-rose-950/25 dark:to-white/5",
  },
};

export const groupColorStyles = [
  "border-l-emerald-500 bg-emerald-50/55 dark:bg-emerald-950/18",
  "border-l-sky-500 bg-sky-50/55 dark:bg-sky-950/18",
  "border-l-amber-500 bg-amber-50/55 dark:bg-amber-950/18",
  "border-l-rose-500 bg-rose-50/55 dark:bg-rose-950/18",
  "border-l-cyan-500 bg-cyan-50/55 dark:bg-cyan-950/18",
  "border-l-lime-500 bg-lime-50/55 dark:bg-lime-950/18",
];
