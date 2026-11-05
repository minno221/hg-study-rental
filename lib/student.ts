import { prisma } from "@/lib/prisma";
import { cleanStudentNo, normName } from "@/lib/validate";

// 학번 + 이름이 명단과 일치하는 학생 찾기 (없으면 null)
export async function findStudent(studentNo: unknown, name: unknown) {
  const no = cleanStudentNo(studentNo);
  if (!no || typeof name !== "string") return null;

  const student = await prisma.student.findUnique({ where: { studentNo: no } });
  if (!student || normName(student.name) !== normName(name)) return null;
  return student;
}
