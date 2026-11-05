import { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// API에서 "관리자로 로그인한 요청인지" 확인
export async function isAdmin(req: NextRequest): Promise<boolean> {
  return verifySessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
