import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Project } from '@/data/projects';
import { cookies } from 'next/headers';

const getSupabaseClient = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  if (isAdmin) {
    return createAdminClient();
  }
  return createClient();
};

export const getProjects = async (): Promise<Project[]> => {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    imageUrl: row.image_url,
    link: row.link,
    details: row.details || {},
    galleryImages: row.gallery_images || [],
    isVisible: row.is_visible,
    type: row.details?.type,
    content: row.details?.content,
    videoId: row.details?.videoId,
    memoStyle: row.details?.memoStyle,
    descriptionBlocks: row.details?.descriptionBlocks,
    cardWidth: row.details?.cardWidth,
    cardHeight: row.details?.cardHeight,
    lockedAspectRatio: row.details?.lockedAspectRatio,
  }));
};

export const getProjectBySlug = async (slug: string): Promise<Project | null> => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching project by slug:', error);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    imageUrl: data.image_url,
    link: data.link,
    details: data.details || {},
    galleryImages: data.gallery_images || [],
    isVisible: data.is_visible,
    type: data.details?.type,
    content: data.details?.content,
    videoId: data.details?.videoId,
    memoStyle: data.details?.memoStyle,
    descriptionBlocks: data.details?.descriptionBlocks,
    cardWidth: data.details?.cardWidth,
    cardHeight: data.details?.cardHeight,
    lockedAspectRatio: data.details?.lockedAspectRatio,
  };
};

