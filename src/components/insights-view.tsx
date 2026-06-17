import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/finance";
import { Card, CardContent } from "@/components/ui/card";

const TONES: Record<
  Insight["tone"],
  { icon: typeof Lightbulb; color: string }
> = {
  positive: { icon: TrendingUp, color: "text-positive" },
  negative: { icon: TrendingDown, color: "text-negative" },
  warning: { icon: AlertTriangle, color: "text-negative" },
  neutral: { icon: Lightbulb, color: "text-muted-foreground" },
};

export function InsightsView({ insights }: { insights: Insight[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Smart takeaways from your money this month.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {insights.map((insight) => {
          const { icon: Icon, color } = TONES[insight.tone];
          return (
            <Card key={insight.id}>
              <CardContent className="flex gap-3 p-5">
                <span className={`mt-0.5 shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{insight.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {insight.detail}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
