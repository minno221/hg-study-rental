import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

export type Item = {
  id: string;
  name: string;
  description: string;
  totalQty: number;
};

export type Rental = {
  id: string;
  itemId: string;
  itemName: string;
  studentName: string;
  studentClass: string;
  qty: number;
  status: "pending" | "approved" | "rejected" | "returned";
  requestedAt: string;
};

export type DB = {
  items: Item[];
  roster: string[]; // "1학년 3반 홍길동" 형태의 문자열 명단
  rentals: Rental[];
};

function readDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    return { items: [], roster: [], rentals: [] };
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(db: DB) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function getDB(): DB {
  return readDB();
}

export function saveDB(db: DB) {
  writeDB(db);
}

// 승인된 대여 중 반납 안 된 수량 합산 -> 대여 가능 수량 계산용
export function getRentedQty(db: DB, itemId: string): number {
  return db.rentals
    .filter((r) => r.itemId === itemId && r.status === "approved")
    .reduce((sum, r) => sum + r.qty, 0);
}
