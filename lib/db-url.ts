// Vercel이 넣어준 데이터베이스 주소 중 쓸 수 있는 것을 골라요
export function pickDbUrl(): string | undefined {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ].find((u) => !!u && /^postgres(ql)?:\/\//.test(u));
}
