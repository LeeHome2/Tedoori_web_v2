"use client";

import Header from "@/components/Header";
import ProjectDetail from "@/components/ProjectDetail";
import { ProjectProvider } from "@/context/ProjectContext";
import { Project } from "@/data/projects";

interface ProjetClientProps {
  initialProjects: Project[];
  currentProject: Project;
  prevProject: Project | null;
  nextProject: Project | null;
}

export default function ProjetClient({
  initialProjects,
  currentProject,
  prevProject,
  nextProject
}: ProjetClientProps) {
  return (
    <ProjectProvider initialProjects={initialProjects}>
      <main>
        <Header />
        <ProjectDetail
          project={currentProject}
          prevProject={prevProject}
          nextProject={nextProject}
        />
      </main>
    </ProjectProvider>
  );
}
