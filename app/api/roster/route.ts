import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { cleanName, cleanStudentNo, isValidStudentNo } from "@/lib/validate";

const MAX_ROWS = 5000;

// 명단 보기 (관리자만)
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    orderBy: { studentNo: "asc" },
    select: { id: true, studentNo: true, name: true },
  });
  return NextResponse.json({ total: students.length, students });
}

// 엑셀에서 읽은 명단 등록 (관리자만)
// body: { rows: [{ studentNo, name, line }], removeMissing: boolean }
//  - 새 학번은 추가, 이미 있는 학번은 이름만 갱신
//  - removeMissing이 true면 이번 명단에 없는 학생은 삭제(그 학생의 대여 기록도 삭제)
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ error: "명단 데이터가 없어요." }, { status: 400 });
  }
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `한 번에 ${MAX_ROWS}명까지만 올릴 수 있어요.` },
      { status: 400 }
    );
  }
  const removeMissing = body.removeMissing === true;

  // 한 줄씩 검사
  const skipped: { line: number; reason: string }[] = [];
  const valid = new Map<string, string>(); // 학번 → 이름
  body.rows.forEach((raw: unknown, index: number) => {
    const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const line = typeof row.line === "number" ? row.line : index + 1;
    const studentNo = cleanStudentNo(row.studentNo);
    const name = cleanName(row.name);

    if (!studentNo && !name) return;
    if (!studentNo || !name) {
      skipped.push({ line, reason: "학번 또는 이름이 비어 있어요" });
    } else if (!isValidStudentNo(studentNo)) {
      skipped.push({ line, reason: `학번 형식이 올바르지 않아요 (${studentNo})` });
    } else if (name.length > 30) {
      skipped.push({ line, reason: "이름이 너무 길어요" });
    } else if (valid.has(studentNo)) {
      skipped.push({ line, reason: `학번이 중복돼요 (${studentNo})` });
    } else {
      valid.set(studentNo, name);
    }
  });

  if (valid.size === 0) {
    return NextResponse.json(
      { error: "등록할 수 있는 학생이 한 명도 없어요.", skipped: skipped.slice(0, 20) },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.student.findMany({
        select: { id: true, studentNo: true, name: true },
      });
      const existingMap = new Map(existing.map((s) => [s.studentNo, s] as const));

      const toCreate: { studentNo: string; name: string }[] = [];
      const toRename: { id: string; name: string }[] = [];
      valid.forEach((name, studentNo) => {
        const found = existingMap.get(studentNo);
        if (!found) toCreate.push({ studentNo, name });
        else if (found.name !== name) toRename.push({ id: found.id, name });
      });

      if (toCreate.length > 0) {
        await tx.student.createMany({ data: toCreate, skipDuplicates: true });
      }
      for (const r of toRename) {
        await tx.student.update({ where: { id: r.id }, data: { name: r.name } });
      }

      let removed = 0;
      if (removeMissing) {
        const del = await tx.student.deleteMany({
          where: { studentNo: { notIn: Array.from(valid.keys()) } },
        });
        removed = del.count;
      }

      return { added: toCreate.length, renamed: toRename.length, removed };
    },
    { timeout: 30000 }
  );

  return NextResponse.json({
    ...result,
    unchanged: valid.size - result.added - result.renamed,
    skipped: skipped.slice(0, 20),
    skippedCount: skipped.length,
  });
}

// 학생 한 명 삭제 (관리자만): /api/roster?id=...
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "삭제할 학생을 지정해 주세요." }, { status: 400 });
  }

  const result = await prisma.student.deleteMany({ where: { id } });
  if (result.count === 0) {
    return NextResponse.json({ error: "학생을 찾을 수 없어요." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
