import { NextResponse } from 'next/server';
import { getProjects, saveProjects } from '@/lib/db';
import { cookies } from 'next/headers';

// Middleware-like check for admin
async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  return token?.value === 'authenticated';
}

export async function GET() {
  const projects = getProjects();
  if (await isAdmin()) {
    return NextResponse.json(projects);
  }
  // Filter for non-admins: only return projects where isVisible is 'public' (or true/undefined for legacy)
  const visibleProjects = projects.filter(p => {
      if (p.isVisible === undefined || p.isVisible === true) return true;
      if (p.isVisible === 'public') return true;
      return false;
  });
  return NextResponse.json(visibleProjects);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const newProject = await request.json();
  const projects = getProjects();
  
  // Basic validation
  if (!newProject.id || !newProject.title) {
     return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Auto-generate slug if not provided
  if (!newProject.slug) {
      newProject.slug = newProject.title.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // Auto-generate link if not provided
  if (!newProject.link || newProject.link === '#') {
      newProject.link = `/projet/${newProject.slug}`;
  }

  // Initialize empty details and galleryImages for the new page
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
  if (!newProject.galleryImages) {
      newProject.galleryImages = [];
  }

  // Add to beginning
  projects.unshift(newProject);
  
  if (saveProjects(projects)) {
    return NextResponse.json(newProject);
  } else {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  
  // Check if it's a reorder operation (array of projects) or single update
  if (Array.isArray(body)) {
      if (saveProjects(body)) {
          return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }

  // Single update
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === body.id);
  
  if (index === -1) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  projects[index] = { ...projects[index], ...body };
  
  if (saveProjects(projects)) {
    return NextResponse.json(projects[index]);
  } else {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  }

  const projects = getProjects();
  const filteredProjects = projects.filter(p => p.id !== id);

  if (projects.length === filteredProjects.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  if (saveProjects(filteredProjects)) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
