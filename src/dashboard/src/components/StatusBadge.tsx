import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "completed" | "pending" | "failed" | "refunded" | "active" | "inactive" | "expired" | "approved" | "rejected" | "draft" | "sent" | "paid" | "overdue" | "cancelled" | "matched" | "unmatched";

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20 hover:bg-success/15",
  active: "bg-success/10 text-success border-success/20 hover:bg-success/15",
  approved: "bg-success/10 text-success border-success/20 hover:bg-success/15",
  paid: "bg-success/10 text-success border-success/20 hover:bg-success/15",
  matched: "bg-success/10 text-success border-success/20 hover:bg-success/15",
  pending: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/15",
  draft: "bg-muted text-muted-foreground border-border hover:bg-muted",
  sent: "bg-info/10 text-info border-info/20 hover:bg-info/15",
  failed: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
  rejected: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
  overdue: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
  unmatched: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15",
  refunded: "bg-info/10 text-info border-info/20 hover:bg-info/15",
  inactive: "bg-muted text-muted-foreground border-border hover:bg-muted",
  expired: "bg-muted text-muted-foreground border-border hover:bg-muted",
  cancelled: "bg-muted text-muted-foreground border-border hover:bg-muted",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize text-xs", statusStyles[status] || statusStyles.pending, className)}
    >
      {status}
    </Badge>
  );
}