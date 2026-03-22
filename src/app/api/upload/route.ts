import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

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
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validation: Check file magic bytes (first few bytes to verify actual file type)
    const magicBytes = buffer.slice(0, 4).toString('hex');
    const validMagicBytes: { [key: string]: string[] } = {
      'image/jpeg': ['ffd8ff'],
      'image/png': ['89504e47'],
      'image/gif': ['47494638'],
      'image/webp': ['52494646'] // RIFF header
    };

    const isValidMagicByte = validMagicBytes[file.type]?.some(magic =>
      magicBytes.startsWith(magic)
    );

    if (!isValidMagicByte) {
      return NextResponse.json({ error: 'Invalid file: content does not match type' }, { status: 400 });
    }

    // Generate secure filename using timestamp and random string
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `${Date.now()}-${randomStr}${fileExtension}`;

    // Upload to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    });

    await r2Client.send(command);

    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;

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
