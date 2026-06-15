"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  PiggyBank,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/dashboard/goals", label: "Goals", icon: Target },
  { href: "/dashboard/categories", label: "Categories", icon: Tags },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:flex-col">
      {links.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
