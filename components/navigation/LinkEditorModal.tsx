"use client";

import type { UseFormReturn } from "react-hook-form";
import type { LinkFormValues } from "./forms";
import { LinkFormFields } from "./Sidebar";

export function LinkEditorModal({
  open,
  editForm,
  bucketGroupOptions,
  currentBucketGroups,
  useCustomGroup,
  onToggleCustomGroup,
  onSubmit,
  onClose,
}: {
  open: boolean;
  editForm: UseFormReturn<LinkFormValues>;
  bucketGroupOptions: Record<"favorites" | "watching" | "later", string[]>;
  currentBucketGroups: string[];
  useCustomGroup: boolean;
  onToggleCustomGroup: (value: boolean) => void;
  onSubmit: (values: LinkFormValues) => void | Promise<void>;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-stone-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">编辑链接</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">修改完成后保存，或取消返回列表。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium dark:border-white/10"
          >
            关闭
          </button>
        </div>
        <form className="space-y-3" onSubmit={editForm.handleSubmit(onSubmit)}>
          <LinkFormFields
            linkForm={editForm}
            bucketGroupOptions={bucketGroupOptions}
            currentBucketGroups={currentBucketGroups}
            useCustomGroup={useCustomGroup}
            onToggleCustomGroup={onToggleCustomGroup}
          />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
              保存修改
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/10"
            >
              取消
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
