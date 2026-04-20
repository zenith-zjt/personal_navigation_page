import type { LinkBucket, NavLink } from "./navigation-store";
import { createLink } from "./navigation-store";

type ParsedBookmark = {
  title: string;
  url: string;
  group: string;
};

const entityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

function decodeHtml(input: string) {
  return input.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return entityMap[entity.toLowerCase()] ?? match;
  });
}

function extractAttr(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i"));
  if (!match) {
    return "";
  }

  return match[1].replace(/^["']|["']$/g, "");
}

function stripTags(input: string) {
  return decodeHtml(input.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

export function parseNetscapeBookmarks(
  html: string,
  bucket: LinkBucket = "favorites",
): NavLink[] {
  const tokenRegex = /<DT>\s*<H3[^>]*>([\s\S]*?)<\/H3>|<A\s+([^>]*?)>([\s\S]*?)<\/A>|<\/DL>/gi;
  const stack: string[] = [];
  const bookmarks: ParsedBookmark[] = [];
  let pendingFolder = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(html)) !== null) {
    if (match[1] !== undefined) {
      pendingFolder = stripTags(match[1]) || "未分组";
      stack.push(pendingFolder);
      continue;
    }

    if (match[2] !== undefined) {
      const url = decodeHtml(extractAttr(match[2], "href")).trim();
      const title = stripTags(match[3]) || url;

      if (url.startsWith("http://") || url.startsWith("https://")) {
        bookmarks.push({
          title,
          url,
          group: stack.at(-1) || pendingFolder || "导入书签",
        });
      }

      continue;
    }

    if (stack.length > 0) {
      stack.pop();
    }
  }

  const seen = new Set<string>();
  return bookmarks
    .filter((bookmark) => {
      if (seen.has(bookmark.url)) {
        return false;
      }

      seen.add(bookmark.url);
      return true;
    })
    .map((bookmark, order) =>
      createLink({
        ...bookmark,
        bucket,
        tags: ["imported"],
        order,
      }),
    );
}
