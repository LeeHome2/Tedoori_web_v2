import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
    const { title, content, date } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('news')
      .insert([{ title, content: content || '', date }])
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
          .from('news')
          .update({ order_index: item.order_index })
          .eq('id', item.id)
      );

      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    // Single item update
    const { id, title, content, date } = body;

    if (!id || !title || !date) {
      return NextResponse.json({ error: 'ID, title and date are required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('news')
      .update({ title, content: content || '', date })
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
      .from('news')
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
