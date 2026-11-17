import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  refunded: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

interface LatestPaymentsTableProps {
  payments: any[];
}

export function LatestPaymentsTable({ payments }: LatestPaymentsTableProps) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Latest Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold pb-3 pr-4">Customer</th>
                  <th className="text-left font-semibold pb-3 pr-4">Gateway</th>
                  <th className="text-left font-semibold pb-3 pr-4">Amount</th>
                  <th className="text-left font-semibold pb-3 pr-4">Transaction Id</th>
                  <th className="text-left font-semibold pb-3 pr-4">Date</th>
                  <th className="text-left font-semibold pb-3 pr-4">Status</th>
                  <th className="text-left font-semibold pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      {(tx.customers as any)?.email || (tx.customers as any)?.name || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {(tx.gateways as any)?.display_name || "—"}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {Number(tx.amount).toFixed(2)} {tx.currency || "USD"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">
                      {tx.reference || tx.id.slice(0, 10).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.created_at), "yyyy-MM-dd hh:mm a")}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className={statusColors[tx.status] || ""}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => navigate("/transactions")}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No payments yet</p>
        )}
      </CardContent>
    </Card>
  );
}
