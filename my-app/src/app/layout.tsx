import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalPulse 健康管理系统",
  description: "饮食、训练与健康评分管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
