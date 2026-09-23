import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, getRentedQty } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

// 대여 신청 목록 조회 (관리자 전용 - 학생은 본인 이름으로 조회)
export async function GET(req: NextRequest) {
  const db = getDB();
  const studentName = req.nextUrl.searchParams.get("studentName");

  if (isAdminRequest()) {
    return NextResponse.json({ rentals: db.rentals });
  }
  if (studentName) {
    const mine = db.rentals.filter((r) => r.studentName === studentName);
    return NextResponse.json({ rentals: mine });
  }
  return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
}

// 대여 신청 (명단에 있는 학생만 가능)
export async function POST(req: NextRequest) {
  const { studentName, studentClass, itemId, qty } = await req.json();

  if (!studentName || !itemId || !qty) {
    return NextResponse.json({ error: "필수 항목을 입력하세요." }, { status: 400 });
  }

  const db = getDB();

  const fullName = studentClass ? `${studentClass} ${studentName}` : studentName;
  const isListed = db.roster.some(
    (n) => n === studentName || n === fullName || n.endsWith(studentName)
  );
  if (!isListed) {
    return NextResponse.json(
      { error: "명단에서 이름을 찾을 수 없습니다. 관리자에게 문의하세요." },
      { status: 403 }
    );
  }

  const item = db.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: "물품을 찾을 수 없습니다." }, { status: 404 });
  }
  const available = item.totalQty - getRentedQty(db, itemId);
  if (Number(qty) > available) {
    return NextResponse.json({ error: "대여 가능한 수량을 초과했습니다." }, { status: 400 });
  }

  const newRental = {
    id: crypto.randomUUID(),
    itemId,
    itemName: item.name,
    studentName,
    studentClass: studentClass ?? "",
    qty: Number(qty),
    status: "pending" as const,
    requestedAt: new Date().toISOString(),
  };
  db.rentals.push(newRental);
  saveDB(db);
  return NextResponse.json({ rental: newRental });
}
