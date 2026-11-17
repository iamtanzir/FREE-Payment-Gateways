import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface MetricCardProps {
  title: string;
  value: string | number;
  color?: string;
  sparklineData?: number[];
  className?: string;
}

export function MetricCard({ title, value, color = "hsl(217, 91%, 60%)", sparklineData, className }: MetricCardProps) {
  const chartData = (sparklineData || [0, 0, 0, 0, 0, 0, 0]).map((v, i) => ({ i, v }));

  return (
    <Card className={cn("shadow-card hover-lift overflow-hidden border-t-2 animate-fade-in", className)} style={{ borderTopColor: color }}>
      <CardContent className="p-5 pb-0">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
      </CardContent>
      <div className="h-10 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${title.replace(/\s/g, "")})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
