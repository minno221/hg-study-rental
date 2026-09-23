"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; description: string; totalQty: number; availableQty: number };
type Rental = {
  id: string;
  itemName: string;
  studentName: string;
  studentClass: string;
  qty: number;
  status: "pending" | "approved" | "rejected" | "returned";
  requestedAt: string;
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [rosterText, setRosterText] = useState("");
  const [rosterCount, setRosterCount] = useState<number | null>(null);

  const [newItem, setNewItem] = useState({ name: "", description: "", totalQty: 1 });

  const login = async () => {
    setLoginError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setLoggedIn(true);
      loadAll();
    } else {
      const d = await res.json();
      setLoginError(d.error ?? "로그인 실패");
    }
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setLoggedIn(false);
  };

  const loadAll = () => {
    fetch("/api/items").then((r) => r.json()).then((d) => setItems(d.items ?? []));
    fetch("/api/rentals").then((r) => r.json()).then((d) => setRentals(d.rentals ?? []));
    fetch("/api/roster").then((r) => r.json()).then((d) => setRosterCount((d.roster ?? []).length));
  };

  const addItem = async () => {
    if (!newItem.name || !newItem.totalQty) return;
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    if (res.ok) {
      setNewItem({ name: "", description: "", totalQty: 1 });
      loadAll();
    }
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    loadAll();
  };

  const uploadRoster = async () => {
    const res = await fetch("/api/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rosterText }),
    });
    if (res.ok) {
      const d = await res.json();
      setRosterCount(d.roster.length);
      setRosterText("");
    }
  };

  const setRentalStatus = async (id: string, status: string) => {
    await fetch(`/api/rentals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadAll();
  };

  if (!loggedIn) {
    return (
      <div className="container">
        <div className="tabs">
          <a href="/">학생용</a>
          <a href="/admin">관리자</a>
        </div>
        <h1>관리자 로그인</h1>
        <div className="card">
          <div className="row">
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button onClick={login}>로그인</button>
          </div>
          {loginError && <div className="error">{loginError}</div>}
        </div>
      </div>
    );
  }

  const pending = rentals.filter((r) => r.status === "pending");
  const others = rentals.filter((r) => r.status !== "pending");

  return (
    <div className="container">
      <div className="tabs">
        <a href="/">학생용</a>
        <a href="/admin">관리자</a>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>관리자 대시보드</h1>
        <button className="secondary" onClick={logout}>로그아웃</button>
      </div>

      <h3>명단 관리 {rosterCount !== null && <span className="sub">(현재 {rosterCount}명)</span>}</h3>
      <div className="card">
        <textarea
          rows={5}
          placeholder={"한 줄에 한 명씩 입력 (예: 2학년 3반 홍길동)\n기존 명단은 새로 업로드하면 교체됩니다."}
          value={rosterText}
          onChange={(e) => setRosterText(e.target.value)}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={uploadRoster}>명단 업로드(교체)</button>
        </div>
      </div>

      <h3>물품 등록</h3>
      <div className="card">
        <div className="row">
          <input
            placeholder="물품명"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            type="number"
            min={1}
            placeholder="수량"
            value={newItem.totalQty}
            onChange={(e) => setNewItem({ ...newItem, totalQty: Number(e.target.value) })}
            style={{ maxWidth: 90 }}
          />
        </div>
        <input
          placeholder="설명(선택)"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          style={{ marginTop: 8 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={addItem}>물품 추가</button>
        </div>
      </div>

      <h3>물품 목록</h3>
      {items.map((item) => (
        <div className="card" key={item.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>
              <strong>{item.name}</strong>{" "}
              <span className="sub">
                (대여 가능 {item.availableQty} / 전체 {item.totalQty})
              </span>
            </span>
            <button className="danger" onClick={() => deleteItem(item.id)}>삭제</button>
          </div>
        </div>
      ))}

      <h3>대여 승인 대기 ({pending.length})</h3>
      {pending.length === 0 && <p className="sub">대기 중인 신청이 없습니다.</p>}
      {pending.map((r) => (
        <div className="card" key={r.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>
              {r.studentClass} {r.studentName} — {r.itemName} × {r.qty}
            </span>
            <div className="row">
              <button onClick={() => setRentalStatus(r.id, "approved")}>승인</button>
              <button className="secondary" onClick={() => setRentalStatus(r.id, "rejected")}>거절</button>
            </div>
          </div>
        </div>
      ))}

      <h3>전체 대여 내역</h3>
      {others.map((r) => (
        <div className="card" key={r.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>
              {r.studentClass} {r.studentName} — {r.itemName} × {r.qty}
            </span>
            <div className="row">
              <span className={`badge ${r.status}`}>{r.status}</span>
              {r.status === "approved" && (
                <button className="secondary" onClick={() => setRentalStatus(r.id, "returned")}>
                  반납 처리
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
