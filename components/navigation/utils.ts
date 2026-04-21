import type { LinkBucket, NavLink } from "@/lib/navigation-store";
import { groupColorStyles } from "./constants";

export type BucketGroups = Array<{ group: string; links: NavLink[] }>;

const groupPrefix = "group:";

export function bucketDropId(bucket: LinkBucket) {
  return `bucket:${bucket}`;
}

export function groupKey(bucket: LinkBucket, group: string) {
  return `${bucket}:${group}`;
}

export function groupSortId(bucket: LinkBucket, group: string) {
  return `${groupPrefix}${bucket}:${encodeURIComponent(group)}`;
}

export function parseGroupSortId(id: string): { bucket: LinkBucket; group: string } | null {
  if (!id.startsWith(groupPrefix)) {
    return null;
  }

  const rest = id.slice(groupPrefix.length);
  const separator = rest.indexOf(":");
  if (separator < 0) {
    return null;
  }

  const bucket = rest.slice(0, separator) as LinkBucket;
  if (!["favorites", "watching", "later"].includes(bucket)) {
    return null;
  }

  return {
    bucket,
    group: decodeURIComponent(rest.slice(separator + 1)),
  };
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function groupColor(group: string) {
  return groupColorStyles[hashText(group) % groupColorStyles.length];
}

export function displayText(value: string) {
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

export function groupLinks(links: NavLink[]): BucketGroups {
  const map = new Map<string, NavLink[]>();
  for (const link of links) {
    const list = map.get(link.group) ?? [];
    list.push(link);
    map.set(link.group, list);
  }

  return Array.from(map.entries())
    .map(([group, groupLinks]) => ({
      group,
      links: groupLinks.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => {
      const aOrder = a.links[0]?.order ?? 0;
      const bOrder = b.links[0]?.order ?? 0;
      return aOrder - bOrder || a.group.localeCompare(b.group, "zh-CN");
    });
}
