"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the dashboard. Catches errors thrown while
 * rendering a dashboard page (e.g. a failed Supabase fetch) and offers a retry.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging; replace with a real logger in production.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-negative/10">
        <AlertTriangle className="h-6 w-6 text-negative" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t load this page. This is usually temporary — try again.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
