import { notFound } from "next/navigation";
import { getProjects } from "@/lib/db";
import ProjectDetailHeader from "@/components/ProjectDetailHeader";
import ProjectDetail from "@/components/ProjectDetail";

export const revalidate = 0;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const projects = await getProjects();
  const projectIndex = projects.findIndex((p) => p.slug === slug);
  const project = projects[projectIndex];

  if (!project || project.type === 'memo') {
    notFound();
  }

  const prevProject = projects[projectIndex - 1] || projects[projects.length - 1];
  const nextProject = projects[projectIndex + 1] || projects[0];

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
