/**
 * Route transition wrapper. Next.js remounts a template on every navigation,
 * so each page (login, home, portfolio, token pages) enters with the same
 * subtle fade-up defined by .page-enter in globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
