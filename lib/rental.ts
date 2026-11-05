// 대여 상태 관련 공통 값 (서버/화면 모두 사용)

export type RentalStatus = "pending" | "approved" | "rejected" | "returned";

// 재고를 차지하고, "1인 1개" 제한에도 걸리는 상태
export const ACTIVE_STATUSES: RentalStatus[] = ["pending", "approved"];

export const STATUS_LABEL: Record<RentalStatus, string> = {
  pending: "승인 대기",
  approved: "대여 중",
  rejected: "거절됨",
  returned: "반납 완료",
};

// API에서 사용자에게 보여줄 에러를 던질 때 쓰는 에러
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
