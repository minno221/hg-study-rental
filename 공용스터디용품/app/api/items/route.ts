import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, getRentedQty } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

// 물품 목록 조회 (대여 가능 수량 포함) - 학생/관리자 공통
export async function GET() {
  const db = getDB();
  const items = db.items.map((item) => ({
    ...item,
    availableQty: item.totalQty - getRentedQty(db, item.id),
  }));
  return NextResponse.json({ items });
}

// 물품 등록 (관리자 전용)
export async function POST(req: NextRequest) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { name, description, totalQty } = await req.json();
  if (!name || !totalQty) {
    return NextResponse.json({ error: "물품명과 수량을 입력하세요." }, { status: 400 });
  }

  const db = getDB();
  const newItem = {
    id: crypto.randomUUID(),
    name,
    description: description ?? "",
    totalQty: Number(totalQty),
  };
  db.items.push(newItem);
  saveDB(db);
  return NextResponse.json({ item: newItem });
}
