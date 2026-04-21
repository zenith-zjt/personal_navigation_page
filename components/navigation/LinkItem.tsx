"use client";

import type { LinkBucket, NavLink } from "@/lib/navigation-store";
import { buckets, bucketLabels } from "./constants";
import { displayText } from "./utils";

export function LinkItem({
  link,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}: {
  link: NavLink;
  expanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (link: NavLink) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, bucket: LinkBucket) => void;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="link-title-clamp min-w-0 break-words text-base font-semibold text-stone-950 transition hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
        >
          {displayText(link.title)}
        </a>
        <button
          type="button"
          onClick={() => onToggle(link.id)}
          className="shrink-0 rounded-lg border border-black/10 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-white/10 dark:text-stone-200 dark:hover:bg-white/10"
        >
          {expanded ? "收起" : "展开"}
        </button>
      </div>

      {expanded && (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 break-all text-xs text-stone-500 dark:text-stone-400">{link.url}</p>
            <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-300/20 dark:text-amber-100">
              {displayText(link.group)}
            </span>
          </div>
          {(link.notes || link.progress) && (
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
              {displayText(link.progress || link.notes)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {link.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-900 dark:bg-emerald-300/15 dark:text-emerald-100"
              >
                #{displayText(tag)}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onEdit(link)}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-white/10 dark:text-stone-200 dark:hover:bg-white/10"
            >
              编辑
            </button>
            {buckets
              .filter((bucket) => bucket !== link.bucket)
              .map((bucket) => (
                <button
                  type="button"
                  key={bucket}
                  onClick={() => onMove(link.id, bucket)}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-white/10 dark:text-stone-200 dark:hover:bg-white/10"
                >
                  移到{bucketLabels[bucket]}
                </button>
              ))}
            <button
              type="button"
              onClick={() => onDelete(link.id)}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
            >
              删除
            </button>
          </div>
        </>
      )}
    </article>
  );
}
