import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';

const DEFAULT_USERS = [
  { name: '김영수', username: 'yskim', password: '1122' },
  { name: '정우진', username: 'wjo334', password: '3344' },
  { name: '이태호', username: 'dlxogh88', password: '8899' },
  { name: '정일구', username: 'ikchung', password: '2233' },
  { name: '김태용', username: 'kty6808', password: '6688' },
  { name: '김선용', username: 'sunyong1994', password: '1122' },
  { name: '김세용', username: 'Seyong15', password: '1122' },
  { name: '이주희', username: 'jhlee', password: '7788' },
  { name: '양진호', username: 'jhyang', password: '9900' },
  { name: '김윤수', username: 'rladbstn3', password: '5566' },
  { name: '이강식', username: 'kslee', password: '7788' },
  { name: '박천준', username: 'cjpark', password: '8899' },
  { name: '함수빈', username: 'sbham', password: '6677' },
  { name: '정명호', username: 'mhjung', password: '9988' }
];

function getUsers() {
  const envUsers = process.env.USER_CREDENTIALS;
  if (envUsers) {
    try {
      return JSON.parse(envUsers);
    } catch (e) {
      console.error('Failed to parse USER_CREDENTIALS env variable:', e);
    }
  }
  return DEFAULT_USERS;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const users = getUsers();
    const matchedUser = users.find(
      (u: any) => u.username.trim() === username.trim() && u.password === password
    );

    if (!matchedUser) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // Create session (expires in 7 days)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const sessionToken = await signSession({ username: matchedUser.username, expiresAt });

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

