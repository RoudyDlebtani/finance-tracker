import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Global 404 page. */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <span className="flex items-center gap-2 text-lg font-bold">
        <Wallet className="h-6 w-6 text-primary" /> FinTrack
      </span>
      <div className="space-y-2">
        <p className="text-5xl font-bold tracking-tight">404</p>
        <p className="max-w-sm text-muted-foreground">
          We couldn&apos;t find the page you&apos;re looking for.
        </p>
      </div>
      <Link href="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
