/**
 * Shared admin check. If ADMIN_USER_IDS is unset, ANY signed-in user is
 * treated as an admin — convenient for solo/dev use, but set this env var
 * before shipping so only your own Clerk user id(s) get admin access.
 */
export function isAdmin(userId: string): boolean {
  const allowList = process.env.ADMIN_USER_IDS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowList || allowList.length === 0) return true;
  return allowList.includes(userId);
}