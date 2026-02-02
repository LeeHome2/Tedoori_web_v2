import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  return token?.value === 'authenticated';
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validation
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = Date.now() + '-' + file.name.replace(/\s/g, '-');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const filepath = path.join(uploadDir, filename);

  try {
    // Ensure directory exists
    const fs = await import('fs/promises');
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true });
    }

    await writeFile(filepath, buffer);
    return NextResponse.json({ 
        url: `/uploads/${filename}`,
        width: 1200, // Mock dimensions for now, or use a library to get real dims
        height: 800
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
}
