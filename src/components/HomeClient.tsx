"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import ProjectGrid from "@/components/ProjectGrid";
import BackToTop from "@/components/BackToTop";
import { ProjectProvider, useProjects } from "@/context/ProjectContext";
import { Project } from "@/data/projects";
import { useAdmin } from "@/context/AdminContext";

interface HomeClientProps {
  initialProjects: Project[];
}

function HomeContent() {
  const { adminMode } = useAdmin();
  const { refreshProjects } = useProjects();

  // Refresh projects when admin mode is enabled to bypass cache
  useEffect(() => {
    if (adminMode) {
      refreshProjects();
    }
  }, [adminMode, refreshProjects]);

  return (
    <main>
      <Header />
      <ProjectGrid />
      <BackToTop />
    </main>
  );
}

export default function HomeClient({ initialProjects }: HomeClientProps) {
  return (
    <ProjectProvider initialProjects={initialProjects}>
      <HomeContent />
    </ProjectProvider>
  );
}
