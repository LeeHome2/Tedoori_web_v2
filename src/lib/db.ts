import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Project } from '@/data/projects';
import { cookies } from 'next/headers';

const getSupabaseClient = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  if (isAdmin) {
    return await createAdminClient();
  }
  return await createClient();
};

export const getProjects = async (): Promise<Project[]> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  const supabase = await getSupabaseClient();

  let query = supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true });

  // If not admin, filter out private projects
  // But wait, RLS might handle this? 
  // If we use service role key (createAdminClient), RLS is bypassed.
  // If we use anon key (createClient), RLS is applied.
  // However, getSupabaseClient handles which client to return.
  // BUT, createAdminClient uses service role, so it sees EVERYTHING.
  // If we are admin, we want to see everything.
  // If we are NOT admin, we use createClient (anon), so RLS should hide private.
  // BUT, previously we had explicit filtering in code.
  // Let's bring back explicit filtering just in case RLS is not set up perfectly or we want to be sure.
  
  if (!isAdmin) {
      query = query.neq('is_visible', 'private');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  // ...

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    imageUrl: row.image_url,
    link: `/projet/${row.id}`,
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

export const getProjectById = async (id: string): Promise<Project | null> => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching project by id:', error);
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    imageUrl: data.image_url,
    link: `/projet/${data.id}`,
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

