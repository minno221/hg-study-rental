import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { findStudent } from "@/lib/student";
import { ACTIVE_STATUSES, HttpError } from "@/lib/rental";

const ALREADY = "이미 이 물품을 신청했거나 대여 중이에요. (한 사람당 물품별 1개까지예요)";

// 대여 신청 목록 (관리자만)
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const rentals = await prisma.rental.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      student: { select: { studentNo: true, name: true } },
      item: { select: { name: true } },
    },
  });

  return NextResponse.json(
    rentals.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      student: r.student,
      item: r.item,
    }))
  );
}

// 대여 신청 (학생) - 같은 물품은 한 사람당 1개까지
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

  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!itemId) {
    return NextResponse.json({ error: "물품을 선택해 주세요." }, { status: 400 });
  }

  const activeKey = `${student.id}:${itemId}`;

  try {
    const rental = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item) throw new HttpError(404, "물품을 찾을 수 없어요.");

      // 1인 1개 확인 (대기 중이거나 대여 중인 신청이 있으면 막기)
      const mine = await tx.rental.findFirst({
        where: {
          studentId: student.id,
          itemId,
          status: { in: ACTIVE_STATUSES },
        },
        select: { id: true },
      });
      if (mine) throw new HttpError(409, ALREADY);

      // 재고 확인
      const active = await tx.rental.count({
        where: { itemId, status: { in: ACTIVE_STATUSES } },
      });
      if (active >= item.quantity) {
        throw new HttpError(409, "남은 수량이 없어요.");
      }

      return tx.rental.create({
        data: { studentId: student.id, itemId, activeKey },
      });
    });

    return NextResponse.json({ id: rental.id }, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // 동시에 두 번 눌렀을 때 데이터베이스가 막아주는 경우
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: ALREADY }, { status: 409 });
    }
    throw e;
  }
}
