import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');
  
  if (token?.value === 'authenticated') {
    return NextResponse.json({ isAdmin: true });
  }
  
  return NextResponse.json({ isAdmin: false }, { status: 401 });
}
