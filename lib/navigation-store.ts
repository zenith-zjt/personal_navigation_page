import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { z } from "zod";

export const linkBucketSchema = z.enum(["favorites", "watching", "later"]);

export const navLinkSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().url(),
  bucket: linkBucketSchema,
  group: z.string().min(1),
  tags: z.array(z.string()).default([]),
  notes: z.string().default(""),
  progress: z.string().default(""),
  order: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const widgetSchema = z.object({
  id: z.string(),
  type: z.enum(["search", "trello", "notes", "clock"]),
  title: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  order: z.number().int().nonnegative(),
});

export const settingsSchema = z.object({
  theme: z.enum(["light", "dark"]).default("light"),
  background: z.enum(["plain", "gradient", "photo"]).default("gradient"),
});

export const navigationDbSchema = z.object({
  links: z.array(navLinkSchema),
  widgets: z.array(widgetSchema),
  settings: settingsSchema,
  updatedAt: z.string(),
});

export type LinkBucket = z.infer<typeof linkBucketSchema>;
export type NavLink = z.infer<typeof navLinkSchema>;
export type NavigationWidget = z.infer<typeof widgetSchema>;
export type NavigationSettings = z.infer<typeof settingsSchema>;
export type NavigationDb = z.infer<typeof navigationDbSchema>;

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "navigation_db.json");

let writeQueue = Promise.resolve();

const now = () => new Date().toISOString();

const defaultDb = (): NavigationDb => ({
  links: [
    {
      id: randomUUID(),
      title: "Next.js",
      url: "https://nextjs.org/docs",
      bucket: "favorites",
      group: "开发文档",
      tags: ["react", "docs"],
      notes: "App Router 文档入口",
      progress: "",
      order: 0,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: "GitHub",
      url: "https://github.com",
      bucket: "favorites",
      group: "工作台",
      tags: ["code"],
      notes: "",
      progress: "",
      order: 1,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      bucket: "watching",
      group: "正在看",
      tags: ["web"],
      notes: "跟进 CSS 和 Web API",
      progress: "读到 CSS Container Queries",
      order: 0,
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  widgets: [
    {
      id: randomUUID(),
      type: "search",
      title: "搜索",
      props: { engine: "google" },
      order: 0,
    },
    {
      id: randomUUID(),
      type: "clock",
      title: "时钟",
      props: {},
      order: 1,
    },
    {
      id: randomUUID(),
      type: "notes",
      title: "便签",
      props: { markdown: "- 整理新导入的书签\n- 把临时阅读放到稍后看" },
      order: 2,
    },
  ],
  settings: {
    theme: "light",
    background: "gradient",
  },
  updatedAt: now(),
});

async function ensureDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(defaultDb(), null, 2), "utf8");
  }
}

export async function readNavigationDb(): Promise<NavigationDb> {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  const parsed = navigationDbSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    throw new Error("navigation_db.json 数据结构无效");
  }

  return parsed.data;
}

export async function writeNavigationDb(nextDb: NavigationDb): Promise<NavigationDb> {
  const parsed = navigationDbSchema.parse({
    ...nextDb,
    updatedAt: now(),
  });

  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true });
    const tempPath = `${dbPath}.tmp`;
    await writeFile(tempPath, JSON.stringify(parsed, null, 2), "utf8");
    await rename(tempPath, dbPath);
  });

  await writeQueue;
  return parsed;
}

export function normalizeOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((item, order) => ({ ...item, order }));
}

export function normalizeLinksByBucket(links: NavLink[]): NavLink[] {
  const buckets: LinkBucket[] = ["favorites", "watching", "later"];

  return buckets.flatMap((bucket) =>
    links
      .filter((link) => link.bucket === bucket)
      .sort((a, b) => a.order - b.order)
      .map((link, order) => ({ ...link, order })),
  );
}

export function createLink(input: {
  title: string;
  url: string;
  bucket?: LinkBucket;
  group?: string;
  tags?: string[];
  notes?: string;
  progress?: string;
  order: number;
}): NavLink {
  return {
    id: randomUUID(),
    title: input.title.trim(),
    url: input.url.trim(),
    bucket: input.bucket ?? "favorites",
    group: input.group?.trim() || "未分组",
    tags: input.tags ?? [],
    notes: input.notes ?? "",
    progress: input.progress ?? "",
    order: input.order,
    createdAt: now(),
    updatedAt: now(),
  };
}
