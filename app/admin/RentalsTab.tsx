"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { STATUS_LABEL, type RentalStatus } from "@/lib/rental";

type RentalRow = {
  id: string;
  status: RentalStatus;
  createdAt: string;
  student: { studentNo: string; name: string };
  item: { name: string };
};

type Filter = "pending" | "approved" | "done" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "대여 중" },
  { key: "done", label: "완료·거절" },
  { key: "all", label: "전체" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matches(row: RentalRow, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "done") return row.status === "returned" || row.status === "rejected";
  return row.status === filter;
}

export default function RentalsTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [rows, setRows] = useState<RentalRow[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<RentalRow[]>("/api/rentals");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    setError("");
    setRows(res.data);
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "return") {
    setBusyId(id);
    setError("");
    const res = await api(`/api/rentals/${id}`, {
      method: "PATCH",
      body: { action },
    });
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
    }
    await load();
    setBusyId(null);
  }

  const q = query.trim();
  const visible = rows.filter(
    (r) =>
      matches(r, filter) &&
      (!q ||
        r.student.studentNo.includes(q) ||
        r.student.name.includes(q) ||
        r.item.name.includes(q))
  );
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <section>
      <div className="toolbar">
        <div className="chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip ${filter === f.key ? "on" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key === "pending" && pendingCount > 0 && (
                <span className="chip-count">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <input
            className="search"
            placeholder="학번·이름·물품 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-ghost small" onClick={load} disabled={loading}>
            새로고침
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading && rows.length === 0 ? (
        <p className="muted">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <div className="empty">해당하는 신청이 없어요.</div>
      ) : (
        <div className="list">
          {visible.map((r) => (
            <div key={r.id} className="list-row">
              <div className="list-main">
                <div className="list-title">
                  {r.student.name}{" "}
                  <span className="muted">({r.student.studentNo})</span>
                </div>
                <div className="list-sub">
                  {r.item.name} · {formatDate(r.createdAt)}
                </div>
              </div>
              <span className={`badge inline ${r.status}`}>{STATUS_LABEL[r.status]}</span>
              {r.status === "pending" && (
                <div className="row-actions">
                  <button
                    className="btn-primary small-btn"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, "approve")}
                  >
                    승인
                  </button>
                  <button
                    className="btn-danger small"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, "reject")}
                  >
                    거절
                  </button>
                </div>
              )}
              {r.status === "approved" && (
                <div className="row-actions">
                  <button
                    className="btn-ghost small"
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, "return")}
                  >
                    반납 처리
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
