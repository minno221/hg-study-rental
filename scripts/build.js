// 배포(빌드) 때 실행돼요: 데이터베이스 표를 만들고(prisma db push) 사이트를 빌드해요.
// Vercel이 넣어준 데이터베이스 주소 환경변수가 이름이 달라도 찾아서 쓰도록 했어요.
const { execSync } = require("child_process");

const candidates = [
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.POSTGRES_URL,
];
const url = candidates.find((u) => u && /^postgres(ql)?:\/\//.test(u));

if (!url) {
  console.error(
    "\n데이터베이스 주소를 찾을 수 없어요. Vercel의 Storage 탭에서 Postgres 데이터베이스를 이 프로젝트에 연결해 주세요.\n"
  );
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url };

for (const cmd of ["prisma generate", "prisma db push", "next build"]) {
  console.log(`\n> ${cmd}`);
  execSync(`npx ${cmd}`, { stdio: "inherit", env });
}
