import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { FilterRange, rangeLabels } from "./PaymentStatisticsChart";

interface GatewayPieChartProps {
  gatewayData: { name: string; value: number; color: string }[];
  gwRange: FilterRange;
  setGwRange: (r: FilterRange) => void;
}

export function GatewayPieChart({ gatewayData, gwRange, setGwRange }: GatewayPieChartProps) {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Payment Statistics by Gateway</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(rangeLabels) as FilterRange[]).map((key) => (
              <DropdownMenuItem key={key} onClick={() => setGwRange(key)} className={gwRange === key ? "font-semibold" : ""}>{rangeLabels[key]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        {gatewayData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={gatewayData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {gatewayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} payments`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {gatewayData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-sm">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[{ name: "No Data", value: 1 }]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                  <Cell fill="hsl(220, 13%, 91%)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <span>No Data</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
