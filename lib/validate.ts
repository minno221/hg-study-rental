// 입력값 정리/검사 도구

// 학번: 공백 제거
export function cleanStudentNo(v: unknown): string {
  return String(v ?? "").replace(/\s/g, "");
}

// 이름: 앞뒤 공백 제거 + 한글 글자 형태 통일(맥에서 만든 엑셀 대비)
export function cleanName(v: unknown): string {
  return String(v ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

// 이름 비교용: 공백을 전부 무시
export function normName(v: unknown): string {
  return String(v ?? "")
    .normalize("NFC")
    .replace(/\s/g, "");
}

export function isValidStudentNo(s: string): boolean {
  return /^[0-9A-Za-z-]{1,20}$/.test(s);
}

type ItemResult =
  | { ok: true; data: { name: string; description: string; quantity: number } }
  | { ok: false; error: string };

export function parseItemInput(body: unknown): ItemResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { ok: false, error: "물품 이름을 입력해 주세요." };
  if (name.length > 50) {
    return { ok: false, error: "물품 이름은 50자 이하로 입력해 주세요." };
  }

  const description =
    typeof b.description === "string" ? b.description.trim() : "";
  if (description.length > 200) {
    return { ok: false, error: "설명은 200자 이하로 입력해 주세요." };
  }

  const quantity = Number(b.quantity);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
    return { ok: false, error: "수량은 0~999 사이의 숫자로 입력해 주세요." };
  }

  return { ok: true, data: { name, description, quantity } };
}
