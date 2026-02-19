import { notFound } from "next/navigation";
import { getProjectById, getProjects } from "@/lib/db";
import ProjectDetailHeader from "@/components/ProjectDetailHeader";
import ProjectDetail from "@/components/ProjectDetail";

export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const projects = await getProjects();
  const projectIndex = projects.findIndex((p) => p.id === decodedId);

  let project = projects[projectIndex];

  if (!project) {
    const directProject = await getProjectById(decodedId);
    if (directProject) {
      project = directProject;
    }
  }

  if (!project || project.type === 'memo' || project.type === 'video') {
    notFound();
  }

  const getPrevProject = (currentIndex: number, allProjects: any[]) => {
    let index = currentIndex - 1;
    while (true) {
      if (index < 0) index = allProjects.length - 1;
      if (index === currentIndex) return null;
      const p = allProjects[index];
      if (p.type !== 'memo' && p.type !== 'video') return p;
      index--;
    }
  };

  const getNextProject = (currentIndex: number, allProjects: any[]) => {
    let index = currentIndex + 1;
    while (true) {
      if (index >= allProjects.length) index = 0;
      if (index === currentIndex) return null;
      const p = allProjects[index];
      if (p.type !== 'memo' && p.type !== 'video') return p;
      index++;
    }
  };

  const prevProject = projectIndex !== -1 ? getPrevProject(projectIndex, projects) : null;
  const nextProject = projectIndex !== -1 ? getNextProject(projectIndex, projects) : null;

  return (
    <main>
      <ProjectDetailHeader
        currentProject={project}
        prevProject={prevProject}
        nextProject={nextProject}
      />
      <ProjectDetail project={project} />
    </main>
  );
}
