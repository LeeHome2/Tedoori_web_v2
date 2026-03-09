import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface AboutBlock {
  id: string;
  type: 'text' | 'image' | 'map';
  content: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
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
  const { data, error } = await supabase
    .from('about_blocks')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching about blocks:', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const block: AboutBlock = await request.json();

    // Get max order_index
    const { data: maxData } = await supabase
      .from('about_blocks')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = maxData && maxData.length > 0 ? maxData[0].order_index + 1 : 0;

    const { data, error } = await supabase
      .from('about_blocks')
      .insert({
        id: block.id,
        type: block.type,
        content: block.content || '',
        order_index: nextOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to create block:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Batch update for reordering
    if (Array.isArray(body)) {
      const updates = body.map(item =>
        supabase
          .from('about_blocks')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      );

      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    // Single block update - use upsert
    const block: AboutBlock = body;
    const { data, error } = await supabase
      .from('about_blocks')
      .upsert({
        id: block.id,
        type: block.type,
        content: block.content,
        order_index: block.order_index,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to update block:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      .from('about_blocks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete block:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
