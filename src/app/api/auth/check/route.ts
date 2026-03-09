import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');

  console.log('[Auth Check] Cookie value:', token?.value || 'none');
  console.log('[Auth Check] All cookies:', cookieStore.getAll().map(c => c.name));

  const response = token?.value === 'authenticated'
    ? NextResponse.json({ isAdmin: true })
    : NextResponse.json({ isAdmin: false }, { status: 401 });

  // Add cache control headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  console.log('[Auth Check] Returning isAdmin:', token?.value === 'authenticated');
  return response;
}
