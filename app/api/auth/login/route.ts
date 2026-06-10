import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';

const ADMIN_USERNAME = process.env.LOGIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.LOGIN_PASSWORD || 'admin123';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    if (username.trim() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // Create session (expires in 7 days)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const sessionToken = await signSession({ username: ADMIN_USERNAME, expiresAt });

    const response = NextResponse.json({ success: true });
    
    // Set session token in cookie
    response.cookies.set({
      name: 'session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(expiresAt),
    });

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
