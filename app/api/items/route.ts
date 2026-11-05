import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { parseItemInput } from "@/lib/validate";
import { ACTIVE_STATUSES } from "@/lib/rental";

// 물품 목록 (관리자용: 지금 대여/대기 중인 개수 포함)
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const items = await prisma.item.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { rentals: { where: { status: { in: ACTIVE_STATUSES } } } } },
    },
  });

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      active: item._count.rentals,
    }))
  );
}

// 물품 등록 (관리자만)
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = parseItemInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const item = await prisma.item.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
