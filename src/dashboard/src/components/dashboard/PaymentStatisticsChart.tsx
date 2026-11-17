import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export type FilterRange = "7d" | "30d" | "90d" | "all";

export const rangeLabels: Record<FilterRange, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  all: "All Time",
};

interface PaymentStatisticsChartProps {
  chartData: { name: string; allPayments: number; successful: number; pending: number; income: number }[];
  range: FilterRange;
  setRange: (r: FilterRange) => void;
}

export function PaymentStatisticsChart({ chartData, range, setRange }: PaymentStatisticsChartProps) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Payment Statistics</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(rangeLabels) as FilterRange[]).map((key) => (
              <DropdownMenuItem key={key} onClick={() => setRange(key)} className={range === key ? "font-semibold" : ""}>{rangeLabels[key]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={-45} textAnchor="end" height={50} />
            <YAxis yAxisId="left" fontSize={11} tickLine={false} axisLine={false} label={{ value: "Payments", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
            <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} label={{ value: "Income", angle: 90, position: "insideRight", style: { fontSize: 11 } }} />
            <Tooltip />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="allPayments" name="All payments" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="transparent" dot={false} />
            <Area yAxisId="left" type="monotone" dataKey="successful" name="Successful payments" stroke="hsl(160, 60%, 45%)" strokeWidth={2} fill="transparent" dot={false} />
            <Area yAxisId="left" type="monotone" dataKey="pending" name="Pending payments" stroke="hsl(45, 93%, 47%)" strokeWidth={2} fill="transparent" dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="income" name="Income" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="transparent" dot={false} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
