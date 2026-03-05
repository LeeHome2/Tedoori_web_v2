import HomeClient from "@/components/HomeClient";
import { createAdminClient } from "@/lib/supabase/server";

// Aggressive caching with ISR for better performance
export const revalidate = 300; // Cache for 5 minutes
export const dynamic = 'force-static';
export const dynamicParams = true;
export const fetchCache = 'force-cache';

export default async function Home() {
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
    const projects = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      imageUrl: row.image_url,
      link: `/projet/${row.id}`,
      details: row.details || {},
      galleryImages: row.gallery_images || [],
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
      order: row.display_order,
    }));

    return <HomeClient initialProjects={projects} />;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return <HomeClient initialProjects={[]} />;
  }
}
