import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "期限付きセミナー動画LP",
  description: "期限付きセミナー動画LPの静的デザイン確認版",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
