import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "스터디 용품 대여",
  description: "학교 공용 스터디 용품 대여 신청",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
