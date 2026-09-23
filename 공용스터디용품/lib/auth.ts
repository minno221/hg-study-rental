import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SECRET = process.env.ADMIN_PASSWORD ?? "change-me-1234";

export function isAdminRequest(): boolean {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value === SECRET;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SECRET = SECRET;
