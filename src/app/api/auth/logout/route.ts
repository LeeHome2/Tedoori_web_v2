import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();

  // Check if cookie exists before deletion
  const existingCookie = cookieStore.get('admin_token');
  console.log('[Logout] Cookie before deletion:', existingCookie?.value);

  // Delete cookie with explicit options matching the set options
  cookieStore.set('admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0, // Expire immediately
    path: '/',
    sameSite: 'lax',
  });

  // Also try to delete without options as a fallback
  cookieStore.delete('admin_token');

  console.log('[Logout] Cookie deleted');

  return NextResponse.json({ success: true });
}
