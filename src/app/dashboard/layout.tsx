import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getUser } from "@/lib/data";
import { SidebarNav } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { ConfirmProvider } from "@/components/ui/confirm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <ConfirmProvider>
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex flex-col gap-6 border-b border-border bg-card p-4 md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Wallet className="h-6 w-6 text-primary" /> FinTrack
          </Link>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>

        <div className="md:flex-1 overflow-x-auto">
          <SidebarNav />
        </div>

        <div className="hidden items-center justify-between gap-2 md:flex">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm text-muted-foreground truncate">
            {user.email}
          </span>
          <SignOutButton className="md:hidden" />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
    </ConfirmProvider>
  );
}
