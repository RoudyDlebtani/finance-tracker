import { Card } from "@/components/ui/card";

/**
 * Route-level loading UI for the dashboard. Next.js shows this skeleton while
 * the page's Server Component awaits its data fetch.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-7 w-28 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-64 w-full animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
    </div>
  );
}
