"use client";

import { useEffect, useState } from "react";
import type { NavigationWidget } from "@/lib/navigation-store";

function ClockWidget() {
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setDate(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-4xl font-semibold text-stone-950 dark:text-white">
        {date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-300">
        {date.toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </p>
    </div>
  );
}

export function WidgetBody({ widget }: { widget: NavigationWidget }) {
  if (widget.type === "clock") {
    return <ClockWidget />;
  }

  if (widget.type === "notes") {
    return (
      <pre className="min-h-28 whitespace-pre-wrap rounded-lg border border-black/10 bg-white/60 p-3 font-sans text-sm leading-6 text-stone-700 dark:border-white/10 dark:bg-white/10 dark:text-stone-200">
        {String(widget.props.markdown ?? "暂无便签")}
      </pre>
    );
  }

  if (widget.type === "trello") {
    const boardUrl = String(widget.props.url ?? "");
    return boardUrl ? (
      <iframe
        title={widget.title}
        src={boardUrl}
        className="h-48 w-full rounded-lg border border-black/10 bg-white dark:border-white/10"
      />
    ) : (
      <p className="text-sm text-stone-600 dark:text-stone-300">添加 Trello 看板链接后即可嵌入。</p>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const query = String(data.get("q") ?? "").trim();
        if (query) {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
        }
      }}
    >
      <input
        name="q"
        className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2 dark:border-white/10 dark:bg-white/10"
        placeholder="搜索网页"
      />
      <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
        搜索
      </button>
    </form>
  );
}
