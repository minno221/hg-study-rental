"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type ItemRow = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  active: number; // 지금 대기/대여 중인 개수
};

const emptyForm = { name: "", description: "", quantity: "1" };

export default function ItemsTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api<ItemRow[]>("/api/items");
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    setItems(res.data);
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(item: ItemRow) {
    setError("");
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await api(editingId ? `/api/items/${editingId}` : "/api/items", {
      method: editingId ? "PUT" : "POST",
      body: form,
    });
    setSaving(false);
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    resetForm();
    load();
  }

  async function handleDelete(item: ItemRow) {
    if (!confirm(`'${item.name}'을(를) 삭제할까요? 이 물품의 대여 기록도 모두 삭제돼요.`)) {
      return;
    }
    setError("");
    const res = await api(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      if (res.status === 401) return onUnauthorized();
      setError(res.error);
      return;
    }
    if (editingId === item.id) resetForm();
    load();
  }

  return (
    <section>
      <div className="panel">
        <h2 className="panel-title">{editingId ? "물품 수정" : "새 물품 등록"}</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="row">
            <label className="field grow">
              <span>물품 이름</span>
              <input
                placeholder="예: 독서대"
                value={form.name}
                maxLength={50}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="field qty">
              <span>수량</span>
              <input
                type="number"
                min={0}
                max={999}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>설명 (선택)</span>
            <input
              placeholder="예: 접이식, 3일 대여"
              value={form.description}
              maxLength={200}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "저장 중..." : editingId ? "수정 완료" : "등록"}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      <h2 className="list-heading">등록된 물품 ({items.length})</h2>
      {loading ? (
        <p className="muted">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="empty">아직 등록된 물품이 없어요.</div>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="list-row">
              <div className="list-main">
                <div className="list-title">{item.name}</div>
                <div className="list-sub">
                  {item.description ? `${item.description} · ` : ""}
                  전체 {item.quantity}개 · 대기/대여 중 {item.active}개
                </div>
              </div>
              <div className="row-actions">
                <button className="btn-ghost small" onClick={() => startEdit(item)}>
                  수정
                </button>
                <button className="btn-danger small" onClick={() => handleDelete(item)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
