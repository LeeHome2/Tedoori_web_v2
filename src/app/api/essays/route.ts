import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Disable all caching for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('essays')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  return response;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, date, fontFamily } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('essays')
      .insert([{ title, content: content || '', date, font_family: fontFamily || 'sans' }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Batch update for reordering
    if (Array.isArray(body)) {
      const supabase = createAdminClient();
      const updates = body.map(item =>
        supabase
          .from('essays')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      );

      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    // Single item update
    const { id, title, content, date, fontFamily } = body;

    if (!id || !title || !date) {
      return NextResponse.json({ error: 'ID, title and date are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('essays')
      .update({ title, content: content || '', date, font_family: fontFamily || 'sans' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('essays')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
