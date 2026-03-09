import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');

  console.log('[Auth Check] Cookie value:', token?.value || 'none');
  console.log('[Auth Check] All cookies:', cookieStore.getAll().map(c => c.name));

  if (token?.value === 'authenticated') {
    console.log('[Auth Check] Authenticated - returning isAdmin: true');
    return NextResponse.json({ isAdmin: true });
  }

  console.log('[Auth Check] Not authenticated - returning isAdmin: false');
  return NextResponse.json({ isAdmin: false }, { status: 401 });
}
