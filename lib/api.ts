// 화면(브라우저)에서 API를 부를 때 쓰는 도구

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export async function api<T = unknown>(
  url: string,
  init?: { method?: string; body?: unknown }
): Promise<ApiResult<T>> {
  try {
    const hasBody = init?.body !== undefined;
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(init?.body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        json && typeof json.error === "string" ? json.error : "요청에 실패했어요.";
      return { ok: false, status: res.status, error: message };
    }
    return { ok: true, data: json as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "네트워크 오류가 발생했어요. 다시 시도해 주세요.",
    };
  }
}
