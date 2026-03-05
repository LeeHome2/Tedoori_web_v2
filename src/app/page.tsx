import HomeClient from "@/components/HomeClient";
import { createAdminClient } from "@/lib/supabase/server";

// Aggressive caching with ISR for better performance
export const revalidate = 30; // Revalidate every 30 seconds (reduced from 60)

export default async function Home() {
  // Fetch projects on the server with optimized query
  const supabase = createAdminClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, slug, imageUrl, link, showId, showTitle, hasDetailLink, type, videoId, content, memoStyle, isVisible, cardWidth, cardHeight, lockedAspectRatio, order')
    .order('order', { ascending: true })
    .limit(100); // Reasonable limit for initial load

  return <HomeClient initialProjects={projects || []} />;
}
