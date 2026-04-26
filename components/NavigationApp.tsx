"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { LinkBucket, NavLink, NavigationDb } from "@/lib/navigation-store";
import { LinkEditorModal } from "@/components/navigation/LinkEditorModal";
import { LinksPanel } from "@/components/navigation/LinksPanel";
import { Sidebar } from "@/components/navigation/Sidebar";
import { buckets } from "@/components/navigation/constants";
import { linkFormSchema, widgetFormSchema, type LinkFormValues, type WidgetFormValues } from "@/components/navigation/forms";
import { displayText, groupLinks } from "@/components/navigation/utils";

const emptyLinkDefaults: LinkFormValues = {
  title: "",
  url: "",
  bucket: "favorites",
  group: "未分组",
  tags: "",
  notes: "",
  progress: "",
};

export default function NavigationApp() {
  const [db, setDb] = useState<NavigationDb | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [editingLink, setEditingLink] = useState<NavLink | null>(null);
  const [message, setMessage] = useState("正在载入导航数据");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<LinkBucket, boolean>>({
    favorites: false,
    watching: false,
    later: false,
  });
  const [expandedLinks, setExpandedLinks] = useState<Record<string, boolean>>({});
  const [activeBucket, setActiveBucket] = useState<LinkBucket>("favorites");
  const [addUsesCustomGroup, setAddUsesCustomGroup] = useState(false);
  const [editUsesCustomGroup, setEditUsesCustomGroup] = useState(false);
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);

  const addForm = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: emptyLinkDefaults,
  });
  const editForm = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: emptyLinkDefaults,
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
    return payload as NavigationDb;
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

  const allBucketGroups = useMemo(() => {
    const source = db?.links ?? [];
    return Object.fromEntries(
      buckets.map((bucket) => {
        const groups = groupLinks(source.filter((link) => link.bucket === bucket)).map(({ group }) => displayText(group));
        return [bucket, groups];
      }),
    ) as Record<LinkBucket, string[]>;
  }, [db?.links]);

  const addBucket = useWatch({ control: addForm.control, name: "bucket" });
  const editBucket = useWatch({ control: editForm.control, name: "bucket" });
  const addGroup = useWatch({ control: addForm.control, name: "group" });
  const editGroup = useWatch({ control: editForm.control, name: "group" });
  const addGroups = allBucketGroups[addBucket ?? "favorites"] ?? [];
  const editGroups = allBucketGroups[editBucket ?? "favorites"] ?? [];
  const addEffectiveCustomGroup = addUsesCustomGroup || addGroups.length === 0 || (!!addGroup && !addGroups.includes(addGroup));
  const editEffectiveCustomGroup = editUsesCustomGroup || editGroups.length === 0 || (!!editGroup && !editGroups.includes(editGroup));

  const tags = useMemo(
    () => Array.from(new Set((db?.links ?? []).flatMap((link) => link.tags))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [db?.links],
  );

  function toggleGroup(bucket: LinkBucket, group: string) {
    const key = `${bucket}:${group}`;
    setCollapsedGroups((state) => ({ ...state, [key]: !state[key] }));
  }

  function toggleBucket(bucket: LinkBucket) {
    setCollapsedBuckets((state) => ({ ...state, [bucket]: !state[bucket] }));
  }

  function toggleLink(id: string) {
    setExpandedLinks((state) => ({ ...state, [id]: !state[id] }));
  }

  function openEditor(link: NavLink) {
    setEditingLink(link);
    setExpandedLinks((state) => ({ ...state, [link.id]: true }));
    setEditUsesCustomGroup(!allBucketGroups[link.bucket]?.includes(link.group));
    editForm.reset({
      title: link.title,
      url: link.url,
      bucket: link.bucket,
      group: link.group,
      tags: link.tags.join(", "),
      notes: link.notes,
      progress: link.progress,
    });
  }

  function closeEditor() {
    setEditingLink(null);
    setEditUsesCustomGroup(false);
    editForm.reset(emptyLinkDefaults);
  }

  async function submitAddLink(values: LinkFormValues) {
    const payload = normalizeLinkPayload(values);
    await mutate({ action: "add-link", link: payload }, "链接已添加");
    setAddUsesCustomGroup(false);
    addForm.reset({
      ...emptyLinkDefaults,
      group: allBucketGroups.favorites?.[0] ?? "未分组",
    });
  }

  async function submitEditLink(values: LinkFormValues) {
    if (!editingLink) {
      return;
    }
    await mutate(
      {
        action: "update-link",
        link: {
          ...editingLink,
          ...normalizeLinkPayload(values),
        },
      },
      "链接已更新",
    );
    closeEditor();
  }

  function normalizeLinkPayload(values: LinkFormValues) {
    return {
      title: values.title,
      url: values.url,
      bucket: values.bucket,
      group: values.group,
      tags: (values.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      notes: values.notes ?? "",
      progress: values.progress ?? "",
    };
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

  function exportJson() {
    if (!db) {
      return;
    }

    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `navigation-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("JSON 导出完成");
  }

  function triggerImportJson() {
    importJsonInputRef.current?.click();
  }

  async function importJsonFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await mutate({ action: "replace", db: parsed }, "JSON 导入完成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 导入失败");
    }
  }

  async function reorderGroups(bucket: LinkBucket, activeGroup: string, overGroup: string) {
    if (!db) {
      return;
    }
    const nextByBucket = getOrderedLinksByBucket(db.links);
    const groups = groupLinks(nextByBucket[bucket]);
    const oldIndex = groups.findIndex((group) => group.group === activeGroup);
    const newIndex = groups.findIndex((group) => group.group === overGroup);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    nextByBucket[bucket] = arrayMove(groups, oldIndex, newIndex).flatMap((group) => group.links);
    await saveLayout(nextByBucket, "分组排序已保存");
  }

  async function reorderLinksInGroup(bucket: LinkBucket, group: string, activeId: string, overId: string) {
    if (!db || activeId === overId) {
      return;
    }

    const nextByBucket = getOrderedLinksByBucket(db.links);
    const groups = groupLinks(nextByBucket[bucket]);
    const targetGroup = groups.find((item) => item.group === group);
    if (!targetGroup) {
      return;
    }

    const oldIndex = targetGroup.links.findIndex((link) => link.id === activeId);
    const newIndex = targetGroup.links.findIndex((link) => link.id === overId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    nextByBucket[bucket] = groups.flatMap((item) =>
      item.group === group ? arrayMove(item.links, oldIndex, newIndex) : item.links,
    );
    await saveLayout(nextByBucket, "链接排序已保存");
  }

  function getOrderedLinksByBucket(links: NavLink[]): Record<LinkBucket, NavLink[]> {
    return {
      favorites: links.filter((link) => link.bucket === "favorites").sort((a, b) => a.order - b.order),
      watching: links.filter((link) => link.bucket === "watching").sort((a, b) => a.order - b.order),
      later: links.filter((link) => link.bucket === "later").sort((a, b) => a.order - b.order),
    };
  }

  async function saveLayout(nextByBucket: Record<LinkBucket, NavLink[]>, message: string) {
    const layout = buckets.flatMap((bucket) =>
      nextByBucket[bucket].map((link, order) => ({ id: link.id, bucket, order })),
    );
    await mutate({ action: "layout-links", items: layout }, message);
  }

  async function onRenameGroup(bucket: LinkBucket, oldGroup: string, newGroup: string) {
    await mutate({ action: "rename-group", bucket, oldGroup, newGroup }, "分组已重命名");
    if (editingLink && editForm.getValues("group") === oldGroup) {
      editForm.setValue("group", newGroup, { shouldValidate: true });
    }
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
                <input
                  ref={importJsonInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={importJsonFile}
                />
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
                <button
                  type="button"
                  onClick={exportJson}
                  className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  导出 JSON
                </button>
                <button
                  type="button"
                  onClick={triggerImportJson}
                  className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white"
                >
                  导入 JSON
                </button>
              </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
              <Sidebar
                message={message}
                linkForm={addForm}
                widgetForm={widgetForm}
                widgets={(db?.widgets ?? []).slice().sort((a, b) => a.order - b.order)}
                bucketGroupOptions={allBucketGroups}
                currentBucketGroups={addGroups.length > 0 ? addGroups : ["未分组"]}
                useCustomGroup={addEffectiveCustomGroup}
                onToggleCustomGroup={setAddUsesCustomGroup}
                onSubmitLink={submitAddLink}
                onSubmitWidget={submitWidget}
                onImportBookmarks={importBookmarks}
                onDeleteWidget={(id) => mutate({ action: "delete-widget", id }, "组件已删除")}
                onWidgetDragEnd={onWidgetDragEnd}
              />

              <LinksPanel
                query={query}
                onQueryChange={setQuery}
                tags={tags}
                activeTag={activeTag}
                onActiveTagChange={setActiveTag}
                tagsExpanded={tagsExpanded}
                onToggleTagsExpanded={() => setTagsExpanded((value) => !value)}
                linksByBucket={linksByBucket}
                activeBucket={activeBucket}
                onActiveBucketChange={setActiveBucket}
                collapsedBuckets={collapsedBuckets}
                onToggleBucket={toggleBucket}
                collapsedGroups={collapsedGroups}
                expandedLinks={expandedLinks}
                onToggleGroup={toggleGroup}
                onToggleLink={toggleLink}
                onEdit={openEditor}
                onDelete={(id) => mutate({ action: "delete-link", id }, "链接已删除")}
                onMove={(id, bucket) => mutate({ action: "move-link", id, bucket }, "链接已移动")}
                onRenameGroup={onRenameGroup}
                onReorderGroup={reorderGroups}
                onReorderLink={reorderLinksInGroup}
              />
            </div>
          </section>
        </div>
      </main>

      <LinkEditorModal
        open={!!editingLink}
        editForm={editForm}
        bucketGroupOptions={allBucketGroups}
        currentBucketGroups={editGroups.length > 0 ? editGroups : ["未分组"]}
        useCustomGroup={editEffectiveCustomGroup}
        onToggleCustomGroup={setEditUsesCustomGroup}
        onSubmit={submitEditLink}
        onClose={closeEditor}
      />
    </div>
  );
}
