import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

// 명단 조회 (관리자 전용)
export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const db = getDB();
  return NextResponse.json({ roster: db.roster });
}

// 명단 업로드 (한 줄에 한 명, 기존 명단을 교체) - 관리자 전용
export async function POST(req: NextRequest) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { text } = await req.json();
  const names: string[] = (text ?? "")
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  const db = getDB();
  db.roster = Array.from(new Set(names)); // 중복 제거
  saveDB(db);
  return NextResponse.json({ roster: db.roster });
}
