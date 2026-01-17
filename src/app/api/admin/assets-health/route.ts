import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  return token?.value === 'authenticated';
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, title, image_url, gallery_images, is_visible, updated_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projects = data || [];
  const missingCover = [];
  const missingGallery = [];
  const invalidGalleryItems = [];

  for (const p of projects) {
    if (!p.image_url) {
      missingCover.push({ id: p.id, slug: p.slug, title: p.title });
    }

    const gallery = Array.isArray(p.gallery_images) ? p.gallery_images : [];
    if (gallery.length === 0) {
      missingGallery.push({ id: p.id, slug: p.slug, title: p.title });
    } else {
      for (const item of gallery) {
        if (!item || item.type !== 'image' || !item.src) {
          invalidGalleryItems.push({ id: p.id, slug: p.slug, title: p.title });
          break;
        }
      }
    }
  }

  return NextResponse.json({
    totals: {
      projects: projects.length,
      missingCover: missingCover.length,
      missingGallery: missingGallery.length,
      invalidGalleryItems: invalidGalleryItems.length,
    },
    missingCover,
    missingGallery,
    invalidGalleryItems,
  });
}

