"use client";

import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { NavigationWidget } from "@/lib/navigation-store";
import type { LinkFormValues, WidgetFormValues } from "./forms";
import { bucketLabels } from "./constants";
import { SortableShell } from "./SortableShell";
import { WidgetBody } from "./WidgetBody";

function LinkFormFields({
  linkForm,
  bucketGroupOptions,
  currentBucketGroups,
  useCustomGroup,
  onToggleCustomGroup,
}: {
  linkForm: UseFormReturn<LinkFormValues>;
  bucketGroupOptions: Record<"favorites" | "watching" | "later", string[]>;
  currentBucketGroups: string[];
  useCustomGroup: boolean;
  onToggleCustomGroup: (value: boolean) => void;
}) {
  const bucketValue = useWatch({ control: linkForm.control, name: "bucket" });
  const groupValue = useWatch({ control: linkForm.control, name: "group" });

  return (
    <>
      <input className="field" placeholder="标题" {...linkForm.register("title")} />
      <input className="field" placeholder="https://example.com" {...linkForm.register("url")} />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="field"
          value={bucketValue}
          onChange={(event) => {
            const bucket = event.target.value as "favorites" | "watching" | "later";
            linkForm.setValue("bucket", bucket, { shouldValidate: true });
            if (!useCustomGroup) {
              linkForm.setValue("group", bucketGroupOptions[bucket][0] ?? "未分组", { shouldValidate: true });
            }
          }}
        >
          <option value="favorites">{bucketLabels.favorites}</option>
          <option value="watching">{bucketLabels.watching}</option>
          <option value="later">{bucketLabels.later}</option>
        </select>
        {!useCustomGroup ? (
          <select
            className="field"
            value={groupValue}
            onChange={(event) => {
              if (event.target.value === "__custom__") {
                onToggleCustomGroup(true);
                linkForm.setValue("group", "", { shouldValidate: true });
                return;
              }
              linkForm.setValue("group", event.target.value, { shouldValidate: true });
            }}
          >
            {currentBucketGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
            <option value="__custom__">自定义分组</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input className="field" placeholder="分组" {...linkForm.register("group")} />
            <button
              type="button"
              onClick={() => {
                onToggleCustomGroup(false);
                linkForm.setValue("group", currentBucketGroups[0] ?? "未分组", { shouldValidate: true });
              }}
              className="rounded-lg border border-black/10 px-3 text-xs dark:border-white/10"
            >
              选择
            </button>
          </div>
        )}
      </div>
      <input className="field" placeholder="标签，用逗号分隔" {...linkForm.register("tags")} />
      <textarea className="field min-h-20 resize-y" placeholder="备注" {...linkForm.register("notes")} />
      <input className="field" placeholder="阅读进度" {...linkForm.register("progress")} />
      <p className="min-h-5 text-xs text-rose-600">
        {Object.values(linkForm.formState.errors)[0]?.message}
      </p>
    </>
  );
}

export function Sidebar({
  message,
  linkForm,
  widgetForm,
  widgets,
  bucketGroupOptions,
  currentBucketGroups,
  useCustomGroup,
  onToggleCustomGroup,
  onSubmitLink,
  onSubmitWidget,
  onImportBookmarks,
  onDeleteWidget,
  onWidgetDragEnd,
}: {
  message: string;
  linkForm: UseFormReturn<LinkFormValues>;
  widgetForm: UseFormReturn<WidgetFormValues>;
  widgets: NavigationWidget[];
  bucketGroupOptions: Record<"favorites" | "watching" | "later", string[]>;
  currentBucketGroups: string[];
  useCustomGroup: boolean;
  onToggleCustomGroup: (value: boolean) => void;
  onSubmitLink: (values: LinkFormValues) => void | Promise<void>;
  onSubmitWidget: (values: WidgetFormValues) => void | Promise<void>;
  onImportBookmarks: (formData: FormData) => void | Promise<void>;
  onDeleteWidget: (id: string) => void;
  onWidgetDragEnd: (event: DragEndEvent) => void | Promise<void>;
}) {
  return (
    <aside className="space-y-5">
      <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">添加链接</h2>
          <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-900 dark:bg-emerald-300/15 dark:text-emerald-100">
            {message}
          </span>
        </div>
        <form className="mt-4 space-y-3" onSubmit={linkForm.handleSubmit(onSubmitLink)}>
          <LinkFormFields
            linkForm={linkForm}
            bucketGroupOptions={bucketGroupOptions}
            currentBucketGroups={currentBucketGroups}
            useCustomGroup={useCustomGroup}
            onToggleCustomGroup={onToggleCustomGroup}
          />
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
            添加链接
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/10">
        <h2 className="text-lg font-semibold">组件面板</h2>
        <DndContext collisionDetection={closestCenter} onDragEnd={onWidgetDragEnd}>
          <SortableContext items={widgets.map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
            <div className="mt-4 space-y-3">
              {widgets.map((widget) => (
                <SortableShell key={widget.id} id={widget.id}>
                  <article className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/10">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{widget.title}</h3>
                      <button
                        type="button"
                        onClick={() => onDeleteWidget(widget.id)}
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
        <form className="mt-4 space-y-3" onSubmit={widgetForm.handleSubmit(onSubmitWidget)}>
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
            onImportBookmarks(new FormData(event.currentTarget));
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
  );
}

export { LinkFormFields };
