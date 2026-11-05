import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  SESSION_SECONDS,
  checkPassword,
  createSessionToken,
  isAuthConfigured,
} from "@/lib/auth";

// 비밀번호 무차별 대입을 늦추기 위한 간단한 횟수 제한 (IP별 10분에 5번)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60 * 1000;

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "서버에 ADMIN_PASSWORD 환경변수가 설정되지 않았어요." },
      { status: 500 }
    );
  }

  const ip = getIp(req);
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && record.resetAt > now && record.count >= MAX_FAILS) {
    return NextResponse.json(
      { error: "시도 횟수가 너무 많아요. 10분 뒤에 다시 해주세요." },
      { status: 429 }
    );
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!(await checkPassword(password))) {
    const fresh = record && record.resetAt > now ? record : null;
    attempts.set(ip, {
      count: (fresh?.count ?? 0) + 1,
      resetAt: fresh?.resetAt ?? now + WINDOW_MS,
    });
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  attempts.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return res;
}

// 로그아웃
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
