"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  description: string;
  totalQty: number;
  availableQty: number;
};

type Rental = {
  id: string;
  itemName: string;
  qty: number;
  status: "pending" | "approved" | "rejected" | "returned";
  requestedAt: string;
};

const STATUS_LABEL: Record<Rental["status"], string> = {
  pending: "승인 대기",
  approved: "대여중",
  rejected: "거절됨",
  returned: "반납 완료",
};

export default function StudentPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [studentClass, setStudentClass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [myRentals, setMyRentals] = useState<Rental[]>([]);
  const [error, setError] = useState("");
  const [qtyById, setQtyById] = useState<Record<string, number>>({});

  const loadItems = () => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const loadMyRentals = (name: string) => {
    if (!name) return;
    fetch(`/api/rentals?studentName=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => setMyRentals(d.rentals ?? []));
  };

  const requestRental = async (itemId: string) => {
    setError("");
    if (!studentName) {
      setError("이름을 입력해주세요.");
      return;
    }
    const qty = qtyById[itemId] ?? 1;
    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName, studentClass, itemId, qty }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "신청에 실패했습니다.");
      return;
    }
    loadItems();
    loadMyRentals(studentName);
  };

  return (
    <div className="container">
      <div className="tabs">
        <a href="/">학생용</a>
        <a href="/admin">관리자</a>
      </div>
      <h1>스터디 용품 대여</h1>
      <p className="sub">명단에 등록된 학생만 대여 신청이 가능합니다.</p>

      <div className="card">
        <div className="row">
          <input
            placeholder="반 (예: 2학년 3반)"
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            style={{ maxWidth: 160 }}
          />
          <input
            placeholder="이름"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onBlur={() => loadMyRentals(studentName)}
            style={{ maxWidth: 160 }}
          />
        </div>
        {error && <div className="error">{error}</div>}
      </div>

      <h3>물품 목록</h3>
      {items.length === 0 && <p className="sub">등록된 물품이 없습니다.</p>}
      {items.map((item) => (
        <div className="card" key={item.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{item.name}</strong>{" "}
              <span className="sub">
                (대여 가능 {item.availableQty} / 전체 {item.totalQty})
              </span>
              {item.description && <div className="sub">{item.description}</div>}
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              type="number"
              min={1}
              max={item.availableQty}
              value={qtyById[item.id] ?? 1}
              onChange={(e) =>
                setQtyById({ ...qtyById, [item.id]: Number(e.target.value) })
              }
              style={{ maxWidth: 70 }}
            />
            <button
              disabled={item.availableQty <= 0}
              onClick={() => requestRental(item.id)}
            >
              {item.availableQty <= 0 ? "대여 불가" : "대여 신청"}
            </button>
          </div>
        </div>
      ))}

      {myRentals.length > 0 && (
        <>
          <h3>내 신청 내역</h3>
          {myRentals.map((r) => (
            <div className="card" key={r.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span>
                  {r.itemName} × {r.qty}
                </span>
                <span className={`badge ${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
