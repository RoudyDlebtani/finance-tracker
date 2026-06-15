import Link from "next/link";
import { Wallet } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-bold">
        <Wallet className="h-6 w-6 text-primary" /> FinTrack
      </Link>
      <AuthForm mode="login" />
    </main>
  );
}
