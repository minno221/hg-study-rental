import "./globals.css";

export const metadata = {
  title: "스터디 용품 대여",
  description: "공용 스터디 용품 대여 사이트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
