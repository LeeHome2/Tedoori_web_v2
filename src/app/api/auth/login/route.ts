import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  const cookieStore = await cookies();
  const setAdminCookie = () => {
    cookieStore.set('admin_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
      sameSite: 'lax', // Important for cross-site if domains differ slightly, but lax is safe default
    });
  };

  // 1. Simple hardcoded check
  if (username === 'admin' && password === 'admin') {
    setAdminCookie();
    return NextResponse.json({ success: true });
  }

  // 2. Fallback to Supabase Auth
  try {
    const supabase = await createClient();
    // Treat username as email for Supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (!error && data.user) {
      setAdminCookie(); // Set simple auth cookie for compatibility
      return NextResponse.json({ success: true });
    }
  } catch (e) {
    // Ignore supabase errors and return generic invalid credentials
    console.error("Supabase login attempt failed:", e);
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
