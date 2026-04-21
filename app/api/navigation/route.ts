import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createLink,
  navigationDbSchema,
  normalizeLinksByBucket,
  normalizeOrder,
  readNavigationDb,
  writeNavigationDb,
  type NavLink,
  type NavigationWidget,
} from "@/lib/navigation-store";

export const runtime = "nodejs";

type PatchBody =
  | { action: "replace"; db: unknown }
  | { action: "add-link"; link: Omit<NavLink, "id" | "createdAt" | "updatedAt" | "order"> }
  | { action: "update-link"; link: NavLink }
  | { action: "delete-link"; id: string }
  | { action: "rename-group"; bucket: NavLink["bucket"]; oldGroup: string; newGroup: string }
  | { action: "move-link"; id: string; bucket: NavLink["bucket"] }
  | { action: "reorder-links"; ids: string[] }
  | { action: "layout-links"; items: Array<{ id: string; bucket: NavLink["bucket"]; order: number }> }
  | { action: "add-widget"; widget: Omit<NavigationWidget, "id" | "order"> }
  | { action: "delete-widget"; id: string }
  | { action: "reorder-widgets"; ids: string[] };

export async function GET() {
  try {
    return NextResponse.json(await readNavigationDb());
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "读取数据失败" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as PatchBody;
    const db = await readNavigationDb();

    if (body.action === "replace") {
      return NextResponse.json(await writeNavigationDb(navigationDbSchema.parse(body.db)));
    }

    if (body.action === "add-link") {
      const order = db.links.filter((link) => link.bucket === body.link.bucket).length;
      db.links.push(createLink({ ...body.link, order }));
    }

    if (body.action === "update-link") {
      db.links = db.links.map((link) =>
        link.id === body.link.id
          ? { ...body.link, updatedAt: new Date().toISOString() }
          : link,
      );
    }

    if (body.action === "delete-link") {
      db.links = db.links.filter((link) => link.id !== body.id);
    }

    if (body.action === "rename-group") {
      db.links = db.links.map((link) =>
        link.bucket === body.bucket && link.group === body.oldGroup
          ? { ...link, group: body.newGroup, updatedAt: new Date().toISOString() }
          : link,
      );
    }

    if (body.action === "move-link") {
      const targetOrder = db.links.filter((link) => link.bucket === body.bucket).length;
      db.links = db.links.map((link) =>
        link.id === body.id
          ? { ...link, bucket: body.bucket, order: targetOrder, updatedAt: new Date().toISOString() }
          : link,
      );
    }

    if (body.action === "reorder-links") {
      const orderMap = new Map(body.ids.map((id, order) => [id, order]));
      db.links = db.links.map((link) => ({
        ...link,
        order: orderMap.get(link.id) ?? link.order,
      }));
    }

    if (body.action === "layout-links") {
      const layoutMap = new Map(body.items.map((item) => [item.id, item]));
      db.links = db.links.map((link) => {
        const layout = layoutMap.get(link.id);
        return layout
          ? {
              ...link,
              bucket: layout.bucket,
              order: layout.order,
              updatedAt: new Date().toISOString(),
            }
          : link;
      });
    }

    if (body.action === "add-widget") {
      db.widgets.push({
        ...body.widget,
        id: randomUUID(),
        order: db.widgets.length,
      });
    }

    if (body.action === "delete-widget") {
      db.widgets = db.widgets.filter((widget) => widget.id !== body.id);
    }

    if (body.action === "reorder-widgets") {
      const orderMap = new Map(body.ids.map((id, order) => [id, order]));
      db.widgets = db.widgets.map((widget) => ({
        ...widget,
        order: orderMap.get(widget.id) ?? widget.order,
      }));
    }

    db.links = normalizeLinksByBucket(db.links);
    db.widgets = normalizeOrder(db.widgets);

    return NextResponse.json(await writeNavigationDb(db));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存数据失败" },
      { status: 400 },
    );
  }
}
