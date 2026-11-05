import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStudent } from "@/lib/student";
import { ACTIVE_STATUSES } from "@/lib/rental";

// 학생이 학번+이름을 입력하면: 본인 확인 → 물품 목록(남은 수량) + 내 신청 내역을 돌려줘요
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const student = await findStudent(body.studentNo, body.name);
  if (!student) {
    return NextResponse.json(
      { error: "명단에서 찾을 수 없어요. 학번과 이름을 다시 확인해 주세요." },
      { status: 404 }
    );
  }

  const [items, rentals] = await Promise.all([
    prisma.item.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        rentals: {
          where: { status: { in: ACTIVE_STATUSES } },
          select: { studentId: true, status: true },
        },
      },
    }),
    prisma.rental.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { item: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    student: { studentNo: student.studentNo, name: student.name },
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      available: Math.max(0, item.quantity - item.rentals.length),
      mine: item.rentals.find((r) => r.studentId === student.id)?.status ?? null,
    })),
    rentals: rentals.map((r) => ({
      id: r.id,
      itemName: r.item.name,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
