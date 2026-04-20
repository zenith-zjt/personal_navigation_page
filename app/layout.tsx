import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "个人导航页",
  description: "支持书签导入、链接管理和组件面板的个人导航应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
