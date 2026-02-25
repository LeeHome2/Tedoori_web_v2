import { notFound } from "next/navigation";
import { getProjectById, getProjects } from "@/lib/db";
import ProjetClient from "@/components/ProjetClient";

export const revalidate = 60;

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

  if (!project || project.type === 'memo' || project.type === 'video' || project.hasDetailLink === false) {
    notFound();
  }

  const isValidProject = (p: any) => {
    // Skip memo and video types
    if (p.type === 'memo' || p.type === 'video') return false;

    // Skip if it has a videoId (YouTube page)
    if (p.videoId || p.details?.videoId) return false;

    // Skip if detail link is disabled
    if (p.hasDetailLink === false) return false;

    // Check for content
    const hasGallery = p.galleryImages && p.galleryImages.length > 0;
    const hasDescription = (p.content && p.content.trim() !== '') || 
                           (p.descriptionBlocks && p.descriptionBlocks.length > 0) ||
                           (p.details && p.details.content_html && p.details.content_html.trim() !== '');

    // If it has no gallery and no description content, consider it empty and skip
    if (!hasGallery && !hasDescription) return false;

    return true;
  };

  const getPrevProject = (currentIndex: number, allProjects: any[]) => {
    let index = currentIndex - 1;
    while (true) {
      if (index < 0) index = allProjects.length - 1;
      if (index === currentIndex) return null;
      const p = allProjects[index];
      if (isValidProject(p)) return p;
      index--;
    }
  };

  const getNextProject = (currentIndex: number, allProjects: any[]) => {
    let index = currentIndex + 1;
    while (true) {
      if (index >= allProjects.length) index = 0;
      if (index === currentIndex) return null;
      const p = allProjects[index];
      if (isValidProject(p)) return p;
      index++;
    }
  };

  const prevProject = projectIndex !== -1 ? getPrevProject(projectIndex, projects) : null;
  const nextProject = projectIndex !== -1 ? getNextProject(projectIndex, projects) : null;

  return (
    <ProjetClient
      initialProjects={projects}
      currentProject={project}
      prevProject={prevProject}
      nextProject={nextProject}
    />
  );
}
