import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { parseItemInput } from "@/lib/validate";

function isNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

// 물품 수정 (관리자만)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  try {
    const item = await prisma.item.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(item);
  } catch (e) {
    if (isNotFound(e)) {
      return NextResponse.json({ error: "물품을 찾을 수 없어요." }, { status: 404 });
    }
    throw e;
  }
}

// 물품 삭제 (관리자만) - 이 물품의 대여 기록도 함께 삭제돼요
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  try {
    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isNotFound(e)) {
      return NextResponse.json({ error: "물품을 찾을 수 없어요." }, { status: 404 });
    }
    throw e;
  }
}
