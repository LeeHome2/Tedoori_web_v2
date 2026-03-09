import HomeClient from "@/components/HomeClient";
import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import type { ProjectRow } from "@/types/database";
import type { Project } from "@/data/projects";

// Note: Caching is conditionally disabled for admin users to ensure fresh data
// For regular users, ISR provides better performance
export const revalidate = 60; // Reduced to 1 minute for faster updates
export const dynamicParams = true;

export default async function Home() {
  // Check if user is admin - if so, fetch fresh data
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token');
  const isAdmin = adminToken?.value === 'authenticated';

  // Fetch projects on the server with optimized query
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('display_order', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching projects:', error);
      return <HomeClient initialProjects={[]} />;
    }

    // Transform database format to frontend format (same as API route)
    const projects = (data || []).map((row: ProjectRow): Project => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      imageUrl: row.image_url,
      link: `/projet/${row.id}`,
      galleryImages: (row.gallery_images || []) as any,
      isVisible: row.is_visible,
      // Extract layout and content info from details JSONB
      cardWidth: row.details?.cardWidth,
      cardHeight: row.details?.cardHeight,
      lockedAspectRatio: row.details?.lockedAspectRatio,
      galleryWidthRatio: row.details?.galleryWidthRatio,
      type: row.details?.type || 'project',
      videoId: row.details?.videoId,
      content: row.details?.content,
      memoStyle: row.details?.memoStyle,
      showId: row.details?.showId !== undefined ? row.details.showId : true,
      showTitle: row.details?.showTitle !== undefined ? row.details.showTitle : true,
      hasDetailLink: row.details?.hasDetailLink !== undefined ? row.details.hasDetailLink : true,
      descriptionBlocks: row.details?.descriptionBlocks || [],
    }) as Project);

    return <HomeClient initialProjects={projects} />;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return <HomeClient initialProjects={[]} />;
  }
}
