import { NextResponse } from "next/server";
import { createLink, linkBucketSchema, readNavigationDb, writeNavigationDb } from "@/lib/navigation-store";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: unknown;
      url?: unknown;
      group?: unknown;
      tags?: unknown;
      bucket?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const group = typeof body.group === "string" && body.group.trim() ? body.group.trim() : "导入";
    const tags =
      Array.isArray(body.tags)
        ? body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
        : typeof body.tags === "string"
          ? body.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : ["导入"];
    const bucket = linkBucketSchema.catch("watching").parse(body.bucket);

    if (!title || !url) {
      return json({ message: "缺少标题或 URL" }, { status: 400 });
    }

    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return json({ message: "仅支持 http/https 链接" }, { status: 400 });
    }

    const db = await readNavigationDb();
    const exists = db.links.some((link) => link.url === parsedUrl.toString());

    if (!exists) {
      db.links.push(
        createLink({
          title,
          url: parsedUrl.toString(),
          bucket,
          group,
          tags: tags.length > 0 ? tags : ["导入"],
          order: db.links.filter((link) => link.bucket === bucket).length,
        }),
      );
      await writeNavigationDb(db);
    }

    return json({ ok: true, exists });
  } catch (error) {
    return json(
      { message: error instanceof Error ? error.message : "收藏失败" },
      { status: 400 },
    );
  }
}
