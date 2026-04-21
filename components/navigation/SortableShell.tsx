"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function SortableShell({
  id,
  children,
  compact = false,
}: {
  id: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-70" : ""}
    >
      <div className="flex gap-3">
        <button
          type="button"
          aria-label="拖拽排序"
          data-testid="link-drag-handle"
          className={`${compact ? "mt-0" : "mt-1"} h-8 w-8 shrink-0 rounded-lg border border-black/10 bg-white/70 text-stone-500 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-300`}
          {...attributes}
          {...listeners}
        >
          ::
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
