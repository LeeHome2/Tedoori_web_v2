import type { Metadata } from "next";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";
import { ProjectProvider } from "@/context/ProjectContext";

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
      <body>
        <AdminProvider>
          <ProjectProvider>
            {children}
          </ProjectProvider>
        </AdminProvider>
      </body>
    </html>
  );
}
