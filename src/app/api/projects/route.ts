import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Project } from '@/data/projects';
import { cookies } from 'next/headers';

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  if (token?.value === 'authenticated') {
    return createAdminClient();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return supabase;
  
  return null;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  const isAdmin = token?.value === 'authenticated';

  let supabase;
  if (isAdmin) {
    supabase = createAdminClient();
  } else {
    supabase = await createClient();
  }

  let isAuth = isAdmin;
  if (!isAuth) {
    const { data: { user } } = await supabase.auth.getUser();
    isAuth = !!user;
  }

  let query = supabase
    .from('projects')
    .select('*')
    .order('display_order', { ascending: true });

  // Filter by visibility if not authenticated
  // If we are admin, we want to see everything, but 'adminMode' toggle in UI handles filtering too.
  // However, the API should return all projects if the user is an admin, regardless of 'adminMode' UI state.
  // The frontend will filter 'private' ones if adminMode is OFF.
  if (!isAuth) {
    query = query.neq('is_visible', 'private'); // Show public and team (if team logic exists) or just public?
    // Based on user request: "private mode hidden even for admin in production" -> this implies a bug in isAuth detection
    // Usually:
    // User (Anon): is_visible = 'public'
    // Admin: All
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform database format to frontend format
  const projects = (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    imageUrl: row.image_url,
    link: `/projet/${row.id}`,
    details: row.details || {},
    galleryImages: row.gallery_images || [],
    isVisible: row.is_visible,
    // Extract layout and content info from details
    cardWidth: row.details?.cardWidth,
    cardHeight: row.details?.cardHeight,
    lockedAspectRatio: row.details?.lockedAspectRatio,
    type: row.details?.type || 'project',
    videoId: row.details?.videoId,
    content: row.details?.content,
    memoStyle: row.details?.memoStyle,
    showId: row.details?.showId,
    showTitle: row.details?.showTitle,
    hasDetailLink: row.details?.hasDetailLink,
    descriptionBlocks: row.details?.descriptionBlocks || [],
  }));

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newProject: Project = await request.json();

  // Validation
  if (!newProject.id || !newProject.title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Auto-generate slug if not provided
  if (!newProject.slug) {
    // Simple slugify: lowercase, replace spaces with hyphens
    let slug = newProject.title.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Remove characters that might cause issues in URLs (slash, question mark, hash, etc)
    slug = slug.replace(/[#?&/\\%]/g, '');

    // If slug became empty (e.g. title was only symbols), fallback to ID
    if (!slug) {
        slug = newProject.id;
    }
    
    newProject.slug = slug;
  }

  // Always generate link from id (id-based routing)
  newProject.link = `/projet/${newProject.id}`;

  // Initialize empty details and galleryImages
  if (!newProject.details) {
    newProject.details = {
      year: new Date().getFullYear().toString(),
      location: "",
      client: "",
      mandataire: "",
      program: "",
      area: "",
      cost: "",
      mission: "",
      status: "",
      photographer: ""
    };
  }
  
  // Inject layout and content info into details for storage
  newProject.details = {
      ...newProject.details,
      cardWidth: newProject.cardWidth,
      cardHeight: newProject.cardHeight,
      lockedAspectRatio: newProject.lockedAspectRatio,
      type: newProject.type,
      videoId: newProject.videoId,
      // Only set content if it's provided (not undefined)
      ...(newProject.content !== undefined && { content: newProject.content }),
      memoStyle: newProject.memoStyle,
      showId: newProject.showId,
      showTitle: newProject.showTitle,
      hasDetailLink: newProject.hasDetailLink,
  } as any;

  if (!newProject.galleryImages) {
    newProject.galleryImages = [];
  }

  // Get the highest display_order
  const { data: maxOrderData } = await supabase
    .from('projects')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order + 1 : 0;

  // Insert into database
  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: newProject.id,
      title: newProject.title,
      slug: newProject.slug,
      image_url: newProject.imageUrl,
      link: newProject.link,
      details: newProject.details,
      gallery_images: newProject.galleryImages,
      is_visible: newProject.isVisible || 'public',
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform back to frontend format
  const savedProject = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    imageUrl: data.image_url,
    link: data.link,
    details: data.details,
    galleryImages: data.gallery_images,
    isVisible: data.is_visible,
    cardWidth: data.details?.cardWidth,
    cardHeight: data.details?.cardHeight,
    lockedAspectRatio: data.details?.lockedAspectRatio,
    type: data.details?.type || 'project',
    videoId: data.details?.videoId,
    content: data.details?.content,
    memoStyle: data.details?.memoStyle,
    showId: data.details?.showId,
    showTitle: data.details?.showTitle,
    hasDetailLink: data.details?.hasDetailLink,
    descriptionBlocks: data.details?.descriptionBlocks || [],
  };

  return NextResponse.json(savedProject);
}

export async function PUT(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Check if it's a reorder operation (array of projects)
  if (Array.isArray(body)) {
    // Batch update display orders
    const updates = body.map((project: Project, index: number) => ({
      id: project.id,
      display_order: index,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('projects')
        .update({ display_order: update.display_order })
        .eq('id', update.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  }

  // Single project update
  const { originalId, ...projectData } = body;
  const project: Project = projectData;
  const targetId = originalId || project.id;

  // Inject layout and content info into details for storage
  // Ensure we preserve existing details if any
  const detailsToSave = {
      ...(project.details || {}),
      cardWidth: project.cardWidth,
      cardHeight: project.cardHeight,
      lockedAspectRatio: project.lockedAspectRatio,
      type: project.type,
      videoId: project.videoId,
      // Only update content if it's provided (not undefined)
      ...(project.content !== undefined && { content: project.content }),
      memoStyle: project.memoStyle,
      descriptionBlocks: project.descriptionBlocks,
      showId: project.showId,
      showTitle: project.showTitle,
      hasDetailLink: project.hasDetailLink,
  };

  const { data, error } = await supabase
    .from('projects')
    .update({
      id: project.id,
      title: project.title,
      slug: project.slug,
      image_url: project.imageUrl,
      link: `/projet/${project.id}`,
      details: detailsToSave,
      gallery_images: project.galleryImages,
      is_visible: project.isVisible,
    })
    .eq('id', targetId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Transform back to frontend format
  const updatedProject = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    imageUrl: data.image_url,
    link: data.link,
    details: data.details,
    galleryImages: data.gallery_images,
    isVisible: data.is_visible,
    cardWidth: data.details?.cardWidth,
    cardHeight: data.details?.cardHeight,
    lockedAspectRatio: data.details?.lockedAspectRatio,
    type: data.details?.type || 'project',
    videoId: data.details?.videoId,
    content: data.details?.content,
    memoStyle: data.details?.memoStyle,
    showId: data.details?.showId,
    showTitle: data.details?.showTitle,
    hasDetailLink: data.details?.hasDetailLink,
    descriptionBlocks: data.details?.descriptionBlocks || [],
  };

  return NextResponse.json(updatedProject);
}

export async function DELETE(request: Request) {
  const supabase = await getAuthenticatedClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
