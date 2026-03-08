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
  title: "Tedoori Architects",
  description: "테두리 건축사사무소는 공간의 본질을 탐구하며 건축, 인테리어, 도시설계 프로젝트를 수행합니다. Tedoori architectes creates meaningful spaces through architecture, interior design, and urban planning.",
  keywords: ["테두리", "테두리 건축", "테두리 건축사사무소", "건축사사무소", "건축", "인테리어", "도시설계", "Tedoori", "architectes", "architecture"],
  authors: [{ name: "Tedoori" }],
  creator: "Tedoori",
  publisher: "Tedoori",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Tedoori Architects",
    description: "테두리 건축사사무소는 공간의 본질을 탐구하며 건축, 인테리어, 도시설계 프로젝트를 수행합니다.",
    url: "https://tedoori.net",
    siteName: "Tedoori",
    locale: "ko_KR",
    type: "website",
  },
  icons: {
    icon: '/favicon.png',
  },
  metadataBase: new URL('https://tedoori.net'),
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
