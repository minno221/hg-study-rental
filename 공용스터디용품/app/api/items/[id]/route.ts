import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

// 물품 정보 수정 (관리자 전용)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const updates = await req.json();
  const db = getDB();
  const idx = db.items.findIndex((i) => i.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
  }
  db.items[idx] = { ...db.items[idx], ...updates };
  saveDB(db);
  return NextResponse.json({ item: db.items[idx] });
}

// 물품 삭제 (관리자 전용)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const db = getDB();
  db.items = db.items.filter((i) => i.id !== params.id);
  saveDB(db);
  return NextResponse.json({ ok: true });
}
