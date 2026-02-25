import HomeClient from "@/components/HomeClient";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 60; // Cache for 60 seconds

export default async function Home() {
  // Fetch projects on the server
  const supabase = createAdminClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('order', { ascending: true });

  return <HomeClient initialProjects={projects || []} />;
}
