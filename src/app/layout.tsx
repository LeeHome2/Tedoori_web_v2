import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "700"], // Reduced font weights for faster loading
  variable: "--font-noto-sans-kr",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Tedoori - architectes",
  description: "Tedoori - architectes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={notoSansKr.className}>
        <AdminProvider>
          {children}
        </AdminProvider>
      </body>
    </html>
  );
}
