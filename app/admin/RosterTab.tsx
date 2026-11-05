"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { parseRosterFile, type ParsedRow } from "@/lib/excel";

type Student = { id: string; studentNo: string; name: string };

type UploadResult = {
  added: number;
  renamed: number;
  unchanged: number;
  removed: number;
  skippedCount: number;
  skipped: { line: number; reason: string }[];
};

export default function RosterTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const load = useCallback(async () => {
    const res = await api<{ total: number; students: Student[] }>("/api/roster");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    setStudents(res.data.students);
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file: File) {
    setError("");
    setResult(null);
    setRows(null);
    setFileName(file.name);
    const parsed = await parseRosterFile(file);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setRows(parsed.rows);
  }

  function clearFile() {
    setRows(null);
    setFileName("");
    setRemoveMissing(false);
    setFileKey((k) => k + 1); // 파일 선택 칸 비우기
  }

  async function handleUpload() {
    if (!rows) return;
    if (
      removeMissing &&
      !confirm(
        "엑셀에 없는 학생은 명단에서 삭제되고, 그 학생의 대여 기록도 함께 삭제돼요. 계속할까요?"
      )
    ) {
      return;
    }
    setError("");
    setUploading(true);
    const res = await api<UploadResult>("/api/roster", {
      method: "POST",
      body: { rows, removeMissing },
    });
    setUploading(false);
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    setResult(res.data);
    clearFile();
    load();
  }

  async function handleDelete(s: Student) {
    if (!confirm(`${s.name}(${s.studentNo}) 학생을 삭제할까요? 대여 기록도 함께 삭제돼요.`)) {
      return;
    }
    const res = await api(`/api/roster?id=${encodeURIComponent(s.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    load();
  }

  const q = query.trim();
  const filtered = q
    ? students.filter((s) => s.studentNo.includes(q) || s.name.includes(q))
    : students;
  const shown = filtered.slice(0, 100);

  return (
    <section>
      <div className="panel">
        <h2 className="panel-title">엑셀로 명단 올리기</h2>
        <p className="hint-block">
          엑셀 첫 줄에 <strong>학번</strong>, <strong>이름</strong> 칸이 있으면 돼요. 다른 칸이
          있어도 두 칸만 읽어요. 파일은 서버에 저장되지 않고, 읽은 학번과 이름만 등록돼요.
        </p>

        <input
          key={fileKey}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {error && <p className="error-text spaced">{error}</p>}

        {rows && (
          <div className="preview-box">
            <p>
              <strong>{fileName}</strong> 에서 <strong>{rows.length}명</strong>을 읽었어요.
            </p>
            <p className="muted small-text">
              처음 3명:{" "}
              {rows
                .slice(0, 3)
                .map((r) => `${r.studentNo} ${r.name}`)
                .join(" / ")}
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={removeMissing}
                onChange={(e) => setRemoveMissing(e.target.checked)}
              />
              엑셀에 없는 학생은 명단에서 삭제 (새 학기에 명단을 통째로 바꿀 때)
            </label>
            <div className="actions">
              <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? "등록 중..." : "명단 등록"}
              </button>
              <button className="btn-ghost" onClick={clearFile} disabled={uploading}>
                취소
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="ok-text spaced">
            등록 완료! 새로 {result.added}명 추가, 이름 수정 {result.renamed}명, 그대로{" "}
            {result.unchanged}명
            {result.removed > 0 && `, 삭제 ${result.removed}명`}.
            {result.skippedCount > 0 && (
              <div className="skipped">
                건너뛴 줄 {result.skippedCount}개:
                <ul>
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      {s.line}번째 줄 - {s.reason}
                    </li>
                  ))}
                </ul>
                {result.skippedCount > result.skipped.length && <div>…</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="toolbar spaced-top">
        <h2 className="list-heading tight">현재 명단 ({students.length}명)</h2>
        <input
          className="search"
          placeholder="학번·이름 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="muted">불러오는 중...</p>
      ) : students.length === 0 ? (
        <div className="empty">아직 등록된 학생이 없어요. 위에서 엑셀을 올려주세요.</div>
      ) : (
        <div className="list">
          {shown.map((s) => (
            <div key={s.id} className="list-row compact">
              <div className="list-main">
                <span className="list-title">{s.name}</span>{" "}
                <span className="muted">{s.studentNo}</span>
              </div>
              <button className="btn-danger small" onClick={() => handleDelete(s)}>
                삭제
              </button>
            </div>
          ))}
          {filtered.length > shown.length && (
            <p className="muted small-text">
              {filtered.length}명 중 {shown.length}명만 보여요. 검색으로 좁혀보세요.
            </p>
          )}
          {filtered.length === 0 && <div className="empty">검색 결과가 없어요.</div>}
        </div>
      )}
    </section>
  );
}
