
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const updateSchema = z.object({
  section: z.string(),
  content: z.string().max(1000, "Content exceeds 1000 characters"),
});

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('about_content')
    .select('section, content');

  if (error) {
    // If table doesn't exist yet, return empty or defaults
    return NextResponse.json({});
  }

  // Transform array to object for easier frontend consumption
  const contentMap = data.reduce((acc: any, item: any) => {
    acc[item.section] = item.content;
    return acc;
  }, {});

  return NextResponse.json(contentMap);
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
    const result = updateSchema.safeParse(body);
    
    if (!result.success) {
        return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { section, content } = result.data;

    // Use Admin Client to bypass RLS and ensure update
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('about_content')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('section', section);

    if (error) {
        // If row doesn't exist, try insert (upsert)
        const { error: insertError } = await supabase
            .from('about_content')
            .upsert({ section, content, updated_at: new Date().toISOString() }, { onConflict: 'section' });
            
        if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}
