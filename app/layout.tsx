import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carbay Motors",
  description: "Güvenilir İkinci Elin Adresi",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",       // Tarayıcı sekmesi için
    shortcut: "/icon.png",
    apple: "/icon.png",      // iPhone ana ekranı için
  },
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}