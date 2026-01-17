import { createClient } from '@/lib/supabase/server';
import { Project } from '@/data/projects';

export const getProjects = async (): Promise<Project[]> => {
  const supabase = await createClient();
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
  }));
};

export const getProjectBySlug = async (slug: string): Promise<Project | null> => {
  const supabase = await createClient();
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
  };
};

