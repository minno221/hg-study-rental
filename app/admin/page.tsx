"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import RentalsTab from "./RentalsTab";
import ItemsTab from "./ItemsTab";
import RosterTab from "./RosterTab";

type Tab = "rentals" | "items" | "roster";

const TABS: { key: Tab; label: string }[] = [
  { key: "rentals", label: "대여 신청" },
  { key: "items", label: "물품" },
  { key: "roster", label: "학생 명단" },
];

function LoginForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api("/api/admin/login", {
      method: "POST",
      body: { password },
    });
    setLoading(false);
    if (res.ok) onDone();
    else setError(res.error);
  }

  return (
    <main className="admin-wrap narrow">
      <div className="panel">
        <h1 className="admin-title">관리자 로그인</h1>
        <p className="muted">관리자만 들어올 수 있어요.</p>
        <form onSubmit={handleSubmit} className="form">
          <input
            type="password"
            placeholder="관리자 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("rentals");

  useEffect(() => {
    api<{ authed: boolean }>("/api/admin/me").then((res) =>
      setAuthed(res.ok && res.data.authed)
    );
  }, []);

  // 로그인이 만료되면 로그인 화면으로 돌려보내요
  const handleUnauthorized = useCallback(() => setAuthed(false), []);

  async function handleLogout() {
    await api("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
  }

  if (authed === null) {
    return (
      <main className="admin-wrap">
        <p className="muted">확인 중...</p>
      </main>
    );
  }

  if (!authed) return <LoginForm onDone={() => setAuthed(true)} />;

  return (
    <main className="admin-wrap">
      <div className="top-bar">
        <h1 className="admin-title">스터디 용품 관리</h1>
        <div className="top-actions">
          <a className="btn-ghost" href="/" target="_blank" rel="noopener noreferrer">
            학생 화면
          </a>
          <button className="btn-ghost" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? "on" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rentals" && <RentalsTab onUnauthorized={handleUnauthorized} />}
      {tab === "items" && <ItemsTab onUnauthorized={handleUnauthorized} />}
      {tab === "roster" && <RosterTab onUnauthorized={handleUnauthorized} />}
    </main>
  );
}
