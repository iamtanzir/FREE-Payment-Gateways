import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MetricCard } from "@/components/MetricCard";
import { Loader2, Search, ChevronLeft, ChevronRight, Eye, Webhook, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const MAX_ATTEMPTS = 5;

export default function Webhooks() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewLog, setViewLog] = useState<any>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["webhook-logs", orgId, activeBrandId],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_logs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(200);
      let result = data || [];
      if (activeBrandId) {
        result = result.filter((log: any) => {
          const payload = log.payload as any;
          return payload?.brand_id === activeBrandId || payload?.gateway?.brand_id === activeBrandId;
        });
      }
      return result;
    },
    enabled: !!orgId,
    refetchInterval: 15000,
  });

  const getStatus = (log: any): "completed" | "failed" | "pending" => {
    if (!log.response_status) return "pending";
    return log.response_status >= 200 && log.response_status < 300 ? "completed" : "failed";
  };

  const stats = useMemo(() => {
    const total = logs.length;
    const succeeded = logs.filter((l: any) => l.response_status >= 200 && l.response_status < 300).length;
    const failed = logs.filter((l: any) => l.response_status && l.response_status >= 400).length;
    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;
    return { total, succeeded, failed, successRate };
  }, [logs]);

  const filtered = useMemo(() => {
    if (!search) return logs;
    const s = search.toLowerCase();
    return logs.filter((l: any) => l.event_type.toLowerCase().includes(s) || l.url.toLowerCase().includes(s));
  }, [logs, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleRetry = async (log: any) => {
    setRetryingId(log.id);
    try {
      const { data, error } = await supabase.functions.invoke("webhook-delivery", {
        body: { url: log.url, payload: log.payload },
      });
      if (error) throw error;
      const success = data?.success;
      const newAttempt = (log.attempt || 0) + 1;
      await supabase
        .from("webhook_logs")
        .update({
          attempt: newAttempt,
          response_status: data?.status ?? null,
          response_body: data?.response_body ?? null,
          next_retry_at: success ? null : log.next_retry_at,
        })
        .eq("id", log.id);
      toast[success ? "success" : "error"](
        success ? `Delivery succeeded (HTTP ${data.status})` : `Retry failed (HTTP ${data?.status ?? "n/a"})`
      );
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["webhook-logs"] });
    } catch (err: any) {
      toast.error(err.message || "Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  const renderRetryBadge = (attempt: number) => {
    const exhausted = attempt >= MAX_ATTEMPTS;
    return (
      <Badge variant={exhausted ? "destructive" : attempt > 1 ? "secondary" : "outline"} className="font-mono text-xs">
        {attempt}/{MAX_ATTEMPTS}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Webhook Delivery Status</h1>
            <p className="text-muted-foreground text-sm">Monitor delivery attempts, retries, and responses</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard title="Total Deliveries" value={stats.total.toString()} />
          <MetricCard title="Succeeded" value={stats.succeeded.toString()} color="hsl(142, 71%, 45%)" />
          <MetricCard title="Failed" value={stats.failed.toString()} color="hsl(var(--destructive))" />
          <MetricCard title="Success Rate" value={`${stats.successRate}%`} color="hsl(var(--primary))" />
        </div>

        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by event or URL..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16">
                <Webhook className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No webhook logs yet.</p>
              </div>
            ) : isMobile ? (
              <div className="divide-y divide-border">
                {paginated.map((log: any) => (
                  <div key={log.id} className="p-4 space-y-2" onClick={() => setViewLog(log)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-xs truncate flex-1">{log.event_type}</p>
                      <StatusBadge status={getStatus(log)} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{log.url}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        Code: <span className="font-mono">{log.response_status || "—"}</span> · Retry: {renderRetryBadge(log.attempt || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last: {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                      {log.next_retry_at && <span className="text-primary">Next: {formatDistanceToNow(new Date(log.next_retry_at), { addSuffix: true })}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground p-4">Event</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Endpoint</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Status</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Code</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Retries</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Last Attempt</th>
                    <th className="text-left font-medium text-muted-foreground p-4">Next Retry</th>
                    <th className="text-right font-medium text-muted-foreground p-4">Actions</th>
                  </tr></thead>
                  <tbody>
                    {paginated.map((log: any) => (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 font-mono text-xs">{log.event_type}</td>
                        <td className="p-4 text-muted-foreground text-xs max-w-[200px] truncate">{log.url}</td>
                        <td className="p-4"><StatusBadge status={getStatus(log)} /></td>
                        <td className="p-4 font-mono text-xs">{log.response_status || "—"}</td>
                        <td className="p-4">{renderRetryBadge(log.attempt || 0)}</td>
                        <td className="p-4 text-muted-foreground text-xs whitespace-nowrap" title={format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </td>
                        <td className="p-4 text-xs whitespace-nowrap">
                          {log.next_retry_at ? (
                            <span className="text-primary">{formatDistanceToNow(new Date(log.next_retry_at), { addSuffix: true })}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" disabled={retryingId === log.id} onClick={(e) => { e.stopPropagation(); handleRetry(log); }} title="Retry now">
                              {retryingId === log.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setViewLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <p className="text-sm text-muted-foreground">{filtered.length} results</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  {!isMobile && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <Button key={p} variant={currentPage === p ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!viewLog} onOpenChange={() => setViewLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Delivery Details</DialogTitle></DialogHeader>
            {viewLog && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Event:</span> <strong className="font-mono">{viewLog.event_type}</strong></div>
                  <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={getStatus(viewLog)} /></div>
                  <div><span className="text-muted-foreground">HTTP Code:</span> <span className="font-mono">{viewLog.response_status || "—"}</span></div>
                  <div><span className="text-muted-foreground">Retry Count:</span> {renderRetryBadge(viewLog.attempt || 0)}</div>
                  <div>
                    <span className="text-muted-foreground">Last Attempt:</span>{" "}
                    <span className="text-xs">{format(new Date(viewLog.created_at), "yyyy-MM-dd HH:mm:ss")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Retry:</span>{" "}
                    {viewLog.next_retry_at ? (
                      <span className="text-xs text-primary">{format(new Date(viewLog.next_retry_at), "yyyy-MM-dd HH:mm:ss")}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">None scheduled</span>
                    )}
                  </div>
                  <div className="col-span-2"><span className="text-muted-foreground">Endpoint:</span> <code className="text-xs break-all">{viewLog.url}</code></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Payload:</span>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48">{JSON.stringify(viewLog.payload, null, 2)}</pre>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Body:</span>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48 whitespace-pre-wrap break-all">
                    {viewLog.response_body || <span className="text-muted-foreground italic">No response body recorded</span>}
                  </pre>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewLog(null)}>Close</Button>
                  <Button onClick={() => handleRetry(viewLog)} disabled={retryingId === viewLog.id}>
                    {retryingId === viewLog.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Retry Now
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}