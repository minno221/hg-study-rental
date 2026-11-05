// 엑셀(.xlsx) 명단 파일을 읽어서 학번/이름 목록으로 바꿔요. (브라우저에서만 실행돼요)
// 파일은 서버로 올라가지 않고, 읽은 학번/이름만 데이터베이스로 보내요.

export type ParsedRow = { studentNo: string; name: string; line: number };

export async function parseRosterFile(
  file: File
): Promise<{ rows: ParsedRow[] } | { error: string }> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();

  let table: unknown[][];
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { error: "엑셀 파일에 시트가 없어요." };
    // raw:false → 학번이 숫자로 저장돼 있어도 글자로 읽어요
    table = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    });
  } catch {
    return { error: "파일을 읽을 수 없어요. 엑셀(.xlsx) 파일이 맞는지 확인해 주세요." };
  }

  const norm = (v: unknown) => String(v ?? "").replace(/\s/g, "");
  const NO_HEADERS = ["학번"];
  const NAME_HEADERS = ["이름", "성명"];

  // 위쪽 15줄 안에서 '학번'과 '이름'이 같이 있는 줄을 제목 줄로 봐요
  let headerIdx = -1;
  let noCol = -1;
  let nameCol = -1;
  for (let i = 0; i < Math.min(table.length, 15); i++) {
    const cells = (table[i] || []).map(norm);
    const a = cells.findIndex((c) => NO_HEADERS.includes(c));
    const b = cells.findIndex((c) => NAME_HEADERS.includes(c));
    if (a >= 0 && b >= 0) {
      headerIdx = i;
      noCol = a;
      nameCol = b;
      break;
    }
  }
  if (headerIdx < 0) {
    return { error: "첫 줄에 '학번'과 '이름' 칸이 있어야 해요." };
  }

  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < table.length; i++) {
    const r = table[i] || [];
    const studentNo = String(r[noCol] ?? "").trim();
    const name = String(r[nameCol] ?? "").trim();
    if (!studentNo && !name) continue; // 빈 줄은 건너뛰기
    rows.push({ studentNo, name, line: i + 1 });
  }
  if (rows.length === 0) return { error: "학생 정보가 한 줄도 없어요." };

  return { rows };
}
