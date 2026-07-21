import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { AdminDashboardClient } from "./AdminDashboardClient";

/**
 * Server-side gate: only admins (per ADMIN_USER_IDS) ever render the
 * dashboard. Non-admin signed-in users get a clear "not authorized" screen
 * instead of a client component that silently fails its API calls.
 */
export default async function AdminPage() {
  const { userId } = await auth();

  if (!userId || !isAdmin(userId)) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center">
        <ShieldAlert size={32} className="text-rose-400" />
        <p className="font-display text-lg text-primary">You don't have access to this page</p>
        <p className="max-w-sm text-sm text-muted">
          The admin dashboard is restricted. If you believe you should have access, ask the <code className="text-cite">Admin</code>.
        </p>
        <Link href="/chat" className="mt-2 flex items-center gap-1.5 text-sm text-accent hover:underline">
          <ArrowLeft size={14} /> Back to chat
        </Link>
      </main>
    );
  }

  return <AdminDashboardClient />;
}