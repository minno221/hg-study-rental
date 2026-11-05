import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

// 지금 관리자로 로그인된 상태인지 알려줘요
export async function GET(req: NextRequest) {
  return NextResponse.json({ authed: await isAdmin(req) });
}
