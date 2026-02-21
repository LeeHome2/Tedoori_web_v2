import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";
import { ProjectProvider } from "@/context/ProjectContext";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"], // 300 is Light
  variable: "--font-noto-sans-kr",
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
          <ProjectProvider>
            {children}
          </ProjectProvider>
        </AdminProvider>
      </body>
    </html>
  );
}
