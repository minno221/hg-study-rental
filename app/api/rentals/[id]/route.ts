import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { findStudent } from "@/lib/student";

// 어떤 처리가 가능한지: 현재 상태 → 바뀔 상태
const ACTIONS = {
  approve: { from: "pending", to: "approved", release: false },
  reject: { from: "pending", to: "rejected", release: true },
  return: { from: "approved", to: "returned", release: true },
} as const;

type ActionName = keyof typeof ACTIONS;

// 승인 / 거절 / 반납 처리 (관리자만)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const action = body.action as ActionName;
  if (!Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
    return NextResponse.json({ error: "알 수 없는 처리예요." }, { status: 400 });
  }
  const rule = ACTIONS[action];

  // 현재 상태가 맞을 때만 바꿔요 (두 명이 동시에 눌러도 한 번만 처리돼요)
  const result = await prisma.rental.updateMany({
    where: { id: params.id, status: rule.from },
    data: rule.release
      ? { status: rule.to, activeKey: null }
      : { status: rule.to },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "이미 처리됐거나 없는 신청이에요. 목록을 새로고침해 주세요." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

// 승인 대기 중인 신청을 학생이 직접 취소
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const student = await findStudent(body.studentNo, body.name);
  if (!student) {
    return NextResponse.json({ error: "본인 확인에 실패했어요." }, { status: 404 });
  }

  const result = await prisma.rental.deleteMany({
    where: { id: params.id, studentId: student.id, status: "pending" },
  });
  if (result.count === 0) {
    return NextResponse.json(
      { error: "취소할 수 없어요. 이미 승인됐거나 처리된 신청이에요." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
