"use client";

import { useState } from "react";
import type { LinkBucket, NavLink } from "@/lib/navigation-store";
import { bucketDecor, bucketHints, bucketLabels, buckets } from "./constants";
import { BucketTabButton } from "./BucketTabButton";
import { LinkItem } from "./LinkItem";
import { displayText, groupColor, groupKey, groupLinks } from "./utils";

function LinkDragShell({
  bucket,
  group,
  link,
  children,
  onReorderLink,
}: {
  bucket: LinkBucket;
  group: string;
  link: NavLink;
  children: React.ReactNode;
  onReorderLink: (bucket: LinkBucket, group: string, activeId: string, overId: string) => void | Promise<void>;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.stopPropagation();
        const activeId = event.dataTransfer.getData("application/x-navigation-link");
        const activeBucket = event.dataTransfer.getData("application/x-navigation-link-bucket") as LinkBucket;
        const activeGroup = event.dataTransfer.getData("application/x-navigation-link-group");
        if (activeId && activeId !== link.id && activeBucket === bucket && activeGroup === group) {
          onReorderLink(bucket, group, activeId, link.id);
        }
      }}
    >
      <div className="flex gap-3">
        <button
          type="button"
          draggable
          aria-label="拖拽链接排序"
          data-testid="link-drag-handle"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("application/x-navigation-link", link.id);
            event.dataTransfer.setData("application/x-navigation-link-bucket", bucket);
            event.dataTransfer.setData("application/x-navigation-link-group", group);
          }}
          className="h-8 w-8 shrink-0 rounded-lg border border-black/10 bg-white/70 text-stone-500 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-300"
        >
          ::
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function GroupSection({
  bucket,
  group,
  links,
  collapsed,
  expandedLinks,
  onToggleGroup,
  onToggleLink,
  onEdit,
  onDelete,
  onMove,
  onRenameGroup,
  onReorderGroup,
  onReorderLink,
}: {
  bucket: LinkBucket;
  group: string;
  links: NavLink[];
  collapsed: boolean;
  expandedLinks: Record<string, boolean>;
  onToggleGroup: (bucket: LinkBucket, group: string) => void;
  onToggleLink: (id: string) => void;
  onEdit: (link: NavLink) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, bucket: LinkBucket) => void;
  onRenameGroup: (bucket: LinkBucket, oldGroup: string, newGroup: string) => void | Promise<void>;
  onReorderGroup: (bucket: LinkBucket, activeGroup: string, overGroup: string) => void | Promise<void>;
  onReorderLink: (bucket: LinkBucket, group: string, activeId: string, overId: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        const activeGroup = event.dataTransfer.getData("application/x-navigation-group");
        const activeBucket = event.dataTransfer.getData("application/x-navigation-bucket") as LinkBucket;
        if (activeGroup && activeBucket === bucket && activeGroup !== group) {
          onReorderGroup(bucket, activeGroup, group);
        }
      }}
      className={`rounded-lg border border-l-4 border-black/10 p-3 dark:border-white/10 ${groupColor(group)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            draggable
            aria-label="拖拽分组排序"
            data-testid="group-drag-handle"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("application/x-navigation-group", group);
              event.dataTransfer.setData("application/x-navigation-bucket", bucket);
            }}
            className="h-8 w-8 shrink-0 rounded-lg border border-black/10 bg-white/70 text-stone-500 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-300"
          >
            ::
          </button>
          <div className="min-w-0 flex-1">
            {!editing ? (
              <>
                <h3 className="truncate text-sm font-semibold">{displayText(group)}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">{links.length} 个链接</p>
              </>
            ) : (
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="field"
                placeholder="分组名称"
              />
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(group);
                  setEditing(true);
                }}
                className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
              >
                重命名
              </button>
              <button
                type="button"
                onClick={() => onToggleGroup(bucket, group)}
                className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs font-medium text-stone-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
              >
                {collapsed ? "展开" : "折叠"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={async () => {
                  const next = draft.trim();
                  if (!next || next === group) {
                    setEditing(false);
                    setDraft(group);
                    return;
                  }
                  await onRenameGroup(bucket, group, next);
                  setEditing(false);
                }}
                className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(group);
                }}
                className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs font-medium text-stone-700 dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
              >
                取消
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          {links.map((link) => (
            <LinkDragShell
              key={link.id}
              bucket={bucket}
              group={group}
              link={link}
              onReorderLink={onReorderLink}
            >
              <LinkItem
                link={link}
                expanded={expandedLinks[link.id] ?? false}
                onToggle={onToggleLink}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={onMove}
              />
            </LinkDragShell>
          ))}
        </div>
      )}
    </div>
  );
}

export function LinksPanel({
  query,
  onQueryChange,
  tags,
  activeTag,
  onActiveTagChange,
  tagsExpanded,
  onToggleTagsExpanded,
  linksByBucket,
  activeBucket,
  onActiveBucketChange,
  collapsedBuckets,
  onToggleBucket,
  collapsedGroups,
  expandedLinks,
  onToggleGroup,
  onToggleLink,
  onEdit,
  onDelete,
  onMove,
  onRenameGroup,
  onReorderGroup,
  onReorderLink,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  tags: string[];
  activeTag: string;
  onActiveTagChange: (value: string) => void;
  tagsExpanded: boolean;
  onToggleTagsExpanded: () => void;
  linksByBucket: Record<LinkBucket, NavLink[]>;
  activeBucket: LinkBucket;
  onActiveBucketChange: (bucket: LinkBucket) => void;
  collapsedBuckets: Record<LinkBucket, boolean>;
  onToggleBucket: (bucket: LinkBucket) => void;
  collapsedGroups: Record<string, boolean>;
  expandedLinks: Record<string, boolean>;
  onToggleGroup: (bucket: LinkBucket, group: string) => void;
  onToggleLink: (id: string) => void;
  onEdit: (link: NavLink) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, bucket: LinkBucket) => void;
  onRenameGroup: (bucket: LinkBucket, oldGroup: string, newGroup: string) => void | Promise<void>;
  onReorderGroup: (bucket: LinkBucket, activeGroup: string, overGroup: string) => void | Promise<void>;
  onReorderLink: (bucket: LinkBucket, group: string, activeId: string, overId: string) => void | Promise<void>;
}) {
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
              onClick={() => onToggleBucket(bucket)}
              className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-200"
            >
              {bucketCollapsed ? "展开" : "折叠"}
            </button>
          )}
        </div>

        {!bucketCollapsed && (
          <div className="min-h-24 space-y-3 rounded-lg">
            {groups.map(({ group, links: groupItems }) => (
              <GroupSection
                key={group}
                bucket={bucket}
                group={group}
                links={groupItems}
                collapsed={collapsedGroups[groupKey(bucket, group)] ?? false}
                expandedLinks={expandedLinks}
                onToggleGroup={onToggleGroup}
                onToggleLink={onToggleLink}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={onMove}
                onRenameGroup={onRenameGroup}
                onReorderGroup={onReorderGroup}
                onReorderLink={onReorderLink}
              />
            ))}
            {links.length === 0 && (
              <p className="rounded-lg border border-dashed border-black/10 bg-white/40 p-4 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400">
                暂无链接
              </p>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input
            className="field"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索标题、URL、分组、标签和备注"
          />
          <button
            type="button"
            onClick={onToggleTagsExpanded}
            className="rounded-lg border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-stone-100"
          >
            {tagsExpanded ? "收起标签" : `展开标签 (${tags.length})`}
          </button>
        </div>
        {tagsExpanded && (
          <div className="mt-3 max-h-28 overflow-y-auto rounded-lg border border-black/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onActiveTagChange("")}
                className={`rounded-lg px-3 py-2 text-sm ${activeTag ? "border border-black/10 dark:border-white/10" : "bg-emerald-600 text-white"}`}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onActiveTagChange(tag)}
                  className={`rounded-lg px-3 py-2 text-sm ${activeTag === tag ? "bg-emerald-600 text-white" : "border border-black/10 dark:border-white/10"}`}
                >
                  #{displayText(tag)}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-black/10 bg-white/75 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
        <div className="hidden gap-2 md:flex">
          {buckets.map((bucket) => (
            <BucketTabButton
              key={bucket}
              bucket={bucket}
              active={activeBucket === bucket}
              count={linksByBucket[bucket].length}
              onClick={() => onActiveBucketChange(bucket)}
            />
          ))}
        </div>
        <div className="grid gap-2 md:hidden">
          {buckets.map((bucket) => (
            <button
              key={bucket}
              type="button"
              onClick={() => onToggleBucket(bucket)}
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
    </div>
  );
}
