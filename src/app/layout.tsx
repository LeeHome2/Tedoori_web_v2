import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "700"], // Added 300 for body font-weight
  variable: "--font-noto-sans-kr",
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  fallback: ['Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
});

export const metadata: Metadata = {
  title: "Tedoori - architectes",
  description: "Tedoori - architectes",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="dns-prefetch" href="https://iieabdeguunlnvqyhrwm.supabase.co" />
        <link rel="preconnect" href="https://iieabdeguunlnvqyhrwm.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className={notoSansKr.className}>
        <AdminProvider>
          {children}
        </AdminProvider>
      </body>
    </html>
  );
}
