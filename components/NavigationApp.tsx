"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { LinkBucket, NavLink, NavigationDb, NavigationWidget } from "@/lib/navigation-store";

const buckets: LinkBucket[] = ["favorites", "watching", "later"];

const bucketLabels: Record<LinkBucket, string> = {
  favorites: "常用链接",
  watching: "正在看",
  later: "稍后看",
};

const bucketHints: Record<LinkBucket, string> = {
  favorites: "核心入口、工作台和高频服务",
  watching: "正在追踪的文章、课程和项目",
  later: "临时收集，等待整理",
};

const bucketDecor: Record<LinkBucket, { dot: string; active: string; panel: string }> = {
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

const groupColorStyles = [
  "border-l-emerald-500 bg-emerald-50/55 dark:bg-emerald-950/18",
  "border-l-sky-500 bg-sky-50/55 dark:bg-sky-950/18",
  "border-l-amber-500 bg-amber-50/55 dark:bg-amber-950/18",
  "border-l-rose-500 bg-rose-50/55 dark:bg-rose-950/18",
  "border-l-cyan-500 bg-cyan-50/55 dark:bg-cyan-950/18",
  "border-l-lime-500 bg-lime-50/55 dark:bg-lime-950/18",
];

const linkFormSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  url: z.string().url("请输入有效 URL"),
  bucket: z.enum(["favorites", "watching", "later"]),
  group: z.string().min(1, "请输入分组"),
  tags: z.string().optional(),
  notes: z.string().optional(),
  progress: z.string().optional(),
});

const widgetFormSchema = z.object({
  type: z.enum(["search", "trello", "notes", "clock"]),
  title: z.string().min(1, "请输入组件名称"),
  value: z.string().optional(),
});

type LinkFormValues = z.infer<typeof linkFormSchema>;
type WidgetFormValues = z.infer<typeof widgetFormSchema>;
type BucketGroups = Array<{ group: string; links: NavLink[] }>;

function bucketDropId(bucket: LinkBucket) {
  return `bucket:${bucket}`;
}

function groupKey(bucket: LinkBucket, group: string) {
  return `${bucket}:${group}`;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function groupColor(group: string) {
  return groupColorStyles[hashText(group) % groupColorStyles.length];
}

function displayText(value: string) {
  if (!/[ÃÂâ]|[\u00c0-\u00ff]{2,}|�/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.includes("�") ? value.replace(/�[\u0080-\u009f]?�?/g, "").trim() : decoded;
  } catch {
    return value.replace(/�[\u0080-\u009f]?�?/g, "").trim();
  }
}

function SortableShell({
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

function DroppableBucket({
  bucket,
  children,
}: {
  bucket: LinkBucket;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketDropId(bucket) });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-24 space-y-3 rounded-lg transition ${isOver ? "bg-emerald-500/10 ring-2 ring-emerald-500/40" : ""}`}
    >
      {children}
    </div>
  );
}

function BucketTabButton({
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
  const { setNodeRef, isOver } = useDroppable({ id: bucketDropId(bucket) });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition ${
        active
          ? bucketDecor[bucket].active
          : "border-black/10 bg-white/70 text-stone-700 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
      } ${isOver ? "ring-2 ring-emerald-500/40" : ""}`}
    >
      <span className={`h-3 w-3 rounded-full ${bucketDecor[bucket].dot}`} />
      {bucketLabels[bucket]}
      <span className="rounded-lg bg-black/10 px-2 py-0.5 text-xs dark:bg-white/15">{count}</span>
    </button>
  );
}

function ClockWidget() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setDate(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-4xl font-semibold text-stone-950 dark:text-white">
        {date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {date.toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>
    </div>
  );
}

function WidgetBody({ widget }: { widget: NavigationWidget }) {
  if (widget.type === "clock") {
    return <ClockWidget />;
  }

  if (widget.type === "notes") {
    return (
      <pre className="min-h-28 whitespace-pre-wrap rounded-lg border border-black/10 bg-white/60 p-3 font-sans text-sm leading-6 text-stone-700 dark:border-white/10 dark:bg-white/10 dark:text-stone-200">
        {String(widget.props.markdown ?? "暂无便签")}
      </pre>
    );
  }

  if (widget.type === "trello") {
    const boardUrl = String(widget.props.url ?? "");
    return boardUrl ? (
      <iframe
        title={widget.title}
        src={boardUrl}
        className="h-48 w-full rounded-lg border border-black/10 bg-white dark:border-white/10"
      />
    ) : (
      <p className="text-sm text-stone-600 dark:text-stone-300">添加 Trello 看板链接后即可嵌入。</p>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const query = String(data.get("q") ?? "").trim();
        if (query) {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
        }
      }}
    >
      <input
        name="q"
        className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2 dark:border-white/10 dark:bg-white/10"
        placeholder="搜索网页"
      />
      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
        搜索
      </button>
    </form>
  );
}

