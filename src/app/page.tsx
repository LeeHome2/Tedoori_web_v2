import HomeClient from "@/components/HomeClient";
import { createAdminClient } from "@/lib/supabase/server";
import type { ProjectRow } from "@/types/database";
import type { Project } from "@/data/projects";

// ISR: 캐시 60초, 백그라운드에서 재검증
// 관리자 수정 시 revalidatePath로 즉시 갱신 가능
export const revalidate = 60;

export default async function Home() {
  // Fetch projects on the server with optimized query
  const supabase = createAdminClient();

  let projects: Project[] = [];

  try {
    // 홈페이지용 최적화: gallery_images 제외 (Egress 절감)
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, slug, image_url, is_visible, display_order, details')
      .order('display_order', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching projects:', error);
    } else if (data) {
      // Transform database format to frontend format
      projects = (data || []).map((row: Omit<ProjectRow, 'gallery_images'>): Project => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        imageUrl: row.image_url,
        link: `/projet/${row.id}`,
        galleryImages: [], // 홈페이지에서는 사용하지 않음
        isVisible: row.is_visible,
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
    }
  } catch (error) {
    console.error('Failed to fetch projects:', error);
  }

  return <HomeClient initialProjects={projects} />;
}
