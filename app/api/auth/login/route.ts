import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';

const DEFAULT_USERS = [
  { name: '김영수', username: 'yskim', password: '0201' },
  { name: '김선용', username: 'sunyong1994', password: '0201' },
  { name: '김세용', username: 'Seyong15', password: '0201' },
  { name: '함수빈', username: 'sbham', password: '6677' },
  { name: '정명호', username: 'mhjung', password: '9988' },
  { name: '김서하', username: 'shkim', password: '8800' }
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

  const list = [...DEFAULT_USERS];
  
  // 수출포장 법인 등에서 별도 환경변수로 관리자 계정을 설정한 경우 호환성 지원
  const envAdminUser = process.env.LOGIN_USERNAME;
  const envAdminPass = process.env.LOGIN_PASSWORD;
  if (envAdminUser && envAdminPass) {
    list.push({
      name: '관리자',
      username: envAdminUser,
      password: envAdminPass
    });
  }

  return list;
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

    // Create session (expires in 2 hours)
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
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

