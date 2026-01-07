import Header from "@/components/Header";
import ProjectGrid from "@/components/ProjectGrid";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main>
      <Header />
      <ProjectGrid projects={projects} />
    </main>
  );
}
