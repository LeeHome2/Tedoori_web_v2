import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// 60초 캐싱, 수정 시 revalidatePath로 즉시 갱신
export const revalidate = 60;

export interface GalleryImage {
  id: string;
  url: string;
  width?: number;   // pixels
  height?: number;  // pixels
  order_index: number;
}

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  if (token?.value === 'authenticated') {
    return createAdminClient();
  }
  return null;
}

export async function GET() {
  const supabase = await createClient();

  // Get gallery data from about_gallery table
  const { data, error } = await supabase
    .from('about_gallery')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    // Table might not exist yet, return empty array
    console.error('Error fetching about gallery:', error);
    return NextResponse.json([]);
  }

  const response = NextResponse.json(data || []);
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

export async function POST(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const image: GalleryImage = await request.json();

    // Get max order_index
    const { data: maxData } = await supabase
      .from('about_gallery')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = maxData && maxData.length > 0 ? maxData[0].order_index + 1 : 0;

    const { data, error } = await supabase
      .from('about_gallery')
      .insert({
        id: image.id || `img-${Date.now()}`,
        url: image.url,
        width: image.width || 400,
        height: image.height || 300,
        order_index: nextOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/about');
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Failed to add gallery image:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Batch update for reordering or size changes
    if (Array.isArray(body)) {
      const updatePromises = body.map(async (item: GalleryImage) => {
        const { error } = await supabase
          .from('about_gallery')
          .update({
            order_index: item.order_index,
            width: item.width,
            height: item.height,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (error) throw error;
      });

      await Promise.all(updatePromises);
      revalidatePath('/about');
      return NextResponse.json({ success: true });
    }

    // Single image update
    const image: GalleryImage = body;
    const { data, error } = await supabase
      .from('about_gallery')
      .update({
        url: image.url,
        width: image.width,
        height: image.height,
        order_index: image.order_index,
        updated_at: new Date().toISOString()
      })
      .eq('id', image.id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/about');
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Failed to update gallery image:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('about_gallery')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/about');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete gallery image:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
