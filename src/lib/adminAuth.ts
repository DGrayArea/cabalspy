/**
 * Super admin identity. The super admin:
 * - can never be demoted (by anyone, including themselves)
 * - is the only account allowed to change user roles (other admins are view-only)
 * - is auto-promoted to admin on sign-in
 * Override with the SUPER_ADMIN_EMAIL env var.
 */
export const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL || "alexodey79@gmail.com"
).toLowerCase();

export function isSuperAdmin(user: { email?: string | null }): boolean {
  return !!user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}
