import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongodb";
import Message from "@/models/Message";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * Authoritative gate for every protected /admin page.
 *
 * This lives in a `(protected)` route group rather than at `/admin/layout.tsx`
 * so it does NOT wrap `/admin/signin` — a layout that both guards and contains
 * the sign-in page would redirect to itself forever.
 *
 * `proxy.ts` only smooths the redirect; this is the check that enforces
 * access, because it re-reads the env allowlist and the stored sessionVersion
 * on every request.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/signin");

  // Badged on the Inbox link. A dead database must not take the whole admin
  // down with it, so the count degrades to zero.
  let unread = 0;
  try {
    await connectToDatabase();
    unread = await Message.countDocuments({ read: false });
  } catch {
    unread = 0;
  }

  return (
    <AdminShell admin={admin} unread={unread}>
      {children}
    </AdminShell>
  );
}
