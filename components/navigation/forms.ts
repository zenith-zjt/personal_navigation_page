import { z } from "zod";

export const linkFormSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  url: z.string().url("请输入有效 URL"),
  bucket: z.enum(["favorites", "watching", "later"]),
  group: z.string().min(1, "请输入分组"),
  tags: z.string().optional(),
  notes: z.string().optional(),
  progress: z.string().optional(),
});

export const widgetFormSchema = z.object({
  type: z.enum(["search", "trello", "notes", "clock"]),
  title: z.string().min(1, "请输入组件名称"),
  value: z.string().optional(),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;
export type WidgetFormValues = z.infer<typeof widgetFormSchema>;
