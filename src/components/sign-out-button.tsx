"use client";

import { useRef } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";

/** Sign-out control that asks for confirmation in a centered modal before posting. */
export function SignOutButton({ className }: { className?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await confirm({
      title: "Sign out?",
      message: "You'll need to log in again to access your dashboard.",
      confirmText: "Sign out",
    });
    if (ok) formRef.current?.submit();
  }

  return (
    <form
      ref={formRef}
      action="/auth/signout"
      method="post"
      onSubmit={handleSubmit}
      className={className}
    >
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </form>
  );
}
