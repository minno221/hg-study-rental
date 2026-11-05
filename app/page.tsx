"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { STATUS_LABEL, type RentalStatus } from "@/lib/rental";

type ItemView = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  available: number;
  mine: RentalStatus | null;
};

type RentalView = {
  id: string;
  itemName: string;
  status: RentalStatus;
  createdAt: string;
};

type StudentData = {
  student: { studentNo: string; name: string };
  items: ItemView[];
  rentals: RentalView[];
};

const STORAGE_KEY = "study-rental-student";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const [studentNo, setStudentNo] = useState("");
  const [name, setName] = useState("");
  const [data, setData] = useState<StudentData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 학번+이름으로 본인 확인하고 물품/내 신청 내역 불러오기
  const load = useCallback(async (no: string, nm: string): Promise<boolean> => {
    const res = await api<StudentData>("/api/student", {
      method: "POST",
      body: { studentNo: no, name: nm },
    });
    if (!res.ok) {
      setError(res.error);
      if (res.status === 404) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
      return false;
    }
    setData(res.data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ studentNo: no, name: nm }));
    } catch {}
    return true;
  }, []);

  // 지난번에 입력한 학번/이름이 기억돼 있으면 자동으로 불러오기
  useEffect(() => {
    let saved: { studentNo?: string; name?: string } | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch {}

    if (saved && saved.studentNo && saved.name) {
      setStudentNo(saved.studentNo);
      setName(saved.name);
      load(saved.studentNo, saved.name).finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [load]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    await load(studentNo, name);
    setLoading(false);
  }

  function handleLogout() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setData(null);
    setStudentNo("");
    setName("");
    setError("");
    setNotice("");
  }

  async function handleRent(itemId: string) {
    if (!data) return;
    setBusyId(itemId);
    setError("");
    setNotice("");
    const res = await api("/api/rentals", {
      method: "POST",
      body: { studentNo: data.student.studentNo, name: data.student.name, itemId },
    });
    if (res.ok) setNotice("신청했어요! 관리자가 승인하면 물품을 받을 수 있어요.");
    else setError(res.error);
    await load(data.student.studentNo, data.student.name);
    setBusyId(null);
  }

  async function handleCancel(rentalId: string) {
    if (!data) return;
    if (!confirm("이 신청을 취소할까요?")) return;
    setBusyId(rentalId);
    setError("");
    setNotice("");
    const res = await api(`/api/rentals/${rentalId}`, {
      method: "DELETE",
      body: { studentNo: data.student.studentNo, name: data.student.name },
    });
    if (res.ok) setNotice("신청을 취소했어요.");
    else setError(res.error);
    await load(data.student.studentNo, data.student.name);
    setBusyId(null);
  }

  if (!ready) {
    return (
      <main className="page">
        <p className="muted">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="hero-eyebrow">호계고</p>
        <h1 className="hero-title">스터디 용품 대여</h1>
        <p className="hero-sub">학번과 이름을 입력하고 필요한 물품을 신청하세요.</p>
      </header>

      {!data ? (
        <section className="panel narrow-panel">
          <form onSubmit={handleLogin} className="form">
            <label className="field">
              <span>학번</span>
              <input
                inputMode="numeric"
                placeholder="예: 10101"
                value={studentNo}
                onChange={(e) => setStudentNo(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>이름</span>
              <input
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "확인 중..." : "확인"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <div className="welcome">
            <div>
              <strong>{data.student.name}</strong>
              <span className="muted"> · {data.student.studentNo}</span>
            </div>
            <button className="btn-ghost small" onClick={handleLogout}>
              다른 학번으로
            </button>
          </div>

          {notice && <p className="ok-text">{notice}</p>}
          {error && <p className="error-text">{error}</p>}

          <h2 className="section-title">대여 가능한 물품</h2>
          {data.items.length === 0 ? (
            <div className="empty">아직 등록된 물품이 없어요.</div>
          ) : (
            <div className="grid">
              {data.items.map((item) => {
                let label = "대여 신청";
                let disabled = false;
                if (item.mine === "approved") {
                  label = "대여 중";
                  disabled = true;
                } else if (item.mine === "pending") {
                  label = "신청 완료 (승인 대기)";
                  disabled = true;
                } else if (item.available <= 0) {
                  label = "남은 수량 없음";
                  disabled = true;
                }
                return (
                  <div key={item.id} className="item-card">
                    <div>
                      <h3 className="item-name">{item.name}</h3>
                      {item.description && (
                        <p className="item-desc">{item.description}</p>
                      )}
                      <p className="item-stock">
                        남은 수량 <strong>{item.available}</strong> / {item.quantity}
                      </p>
                    </div>
                    <button
                      className="btn-primary"
                      disabled={disabled || busyId === item.id}
                      onClick={() => handleRent(item.id)}
                    >
                      {busyId === item.id ? "신청 중..." : label}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="section-title">내 신청 내역</h2>
          {data.rentals.length === 0 ? (
            <div className="empty">아직 신청한 내역이 없어요.</div>
          ) : (
            <div className="list">
              {data.rentals.map((r) => (
                <div key={r.id} className="list-row">
                  <div className="list-main">
                    <div className="list-title">{r.itemName}</div>
                    <div className="list-sub">{formatDate(r.createdAt)}</div>
                  </div>
                  <span className={`badge inline ${r.status}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.status === "pending" && (
                    <button
                      className="btn-ghost small"
                      disabled={busyId === r.id}
                      onClick={() => handleCancel(r.id)}
                    >
                      취소
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