function LinkItem({
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

function groupLinks(links: NavLink[]): BucketGroups {
  const map = new Map<string, NavLink[]>();
  for (const link of links) {
    const list = map.get(link.group) ?? [];
    list.push(link);
    map.set(link.group, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
    .map(([group, groupLinks]) => ({
      group,
      links: groupLinks.sort((a, b) => a.order - b.order),
    }));
}

export default function NavigationApp() {
  const [db, setDb] = useState<NavigationDb | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("正在载入导航数据");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<LinkBucket, boolean>>({
    favorites: false,
    watching: false,
    later: false,
  });
  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>({});
  const [activeBucket, setActiveBucket] = useState<LinkBucket>("favorites");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const linkForm = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      title: "",
      url: "",
      bucket: "favorites",
      group: "未分组",
      tags: "",
      notes: "",
      progress: "",
    },
  });

  const widgetForm = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      type: "search",
      title: "搜索",
      value: "",
    },
  });

  async function loadData() {
    const response = await fetch("/api/navigation", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("无法读取导航数据");
    }
    setDb(await response.json());
  }

  async function mutate(body: unknown, nextMessage = "已保存") {
    const response = await fetch("/api/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message ?? "保存失败");
    }
    setDb(payload);
    setMessage(nextMessage);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData()
        .then(() => setMessage("数据已就绪"))
        .catch((error) => setMessage(error instanceof Error ? error.message : "载入失败"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredLinks = useMemo(() => {
    const links = db?.links ?? [];
    const keyword = query.trim().toLowerCase();
    return links.filter((link) => {
      const text = `${displayText(link.title)} ${link.url} ${displayText(link.group)} ${link.tags.map(displayText).join(" ")} ${displayText(link.notes)} ${displayText(link.progress)}`.toLowerCase();
      return (!keyword || text.includes(keyword)) && (!activeTag || link.tags.includes(activeTag));
    });
  }, [activeTag, db?.links, query]);

  const linksByBucket = useMemo(() => {
    return Object.fromEntries(
      buckets.map((bucket) => [
        bucket,
        filteredLinks.filter((link) => link.bucket === bucket).sort((a, b) => a.order - b.order),
      ]),
    ) as Record<LinkBucket, NavLink[]>;
  }, [filteredLinks]);

  const tags = useMemo(
    () => Array.from(new Set((db?.links ?? []).flatMap((link) => link.tags))).sort(),
    [db?.links],
  );

  function toggleGroup(bucket: LinkBucket, group: string) {
    const key = groupKey(bucket, group);
    setCollapsedGroups((state) => ({ ...state, [key]: !state[key] }));
  }

  function toggleBucket(bucket: LinkBucket) {
    setCollapsedBuckets((state) => ({ ...state, [bucket]: !state[bucket] }));
  }

  function toggleLink(id: string) {
    setExpandedLinks((state) => ({ ...state, [id]: !state[id] }));
  }

  function editLink(link: NavLink) {
    setEditingId(link.id);
    setExpandedLinks((state) => ({ ...state, [link.id]: true }));
    linkForm.reset({
      title: link.title,
      url: link.url,
      bucket: link.bucket,
      group: link.group,
      tags: link.tags.join(", "),
      notes: link.notes,
      progress: link.progress,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitLink(values: LinkFormValues) {
    if (!db) {
      return;
    }

    const payload = {
      title: values.title,
      url: values.url,
      bucket: values.bucket,
      group: values.group,
      tags: (values.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: values.notes ?? "",
      progress: values.progress ?? "",
    };

    if (editingId) {
      const old = db.links.find((link) => link.id === editingId);
      if (!old) {
        return;
      }
      await mutate({ action: "update-link", link: { ...old, ...payload } }, "链接已更新");
    } else {
      await mutate({ action: "add-link", link: payload }, "链接已添加");
    }

    setEditingId(null);
    linkForm.reset({
      title: "",
      url: "",
      bucket: "favorites",
      group: "未分组",
      tags: "",
      notes: "",
      progress: "",
    });
  }

  async function submitWidget(values: WidgetFormValues) {
    const props =
      values.type === "notes"
        ? { markdown: values.value ?? "" }
        : values.type === "trello"
          ? { url: values.value ?? "" }
          : values.type === "search"
            ? { engine: values.value || "google" }
            : {};

    await mutate({
      action: "add-widget",
      widget: {
        type: values.type,
        title: values.title,
        props,
      },
    }, "组件已添加");
    widgetForm.reset({ type: "search", title: "搜索", value: "" });
  }

  async function importBookmarks(formData: FormData) {
    const response = await fetch("/api/navigation/import-bookmarks", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.message ?? "导入失败");
      return;
    }
    setDb(payload.db);
    setMessage(`已导入 ${payload.imported} 个链接，跳过 ${payload.skipped} 个重复链接`);
  }

  function getBucketFromOverId(id: string): LinkBucket | null {
    if (id.startsWith("bucket:")) {
      const bucket = id.replace("bucket:", "");
      return buckets.includes(bucket as LinkBucket) ? (bucket as LinkBucket) : null;
    }

    const overLink = db?.links.find((link) => link.id === id);
    return overLink?.bucket ?? null;
  }

  async function onLinkDragEnd(event: DragEndEvent) {
    if (!db || !event.over || event.active.id === event.over.id) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    const activeLink = db.links.find((link) => link.id === activeId);
    const targetBucket = getBucketFromOverId(overId);

    if (!activeLink || !targetBucket) {
      return;
    }

    const nextByBucket: Record<LinkBucket, NavLink[]> = {
      favorites: db.links.filter((link) => link.bucket === "favorites").sort((a, b) => a.order - b.order),
      watching: db.links.filter((link) => link.bucket === "watching").sort((a, b) => a.order - b.order),
      later: db.links.filter((link) => link.bucket === "later").sort((a, b) => a.order - b.order),
    };

    const fromBucket = activeLink.bucket;
    if (fromBucket === targetBucket) {
      const oldIndex = nextByBucket[targetBucket].findIndex((link) => link.id === activeId);
      const newIndex = nextByBucket[targetBucket].findIndex((link) => link.id === overId);
      nextByBucket[targetBucket] =
        newIndex >= 0 ? arrayMove(nextByBucket[targetBucket], oldIndex, newIndex) : nextByBucket[targetBucket];
    } else {
      const activeIndex = nextByBucket[fromBucket].findIndex((link) => link.id === activeId);
      const [moving] = nextByBucket[fromBucket].splice(activeIndex, 1);
      const overIndex = nextByBucket[targetBucket].findIndex((link) => link.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : nextByBucket[targetBucket].length;
      nextByBucket[targetBucket].splice(insertIndex, 0, { ...moving, bucket: targetBucket });
    }

    const layout = buckets.flatMap((bucket) =>
      nextByBucket[bucket].map((link, order) => ({ id: link.id, bucket, order })),
    );

    if (targetBucket !== activeBucket) {
      setActiveBucket(targetBucket);
    }
    await mutate({ action: "layout-links", items: layout }, "链接位置已保存");
  }

  async function onWidgetDragEnd(event: DragEndEvent) {
    if (!db || !event.over || event.active.id === event.over.id) {
      return;
    }
    const widgets = [...db.widgets].sort((a, b) => a.order - b.order);
    const oldIndex = widgets.findIndex((widget) => widget.id === event.active.id);
    const newIndex = widgets.findIndex((widget) => widget.id === event.over?.id);
    const next = arrayMove(widgets, oldIndex, newIndex).map((widget) => widget.id);
    await mutate({ action: "reorder-widgets", ids: next }, "组件排序已保存");
  }

  function renderBucketPanel(bucket: LinkBucket, mode: "desktop" | "mobile") {
    const links = linksByBucket[bucket];
    const groups = groupLinks(links);
    const bucketCollapsed = mode === "mobile" && collapsedBuckets[bucket];

    return (
      <section
        key={`${mode}-${bucket}`}
        className={`min-w-0 rounded-lg border border-black/10 bg-gradient-to-br ${bucketDecor[bucket].panel} p-4 shadow-sm backdrop-blur dark:border-white/10`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <span className={`h-3 w-3 rounded-full ${bucketDecor[bucket].dot}`} />
              {bucketLabels[bucket]}
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{bucketHints[bucket]}</p>
          </div>
          {mode === "mobile" && (
            <button
              type="button"
              onClick={() => toggleBucket(bucket)}
              className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
            >
              {bucketCollapsed ? "展开" : "折叠"}
            </button>
          )}
        </div>

        {!bucketCollapsed && (
          <DroppableBucket bucket={bucket}>
            {groups.map(({ group, links: groupItems }) => {
              const collapsed = collapsedGroups[groupKey(bucket, group)] ?? false;

              return (
                <div
                  key={group}
                  className={`rounded-lg border border-l-4 border-black/10 p-3 dark:border-white/10 ${groupColor(group)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{displayText(group)}</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{groupItems.length} 个链接</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(bucket, group)}
                      className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
                    >
                      {collapsed ? "展开" : "折叠"}
                    </button>
                  </div>
                  {!collapsed && (
                    <SortableContext items={groupItems.map((link) => link.id)} strategy={verticalListSortingStrategy}>
                      <div className="mt-3 space-y-3">
                        {groupItems.map((link) => (
                          <SortableShell key={link.id} id={link.id} compact>
                            <LinkItem
                              link={link}
                              expanded={expandedLinks[link.id] ?? false}
                              onToggle={toggleLink}
                              onEdit={editLink}
                              onDelete={(id) => mutate({ action: "delete-link", id }, "链接已删除")}
                              onMove={(id, nextBucket) => mutate({ action: "move-link", id, bucket: nextBucket }, "链接已移动")}
                            />
                          </SortableShell>
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
            {links.length === 0 && (
              <p className="rounded-lg border border-dashed border-black/10 bg-white/40 p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400">
                暂无链接
              </p>
            )}
          </DroppableBucket>
        )}
      </section>
    );
  }

  const appClass = db?.settings.theme === "dark" ? "dark" : "";

  return (
    <div className={appClass}>
      <main className="min-h-screen bg-[#f5f7f2] text-stone-950 transition dark:bg-[#12110f] dark:text-white">
        <div className="min-h-screen bg-[linear-gradient(145deg,rgba(215,235,226,0.95),rgba(247,247,242,0.90)_38%,rgba(238,239,231,0.95))] px-4 py-5 dark:bg-[linear-gradient(145deg,rgba(18,17,15,0.98),rgba(35,32,28,0.96)_42%,rgba(20,35,31,0.94))] sm:px-6 lg:px-8">
          <section className="mx-auto flex max-w-7xl flex-col gap-5">
            <header className="grid gap-4 rounded-lg border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Personal Navigation</p>
                <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">个人导航页</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">
                  收纳常用链接、当前阅读和稍后处理内容。数据写入服务端本地 JSON 文件，适合部署到自己的 VPS。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => db && mutate({ action: "replace", db: { ...db, settings: { ...db.settings, theme: db.settings.theme === "dark" ? "light" : "dark" } } }, "主题已切换")}
                  className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
                >
                  切换主题
                </button>
                <a
                  href="/navigation-chrome-extension.zip"
                  download
                  className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  下载插件
                </a>
                <a
                  href="/api/navigation"
                  target="_blank"
                  className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  导出 JSON
                </a>
              </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <aside className="space-y-5">
                <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{editingId ? "编辑链接" : "添加链接"}</h2>
                    <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-900 dark:bg-emerald-300/15 dark:text-emerald-100">
                      {message}
                    </span>
                  </div>
                  <form className="mt-4 space-y-3" onSubmit={linkForm.handleSubmit(submitLink)}>
                    <input className="field" placeholder="标题" {...linkForm.register("title")} />
                    <input className="field" placeholder="https://example.com" {...linkForm.register("url")} />
                    <div className="grid grid-cols-2 gap-2">
                      <select className="field" {...linkForm.register("bucket")}>
                        <option value="favorites">常用链接</option>
                        <option value="watching">正在看</option>
                        <option value="later">稍后看</option>
                      </select>
                      <input className="field" placeholder="分组" {...linkForm.register("group")} />
                    </div>
                    <input className="field" placeholder="标签，用逗号分隔" {...linkForm.register("tags")} />
                    <textarea className="field min-h-20 resize-y" placeholder="备注" {...linkForm.register("notes")} />
                    <input className="field" placeholder="阅读进度" {...linkForm.register("progress")} />
                    <p className="min-h-5 text-xs text-rose-600">
                      {Object.values(linkForm.formState.errors)[0]?.message}
                    </p>
                    <div className="flex gap-2">
                      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                        {editingId ? "保存修改" : "添加链接"}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            linkForm.reset();
                          }}
                          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/10"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </form>
                </section>

                <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <h2 className="text-lg font-semibold">组件面板</h2>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onWidgetDragEnd}>
                    <SortableContext items={(db?.widgets ?? []).map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
                      <div className="mt-4 space-y-3">
                        {(db?.widgets ?? [])
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((widget) => (
                            <SortableShell key={widget.id} id={widget.id}>
                              <article className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <h3 className="font-semibold">{widget.title}</h3>
                                  <button
                                    type="button"
                                    onClick={() => mutate({ action: "delete-widget", id: widget.id }, "组件已删除")}
                                    className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-medium text-white"
                                  >
                                    删除
                                  </button>
                                </div>
                                <WidgetBody widget={widget} />
                              </article>
                            </SortableShell>
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <form className="mt-4 space-y-3" onSubmit={widgetForm.handleSubmit(submitWidget)}>
                    <select className="field" {...widgetForm.register("type")}>
                      <option value="search">搜索引擎</option>
                      <option value="trello">Trello 看板</option>
                      <option value="notes">Markdown 便签</option>
                      <option value="clock">时钟日历</option>
                    </select>
                    <input className="field" placeholder="组件标题" {...widgetForm.register("title")} />
                    <textarea
                      className="field min-h-24 resize-y"
                      placeholder="搜索引擎名称、Trello URL 或便签内容"
                      {...widgetForm.register("value")}
                    />
                    <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                      添加组件
                    </button>
                  </form>
                </section>

                <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <h2 className="text-lg font-semibold">导入书签</h2>
                  <form
                    className="mt-4 space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      importBookmarks(new FormData(event.currentTarget));
                    }}
                  >
                    <input
                      className="block w-full rounded-lg border border-dashed border-black/20 bg-white/60 px-3 py-3 text-sm dark:border-white/20 dark:bg-white/10"
                      type="file"
                      name="file"
                      accept=".html,text/html"
                    />
                    <select className="field" name="bucket" defaultValue="favorites">
                      <option value="favorites">导入到常用链接</option>
                      <option value="watching">导入到正在看</option>
                      <option value="later">导入到稍后看</option>
                    </select>
                    <button className="w-full rounded-lg bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-white dark:text-stone-950">
                      上传 bookmarks.html
                    </button>
                  </form>
                </section>
              </aside>

              <div className="space-y-5">
                <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <input
                      className="field"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索标题、URL、分组、标签和备注"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTag("")}
                        className={`rounded-lg px-3 py-2 text-sm ${activeTag ? "border border-black/10 dark:border-white/10" : "bg-emerald-600 text-white"}`}
                      >
                        全部
                      </button>
                      {tags.slice(0, 8).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setActiveTag(tag)}
                          className={`rounded-lg px-3 py-2 text-sm ${activeTag === tag ? "bg-emerald-600 text-white" : "border border-black/10 dark:border-white/10"}`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLinkDragEnd}>
                  <section className="rounded-lg border border-black/10 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
                    <div className="hidden gap-2 md:flex">
                      {buckets.map((bucket) => (
                        <BucketTabButton
                          key={bucket}
                          bucket={bucket}
                          active={activeBucket === bucket}
                          count={linksByBucket[bucket].length}
                          onClick={() => setActiveBucket(bucket)}
                        />
                      ))}
                    </div>
                    <div className="grid gap-2 md:hidden">
                      {buckets.map((bucket) => (
                        <button
                          key={bucket}
                          type="button"
                          onClick={() => toggleBucket(bucket)}
                          className="flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-sm font-semibold text-stone-800 dark:border-white/10 dark:bg-white/10 dark:text-stone-100"
                        >
                          <span className="flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-full ${bucketDecor[bucket].dot}`} />
                            {bucketLabels[bucket]}
                          </span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {linksByBucket[bucket].length} / {collapsedBuckets[bucket] ? "展开" : "折叠"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <div className="hidden md:block">{renderBucketPanel(activeBucket, "desktop")}</div>
                  <div className="space-y-4 md:hidden">{buckets.map((bucket) => renderBucketPanel(bucket, "mobile"))}</div>
                </DndContext>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
