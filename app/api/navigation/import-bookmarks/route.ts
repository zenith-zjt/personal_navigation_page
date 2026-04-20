import { NextResponse } from "next/server";
import { parseNetscapeBookmarks } from "@/lib/bookmarks";
import {
  linkBucketSchema,
  readNavigationDb,
  writeNavigationDb,
  type LinkBucket,
} from "@/lib/navigation-store";

export const runtime = "nodejs";

const maxBookmarkBytes = 5 * 1024 * 1024;

function corruptionScore(value: string) {
  return (value.match(/[�\u0080-\u009f]/g) ?? []).length;
}

function shouldReplaceText(current: string, incoming: string) {
  if (!incoming.trim()) {
    return false;
  }

  const currentScore = corruptionScore(current);
  const incomingScore = corruptionScore(incoming);
  return incomingScore < currentScore || (currentScore > 0 && incoming.length > current.length);
}

function decodeBookmarkFile(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  const charsetMatch = head.match(/charset\s*=\s*["']?([\w-]+)/i);
  const charset = charsetMatch?.[1]?.toLowerCase();
  const encoding = charset && ["gbk", "gb2312", "gb18030"].includes(charset)
    ? "gb18030"
    : charset && ["big5", "utf-16le", "utf-16be"].includes(charset)
      ? charset
      : "utf-8";

  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const bucketValue = formData.get("bucket");
    const bucket = linkBucketSchema
      .catch("favorites")
      .parse(typeof bucketValue === "string" ? bucketValue : "favorites") as LinkBucket;

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "请选择 bookmarks.html 文件" }, { status: 400 });
    }

    if (file.size > maxBookmarkBytes) {
      return NextResponse.json({ message: "书签文件不能超过 5MB" }, { status: 413 });
    }

    const html = decodeBookmarkFile(await file.arrayBuffer());
    const imported = parseNetscapeBookmarks(html, bucket);
    const db = await readNavigationDb();
    const existingByUrl = new Map(db.links.map((link) => [link.url, link]));
    const nextLinks = imported
      .filter((link) => !existingByUrl.has(link.url))
      .map((link, index) => ({
        ...link,
        order: db.links.filter((item) => item.bucket === bucket).length + index,
      }));

    for (const link of imported) {
      const current = existingByUrl.get(link.url);
      if (!current) {
        continue;
      }

      if (shouldReplaceText(current.title, link.title)) {
        current.title = link.title;
      }
      if (shouldReplaceText(current.group, link.group)) {
        current.group = link.group;
      }
      current.tags = current.tags.map((tag) => (corruptionScore(tag) > 0 ? "导入" : tag));
      current.updatedAt = new Date().toISOString();
    }

    db.links.push(...nextLinks);
    const saved = await writeNavigationDb(db);

    return NextResponse.json({
      db: saved,
      imported: nextLinks.length,
      skipped: imported.length - nextLinks.length,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "导入书签失败" },
      { status: 400 },
    );
  }
}
