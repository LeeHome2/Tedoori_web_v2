import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

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

  // Validation: File type check
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Validation: File extension whitelist
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!validExtensions.includes(fileExtension)) {
    return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
  }

  // Validation: File size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validation: Check file magic bytes (first few bytes to verify actual file type)
    const magicBytes = buffer.slice(0, 4).toString('hex');
    const validMagicBytes: { [key: string]: string[] } = {
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
      'image/png': ['89504e47'],
      'image/gif': ['47494638'],
      'image/webp': ['52494646'] // RIFF header
    };

    const isValidMagicByte = validMagicBytes[file.type]?.some(magic =>
      magicBytes.startsWith(magic)
    );

    if (!isValidMagicByte) {
      return NextResponse.json({ error: 'File content does not match declared type' }, { status: 400 });
    }

    // Generate secure filename using timestamp and random string
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `${Date.now()}-${randomStr}${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      // Try to create bucket if it doesn't exist (only for admin client)
      if (error.message.includes('Bucket not found')) {
           const { error: bucketError } = await supabase.storage.createBucket('project-images', {
               public: true,
               allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
               fileSizeLimit: 10485760
           });
           if (!bucketError) {
               // Retry upload
               const { error: retryError } = await supabase.storage
                   .from('project-images')
                   .upload(filename, buffer, {
                       contentType: file.type,
                       upsert: false
                   });
               
               if (retryError) {
                   return NextResponse.json({ error: `Upload failed: ${retryError.message}` }, { status: 500 });
               }
           } else {
               return NextResponse.json({ error: 'Storage bucket not found and creation failed' }, { status: 500 });
           }
      } else {
          return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-images')
      .getPublicUrl(filename);

    return NextResponse.json({
      url: publicUrl,
      width: 1200,
      height: 800
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
