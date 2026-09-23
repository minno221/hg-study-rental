import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

// 대여 상태 변경: approved / rejected / returned (관리자 전용)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { status } = await req.json();
  if (!["approved", "rejected", "returned"].includes(status)) {
    return NextResponse.json({ error: "잘못된 상태값입니다." }, { status: 400 });
  }

  const db = getDB();
  const idx = db.rentals.findIndex((r) => r.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: "신청 내역을 찾을 수 없습니다." }, { status: 404 });
  }
  db.rentals[idx].status = status;
  saveDB(db);
  return NextResponse.json({ rental: db.rentals[idx] });
}
