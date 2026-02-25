"use client";

import Header from "@/components/Header";
import ProjectGrid from "@/components/ProjectGrid";
import BackToTop from "@/components/BackToTop";
import { ProjectProvider } from "@/context/ProjectContext";
import { Project } from "@/data/projects";

interface HomeClientProps {
  initialProjects: Project[];
}

export default function HomeClient({ initialProjects }: HomeClientProps) {
  return (
    <ProjectProvider initialProjects={initialProjects}>
      <main>
        <Header />
        <ProjectGrid />
        <BackToTop />
      </main>
    </ProjectProvider>
  );
}
